// commands/settings/autoread.js
import { supabase } from '../../lib/supabase.js'

export const name = 'autoread'
export const alias = ['autoread', 'ar', 'setar', 'read']
export const category = 'Settings'
export const desc = 'Full autoread control: on/off, scope, whitelist, blacklist, stats - realtime'

export default async function autoread(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
  try {
    // 1. ADMIN/OWNER CHECK - Owner allowed in private
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
    const target = args[1]

    // 3. GET CURRENT CONFIG
    const { data: config } = await supabase
    .from('autoread_config')
    .select('*')
    .eq('id', 'config')
    .maybeSingle()

    const isEnabled = config?.is_enabled?? true
    const scope = config?.autoread_scope || 'all'
    const delayMin = config?.delay_min_ms || 1000
    const delayMax = config?.delay_max_ms || 3000
    const markChatRead = config?.mark_chat_read?? true

    // 4. HELP + STATS IF NO ARGS
    if (!action) {
      const { count: totalReads } = await supabase
      .from('autoread_logs')
      .select('*', { count: 'exact', head: true })

      const { count: todayReads } = await supabase
      .from('autoread_logs')
      .select('*', { count: 'exact', head: true })
      .gte('read_at', new Date(Date.now() - 24 * 3600000).toISOString())

      const { count: whitelistCount } = await supabase
      .from('autoread_whitelist')
      .select('*', { count: 'exact', head: true })

      const { count: blacklistCount } = await supabase
      .from('autoread_blacklist')
      .select('*', { count: 'exact', head: true })

      await sock.sendMessage(from, { react: { text: '👁️', key: msg.key } })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 👁️ *AutoRead Control* ⌋
│ Status: ${isEnabled? 'ON ✅' : 'OFF ❌'}
│ Scope: ${scope.toUpperCase()}
│ Delay: ${delayMin}-${delayMax}ms
│ Mark Chat: ${markChatRead? 'YES ✅' : 'NO ❌'}
│ Today: ${todayReads || 0} reads
│ Total: ${totalReads || 0} reads
│ Whitelist: ${whitelistCount || 0}
│ Blacklist: ${blacklistCount || 0}
│
│ *Usage:*
│ ${botSettings.prefix}autoread on
│ ${botSettings.prefix}autoread off
│ ${botSettings.prefix}autoread scope all
│ ${botSettings.prefix}autoread scope groups
│ ${botSettings.prefix}autoread scope dm
│ ${botSettings.prefix}autoread delay 2000 5000
│ ${botSettings.prefix}autoread stats
│ ${botSettings.prefix}autoread logs
│ ${botSettings.prefix}autoread whitelist 255xxx
│ ${botSettings.prefix}autoread blacklist 255xxx
│ ${botSettings.prefix}autoread remove 255xxx
│ ${botSettings.prefix}autoread markchat on
│ ${botSettings.prefix}autoread markchat off
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. STATS
    if (action === 'stats') {
      const { data: topChats } = await supabase
      .from('autoread_stats')
      .select('chat_name, total_read, last_read_at')
      .order('total_read', { ascending: false })
      .limit(10)

      const { data: recentLogs } = await supabase
      .from('autoread_logs')
      .select('sender_name, message_type, is_group, read_at')
      .order('read_at', { ascending: false })
      .limit(5)

      let statsText = `╭─⌈ 📊 *AutoRead Stats* ⌋\n`
      statsText += `│ Status: ${isEnabled? 'ON' : 'OFF'}\n`
      statsText += `│ Scope: ${scope.toUpperCase()}\n`
      statsText += `│ Delay: ${delayMin}-${delayMax}ms\n`

      if (topChats?.length > 0) {
        statsText += `│\n│ *Top Read:*\n`
        topChats.forEach((c, i) => {
          statsText += `│ ${i + 1}. ${c.chat_name}: ${c.total_read}x\n`
        })
      }

      if (recentLogs?.length > 0) {
        statsText += `│\n│ *Recent:*\n`
        recentLogs.forEach(l => {
          const time = new Date(l.read_at).toLocaleTimeString()
          const type = l.is_group? 'Group' : 'DM'
          statsText += `│ • ${l.sender_name} [${type}] ${time}\n`
        })
      }
      statsText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: statsText }, { quoted: msg })
    }

    // 6. LOGS
    if (action === 'logs') {
      const { data: logs, count } = await supabase
      .from('autoread_logs')
      .select('sender_name, message_type, is_group, read_at', { count: 'exact' })
      .order('read_at', { ascending: false })
      .limit(10)

      if (!logs || logs.length === 0) {
        return await sock.sendMessage(from, { text: `> No logs found.` }, { quoted: msg })
      }

      let logText = `╭─⌈ 📝 *AutoRead Logs* ⌋\n`
      logText += `│ Total 24h: ${count || 0}\n│\n`
      logs.forEach((l, i) => {
        const time = new Date(l.read_at).toLocaleString()
        const type = l.is_group? 'Group' : 'DM'
        logText += `│ ${i + 1}. ${l.sender_name} [${type}]\n│ ${time}\n`
      })
      logText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: logText }, { quoted: msg })
    }

    // 7. SCOPE CONTROL
    if (action === 'scope') {
      const validScopes = ['all', 'groups', 'dm']
      if (!validScopes.includes(target)) {
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}autoread scope all/groups/dm` }, { quoted: msg })
      }

      await supabase
      .from('autoread_config')
      .update({ autoread_scope: target, updated_at: new Date().toISOString() })
      .eq('id', 'config')

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Scope Updated* ⌋
│ New Scope: ${target.toUpperCase()}
│ Old Scope: ${scope.toUpperCase()}
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 8. DELAY CONTROL
    if (action === 'delay') {
      const min = parseInt(args[1])
      const max = parseInt(args[2])

      if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}autoread delay 2000 5000` }, { quoted: msg })
      }

      await supabase
      .from('autoread_config')
      .update({ delay_min_ms: min, delay_max_ms: max, updated_at: new Date().toISOString() })
      .eq('id', 'config')

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⏱️ *Delay Updated* ⌋
│ New: ${min}-${max}ms
│ Old: ${delayMin}-${delayMax}ms
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 9. MARK CHAT READ TOGGLE
    if (action === 'markchat') {
      const validOptions = ['on', 'off', '1', '0']
      if (!validOptions.includes(target)) {
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}autoread markchat on/off` }, { quoted: msg })
      }

      const newValue = ['on', '1'].includes(target)? true : false

      await supabase
      .from('autoread_config')
      .update({ mark_chat_read: newValue, updated_at: new Date().toISOString() })
      .eq('id', 'config')

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Mark Chat Updated* ⌋
│ Status: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Effect: ${newValue? 'Marks whole chat read' : 'Marks message only'}
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 10. WHITELIST ADD
    if (action === 'whitelist' || action === 'wl') {
      if (!target) {
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}autoread whitelist 255xxx` }, { quoted: msg })
      }

      const chatJid = target.includes('@')? target : `${target}@s.whatsapp.net`

      // Remove from blacklist first
      await supabase.from('autoread_blacklist').delete().eq('chat_jid', chatJid)

      const { error } = await supabase
      .from('autoread_whitelist')
      .upsert({
          chat_jid: chatJid,
          chat_name: target,
          added_by: sender
        }, { onConflict: 'chat_jid' })

      if (error) {
        return await sock.sendMessage(from, { text: `> Database error.` }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Whitelisted* ⌋
│ Chat: ${target}
│ Status: Always read
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 11. BLACKLIST ADD
    if (action === 'blacklist' || action === 'bl') {
      if (!target) {
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}autoread blacklist 255xxx` }, { quoted: msg })
      }

      const chatJid = target.includes('@')? target : `${target}@s.whatsapp.net`

      // Remove from whitelist first
      await supabase.from('autoread_whitelist').delete().eq('chat_jid', chatJid)

      const { error } = await supabase
      .from('autoread_blacklist')
      .upsert({
          chat_jid: chatJid,
          chat_name: target,
          reason: 'Manual block',
          blocked_by: sender
        }, { onConflict: 'chat_jid' })

      if (error) {
        return await sock.sendMessage(from, { text: `> Database error.` }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🚫 *Blacklisted* ⌋
│ Chat: ${target}
│ Status: Never read
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 12. REMOVE FROM LISTS
    if (action === 'remove' || action === 'rm') {
      if (!target) {
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}autoread remove 255xxx` }, { quoted: msg })
      }

      const chatJid = target.includes('@')? target : `${target}@s.whatsapp.net`

      await supabase.from('autoread_whitelist').delete().eq('chat_jid', chatJid)
      await supabase.from('autoread_blacklist').delete().eq('chat_jid', chatJid)

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Removed* ⌋
│ Chat: ${target}
│ Status: Default rules
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 13. ON/OFF
    const validOptions = ['on', 'off', 'enable', 'disable', '1', '0']
    if (!validOptions.includes(action)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Invalid. Use: on/off, scope, delay, stats, logs, whitelist, blacklist` }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)? true : false

    if (newValue === isEnabled) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AutoRead already ${action}` }, { quoted: msg })
    }

    // 14. UPDATE SUPABASE
    const { error } = await supabase
    .from('autoread_config')
    .upsert({
        id: 'config',
        is_enabled: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
    }

    // 15. SUCCESS
    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })

    const successPayload =
`╭─⌈ 👁️ *Settings Updated* ⌋
│ AutoRead: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Old Status: ${isEnabled? 'ON' : 'OFF'}
│ Scope: ${scope.toUpperCase()}
│ Delay: ${delayMin}-${delayMax}ms
│ Status: Applied instantly
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[AUTOREAD ERROR]`, commandException.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}