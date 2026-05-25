// commands/settings/autolikestatus.js
import { supabase } from '../../lib/supabase.js'

export const name = 'autolikestatus'
export const alias = ['autolike', 'als', 'setals']
export const category = 'Settings'
export const desc = 'Full autolike status control: on/off, whitelist, blacklist, stats - realtime'

export default async function autolikestatus(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
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
     .from('autolike_config')
     .select('is_enabled, priority_emoji_chance')
     .eq('id', 'config')
     .maybeSingle()

    const isEnabled = config?.is_enabled?? true
    const priorityChance = config?.priority_emoji_chance?? 0.4

    // 4. HELP + STATS IF NO ARGS
    if (!action) {
      const { count: totalLikes } = await supabase
       .from('autolike_logs')
       .select('*', { count: 'exact', head: true })

      const { count: todayLikes } = await supabase
       .from('autolike_logs')
       .select('*', { count: 'exact', head: true })
       .gte('liked_at', new Date(Date.now() - 24 * 3600000).toISOString())

      const { count: whitelistCount } = await supabase
       .from('autolike_whitelist')
       .select('*', { count: 'exact', head: true })

      const { count: blacklistCount } = await supabase
       .from('autolike_blacklist')
       .select('*', { count: 'exact', head: true })

      await sock.sendMessage(from, { react: { text: '💜', key: msg.key } })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 💜 *AutoLike Status* ⌋
│ Status: ${isEnabled? 'ON ✅' : 'OFF ❌'}
│ Priority 💜: ${Math.round(priorityChance * 100)}%
│ Today: ${todayLikes || 0} likes
│ Total: ${totalLikes || 0} likes
│ Whitelist: ${whitelistCount || 0}
│ Blacklist: ${blacklistCount || 0}
│
│ *Usage:*
│ ${botSettings.prefix}autolikestatus on
│ ${botSettings.prefix}autolikestatus off
│ ${botSettings.prefix}autolikestatus stats
│ ${botSettings.prefix}autolikestatus logs
│ ${botSettings.prefix}autolikestatus whitelist 255xxx
│ ${botSettings.prefix}autolikestatus blacklist 255xxx
│ ${botSettings.prefix}autolikestatus remove 255xxx
│ ${botSettings.prefix}autolikestatus priority 70
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. STATS
    if (action === 'stats') {
      const { data: topUsers } = await supabase
       .from('autolike_stats')
       .select('user_name, total_likes, last_liked_at')
       .order('total_likes', { ascending: false })
       .limit(10)

      const { data: recentLogs } = await supabase
       .from('autolike_logs')
       .select('owner_name, emoji_used, liked_at')
       .order('liked_at', { ascending: false })
       .limit(5)

      let statsText = `╭─⌈ 📊 *AutoLike Stats* ⌋\n`
      statsText += `│ Status: ${isEnabled? 'ON' : 'OFF'}\n`
      statsText += `│ Priority: ${Math.round(priorityChance * 100)}%\n`

      if (topUsers?.length > 0) {
        statsText += `│\n│ *Top Liked:*\n`
        topUsers.forEach((u, i) => {
          statsText += `│ ${i + 1}. ${u.user_name}: ${u.total_likes}x\n`
        })
      }

      if (recentLogs?.length > 0) {
        statsText += `│\n│ *Recent:*\n`
        recentLogs.forEach(l => {
          const time = new Date(l.liked_at).toLocaleTimeString()
          statsText += `│ • ${l.owner_name} ${l.emoji_used} ${time}\n`
        })
      }
      statsText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: statsText }, { quoted: msg })
    }

    // 6. LOGS
    if (action === 'logs') {
      const { data: logs, count } = await supabase
       .from('autolike_logs')
       .select('owner_name, emoji_used, liked_at', { count: 'exact' })
       .order('liked_at', { ascending: false })
       .limit(10)

      if (!logs || logs.length === 0) {
        return await sock.sendMessage(from, { text: `> No logs found.` }, { quoted: msg })
      }

      let logText = `╭─⌈ 📝 *AutoLike Logs* ⌋\n`
      logText += `│ Total 24h: ${count || 0}\n│\n`
      logs.forEach((l, i) => {
        const time = new Date(l.liked_at).toLocaleString()
        logText += `│ ${i + 1}. ${l.owner_name} ${l.emoji_used}\n│ ${time}\n`
      })
      logText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: logText }, { quoted: msg })
    }

    // 7. WHITELIST ADD
    if (action === 'whitelist' || action === 'wl') {
      if (!target) {
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}autolikestatus whitelist 255xxx` }, { quoted: msg })
      }

      const userJid = target.includes('@')? target : `${target}@s.whatsapp.net`

      // Remove from blacklist first
      await supabase.from('autolike_blacklist').delete().eq('user_jid', userJid)

      const { error } = await supabase
       .from('autolike_whitelist')
       .upsert({
          user_jid: userJid,
          user_name: target,
          added_by: sender
        }, { onConflict: 'user_jid' })

      if (error) {
        return await sock.sendMessage(from, { text: `> Database error.` }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Whitelisted* ⌋
│ User: @${userJid.split('@')[0]}
│ Status: Always like
╰⊷ *Powered By Bunny Tech*`,
        mentions: [userJid]
      }, { quoted: msg })
    }

    // 8. BLACKLIST ADD
    if (action === 'blacklist' || action === 'bl') {
      if (!target) {
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}autolikestatus blacklist 255xxx` }, { quoted: msg })
      }

      const userJid = target.includes('@')? target : `${target}@s.whatsapp.net`

      // Remove from whitelist first
      await supabase.from('autolike_whitelist').delete().eq('user_jid', userJid)

      const { error } = await supabase
       .from('autolike_blacklist')
       .upsert({
          user_jid: userJid,
          user_name: target,
          reason: 'Manual block',
          blocked_by: sender
        }, { onConflict: 'user_jid' })

      if (error) {
        return await sock.sendMessage(from, { text: `> Database error.` }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🚫 *Blacklisted* ⌋
│ User: @${userJid.split('@')[0]}
│ Status: Never like
╰⊷ *Powered By Bunny Tech*`,
        mentions: [userJid]
      }, { quoted: msg })
    }

    // 9. REMOVE FROM LISTS
    if (action === 'remove' || action === 'rm') {
      if (!target) {
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}autolikestatus remove 255xxx` }, { quoted: msg })
      }

      const userJid = target.includes('@')? target : `${target}@s.whatsapp.net`

      await supabase.from('autolike_whitelist').delete().eq('user_jid', userJid)
      await supabase.from('autolike_blacklist').delete().eq('user_jid', userJid)

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Removed* ⌋
│ User: @${userJid.split('@')[0]}
│ Status: Default rules
╰⊷ *Powered By Bunny Tech*`,
        mentions: [userJid]
      }, { quoted: msg })
    }

    // 10. SET PRIORITY CHANCE
    if (action === 'priority') {
      const percent = parseInt(target)
      if (isNaN(percent) || percent < 0 || percent > 100) {
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}autolikestatus priority 70` }, { quoted: msg })
      }

      const newChance = percent / 100
      await supabase
       .from('autolike_config')
       .update({ priority_emoji_chance: newChance, updated_at: new Date().toISOString() })
       .eq('id', 'config')

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💜 *Priority Updated* ⌋
│ Purple 💜: ${percent}%
│ Old: ${Math.round(priorityChance * 100)}%
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 11. ON/OFF
    const validOptions = ['on', 'off', 'enable', 'disable', '1', '0']
    if (!validOptions.includes(action)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Invalid. Use: on/off, stats, logs, whitelist, blacklist` }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)? true : false

    if (newValue === isEnabled) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> AutoLike already ${action}` }, { quoted: msg })
    }

    // 12. UPDATE SUPABASE
    const { error } = await supabase
     .from('autolike_config')
     .upsert({
        id: 'config',
        is_enabled: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
    }

    // 13. SUCCESS
    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })

    const successPayload =
`╭─⌈ 💜 *Settings Updated* ⌋
│ AutoLike: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Old Status: ${isEnabled? 'ON' : 'OFF'}
│ Priority 💜: ${Math.round(priorityChance * 100)}%
│ Status: Applied instantly
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[AUTOLIKE ERROR]`, commandException.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}