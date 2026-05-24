// commands/settings/antidelete.js
import { supabase } from '../../lib/supabase.js'

export const name = 'antidelete'
export const alias = ['adel', 'antidel', 'setantidelete']
export const category = 'Settings'
export const desc = 'Full antidelete control: on/off, global/group, stats, clear - realtime'

export default async function antidelete(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
  try {
    // 1. ADMIN CHECK - Private pia kama ni owner
    const isOwner = sender === botSettings.owner_jid
    if (!isOwner && (!isGroup ||!isAdmin)) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: '> Admin only command.'
      }, { quoted: msg })
    }

    // 2. Parse args
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()
    const mode = args[1]?.toLowerCase() // global or group

    // 3. Get current settings
    const { data: globalSettings } = await supabase
  .from('group_settings')
  .select('antidelete')
  .eq('group_jid', 'global')
  .maybeSingle()

    const { data: groupSettings } = isGroup? await supabase
  .from('group_settings')
  .select('antidelete')
  .eq('group_jid', from)
  .maybeSingle() : { data: null }

    const globalStatus = globalSettings?.antidelete || false
    const groupStatus = groupSettings?.antidelete || false

    // 4. SHOW HELP + STATS IF NO ARGS
    if (!action) {
      const { count: totalRecovered } = await supabase
    .from('deleted_messages')
    .select('*', { count: 'exact', head: true })

      const { count: groupRecovered } = isGroup? await supabase
    .from('deleted_messages')
    .select('*', { count: 'exact', head: true })
    .eq('group_jid', from) : { count: 0 }

      await sock.sendMessage(from, {
        react: { text: '🗑️', key: msg.key }
      })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 🗑️ *AntiDelete Control* ⌋
│ Global Status: ${globalStatus? 'ON ✅' : 'OFF ❌'}
│ Group Status: ${groupStatus? 'ON ✅' : 'OFF ❌'}
│ Total Recovered: ${totalRecovered || 0}
│ Group Recovered: ${groupRecovered || 0}
│
│ *Usage:*
│ ${botSettings.prefix}antidelete on global
│ ${botSettings.prefix}antidelete off group
│ ${botSettings.prefix}antidelete stats
│ ${botSettings.prefix}antidelete clear
│ ${botSettings.prefix}antidelete list
│
│ *Note:* Global = all chats
│ Group = this group only
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. HANDLE STATS
    if (action === 'stats' || action === 'count') {
      const { data: recentDeleted, count } = await supabase
    .from('deleted_messages')
    .select('sender_name, message_type, content, deleted_at', { count: 'exact' })
    .order('deleted_at', { ascending: false })
    .limit(5)

      let statsText = `╭─⌈ 📊 *AntiDelete Stats* ⌋\n`
      statsText += `│ Total Recovered: ${count || 0}\n`
      statsText += `│ Global: ${globalStatus? 'ON' : 'OFF'}\n`
      statsText += `│ Group: ${groupStatus? 'ON' : 'OFF'}\n`

      if (recentDeleted && recentDeleted.length > 0) {
        statsText += `│\n│ *Recent Deletes:*\n`
        recentDeleted.forEach(d => {
          const time = new Date(d.deleted_at).toLocaleTimeString()
          const preview = d.content? d.content.slice(0, 20) : d.message_type
          statsText += `│ • ${d.sender_name}: ${preview} - ${time}\n`
        })
      }

      statsText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: statsText }, { quoted: msg })
    }

    // 6. HANDLE CLEAR - FUTA ZOTE SUPABASE
    if (action === 'clear' || action === 'reset') {
      const targetJid = mode === 'group' && isGroup? from : null

      let query = supabase.from('deleted_messages').delete()
      if (targetJid) {
        query = query.eq('group_jid', targetJid)
      }

      const { error } = await query

      if (error) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: '> Failed to clear deleted messages. Database error.'
        }, { quoted: msg })
      }

      await sock.sendMessage(from, {
        react: { text: '✅', key: msg.key }
      })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 🗑️ *Database Cleared* ⌋
│ Scope: ${targetJid? 'This Group' : 'All Messages'}
│ Status: All deleted messages removed
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 7. HANDLE LIST - ONYESHA ZA KARIBUNI
    if (action === 'list' || action === 'recent') {
      const targetJid = mode === 'group' && isGroup? from : null

      let query = supabase
    .from('deleted_messages')
    .select('sender_name, message_type, content, deleted_by, deleted_at')
    .order('deleted_at', { ascending: false })
    .limit(10)

      if (targetJid) {
        query = query.eq('group_jid', targetJid)
      }

      const { data: recent } = await query

      if (!recent || recent.length === 0) {
        return await sock.sendMessage(from, {
          text: `> No deleted messages found ${targetJid? 'in this group' : 'globally'}.`
        }, { quoted: msg })
      }

      let listText = `╭─⌈ 📝 *Recent Deletes* ⌋\n`
      recent.forEach((d, i) => {
        const time = new Date(d.deleted_at).toLocaleTimeString()
        const preview = d.content? d.content.slice(0, 25) : d.message_type
        listText += `│ ${i + 1}. ${d.sender_name}: ${preview} - ${time}\n`
      })
      listText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: listText }, { quoted: msg })
    }

    // 8. VALIDATE ON/OFF
    const validOptions = ['on', 'off', 'enable', 'disable', '1', '0']
    if (!validOptions.includes(action)) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Invalid option "${action}". Use: on/off, stats, clear, list\n> Example: ${botSettings.prefix}antidelete on global`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)? true : false
    const targetJid = mode === 'group' && isGroup? from : 'global'
    const currentValue = targetJid === 'global'? globalStatus : groupStatus

    // 9. CHECK IF ALREADY SAME
    if (newValue === currentValue) {
      await sock.sendMessage(from, {
        react: { text: '⚠️', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Antidelete ${targetJid === 'global'? 'Global' : 'Group'} is already ${action}`
      }, { quoted: msg })
    }

    // 10. UPDATE SUPABASE
    const { error } = await supabase
  .from('group_settings')
  .upsert({
        group_jid: targetJid,
        antidelete: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'group_jid' })

    if (error) {
      console.error('Supabase update error:', error.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: '> Failed to update antidelete. Database error.'
      }, { quoted: msg })
    }

    // 11. React + Success message
    await sock.sendMessage(from, {
      react: { text: newValue? '✅' : '❌', key: msg.key }
    })

    const successPayload =
`╭─⌈ 🗑️ *Settings Updated* ⌋
│ Mode: ${targetJid === 'global'? 'Global 🌍' : 'Group Only'}
│ Antidelete: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Old Status: ${currentValue? 'ON' : 'OFF'}
│ Status: Applied instantly
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[ANTIDELETE ERROR]`, commandException.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, {
      text: '> Failed to update antidelete. Check database connection.'
    }, { quoted: msg })
  }
}