// commands/settings/anticall.js
import { supabase } from '../../lib/supabase.js'

export const name = 'anticall'
export const alias = ['antic', 'nocall', 'setanticall']
export const category = 'Settings'
export const desc = 'Full anticall control: on/off, global/group, stats, unblock - realtime'

export default async function anticall(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
  try {
    // 1. ADMIN/OWNER CHECK - Owner anaruhusiwa private
    const isOwner = sender === botSettings.owner_jid
    if (!isOwner && (!isGroup ||!isAdmin)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: '> Admin only command.'
      }, { quoted: msg })
    }

    // 2. PARSE ARGS
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()
    const mode = args[1]?.toLowerCase()

    // 3. GET CURRENT SETTINGS
    const { data: globalSettings } = await supabase
.from('group_settings')
.select('anticall')
.eq('group_jid', 'global')
.maybeSingle()

    const { data: groupSettings } = isGroup? await supabase
.from('group_settings')
.select('anticall')
.eq('group_jid', from)
.maybeSingle() : { data: null }

    const globalStatus = globalSettings?.anticall || false
    const groupStatus = groupSettings?.anticall || false

    // 4. HELP + STATS IF NO ARGS
    if (!action) {
      const { count: totalCalls } = await supabase
 .from('call_logs')
 .select('*', { count: 'exact', head: true })

      const { count: groupCalls } = isGroup? await supabase
 .from('call_logs')
 .select('*', { count: 'exact', head: true })
 .eq('group_jid', from) : { count: 0 }

      await sock.sendMessage(from, { react: { text: '📵', key: msg.key } })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 📵 *AntiCall Control* ⌋
│ Global: ${globalStatus? 'ON ✅' : 'OFF ❌'}
│ Group: ${groupStatus? 'ON ✅' : 'OFF ❌'}
│ Total Blocked: ${totalCalls || 0}
│ Group Blocked: ${groupCalls || 0}
│ Auto Block: 3 attempts
│
│ *Usage:*
│ ${botSettings.prefix}anticall on global
│ ${botSettings.prefix}anticall off group
│ ${botSettings.prefix}anticall stats
│ ${botSettings.prefix}anticall list
│ ${botSettings.prefix}anticall unblock 255xxx
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. STATS
    if (action === 'stats') {
      const { data: recentCalls, count } = await supabase
 .from('call_logs')
 .select('caller_name, call_type, status, called_at', { count: 'exact' })
 .order('called_at', { ascending: false })
 .limit(5)

      let statsText = `╭─⌈ 📊 *AntiCall Stats* ⌋\n`
      statsText += `│ Total: ${count || 0}\n`
      statsText += `│ Global: ${globalStatus? 'ON' : 'OFF'}\n`
      statsText += `│ Group: ${groupStatus? 'ON' : 'OFF'}\n`

      if (recentCalls?.length > 0) {
        statsText += `│\n│ *Recent:*\n`
        recentCalls.forEach(c => {
          const time = new Date(c.called_at).toLocaleTimeString()
          statsText += `│ • ${c.caller_name}: ${c.call_type} - ${time}\n`
        })
      }
      statsText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: statsText }, { quoted: msg })
    }

    // 6. LIST WARNINGS
    if (action === 'list') {
      const { data: warnings } = await supabase
 .from('user_warnings')
 .select('user_jid, count')
 .eq('warning_type', 'call')
 .gte('count', 1)
 .order('count', { ascending: false })
 .limit(10)

      if (!warnings || warnings.length === 0) {
        return await sock.sendMessage(from, { text: `> No call warnings found.` }, { quoted: msg })
      }

      let listText = `╭─⌈ ⚠️ *Call Warnings* ⌋\n`
      warnings.forEach((w, i) => {
        const user = w.user_jid.split('@')[0]
        const status = w.count >= 3? 'BLOCKED' : `${w.count}/3`
        listText += `│ ${i + 1}. ${user}: ${status}\n`
      })
      listText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: listText }, { quoted: msg })
    }

    // 7. UNBLOCK
    if (action === 'unblock') {
      const targetUser = mode || args[1]
      if (!targetUser) {
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}anticall unblock 255xxx` }, { quoted: msg })
      }

      const userJid = targetUser.includes('@')? targetUser : `${targetUser}@s.whatsapp.net`

      try {
        await sock.updateBlockStatus(userJid, 'unblock')
        await supabase.from('user_warnings').delete().eq('user_jid', userJid).eq('warning_type', 'call')

        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
        return await sock.sendMessage(from, {
          text: `╭─⌈ ✅ *User Unblocked* ⌋
│ User: @${userJid.split('@')[0]}
│ Status: Unblocked
╰⊷ *Powered By Bunny Tech*`,
          mentions: [userJid]
        }, { quoted: msg })
      } catch (err) {
        return await sock.sendMessage(from, { text: `> Failed: ${err.message}` }, { quoted: msg })
      }
    }

    // 8. ON/OFF VALIDATION
    const validOptions = ['on', 'off', 'enable', 'disable', '1', '0']
    if (!validOptions.includes(action)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Invalid. Use: on/off, stats, list, unblock` }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)? true : false
    const targetJid = mode === 'group' && isGroup? from : 'global'
    const currentValue = targetJid === 'global'? globalStatus : groupStatus

    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Anticall ${targetJid === 'global'? 'Global' : 'Group'} already ${action}` }, { quoted: msg })
    }

    // 9. UPDATE SUPABASE
    const { error } = await supabase
.from('group_settings')
.upsert({
        group_jid: targetJid,
        anticall: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'group_jid' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
    }

    // 10. SUCCESS
    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })

    const successPayload =
`╭─⌈ 📵 *Settings Updated* ⌋
│ Mode: ${targetJid === 'global'? 'Global 🌍' : 'Group Only'}
│ Anticall: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Old Status: ${currentValue? 'ON' : 'OFF'}
│ Auto Block: 3 attempts
│ Status: Applied instantly
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[ANTICALL ERROR]`, commandException.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}