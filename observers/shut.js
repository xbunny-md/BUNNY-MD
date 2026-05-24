// observers/shut.js
import { supabase } from '../lib/supabase.js'

const banCache = new Map() // RAM cache: `${group}_${user}` -> banData
const CACHE_TTL = 60000 // 1 minute cache

export default async function shut(sock, { msg, from, sender, isGroup, isBotAdmin, isAdmin }, botSettings) {
  try {
    if (!msg || msg.key.fromMe) return
    if (!isGroup) return // Shut inafanya kazi groups tu

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ')
    const command = args[0]?.toLowerCase()
    const prefix = botSettings.prefix

    // 1. HANDLE COMMANDS -.shut on/temp/perm/off/list
    if (command === `${prefix}shut`) {
      if (!isAdmin) return await sock.sendMessage(from, { text: '> Admin only command' }, { quoted: msg })

      const action = args[1]?.toLowerCase()
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant

      // Get target user - from reply or mention
      let targetUser = quotedParticipant || mentionedJid[0]
      if (!targetUser && args[2]) {
        targetUser = args[2].replace('@', '') + '@s.whatsapp.net'
      }

      // SHUT ON / TEMP / PERM
      if (['on', 'temp', 'perm', 'kick'].includes(action)) {
        if (!targetUser) return await sock.sendMessage(from, { text: '> Reply message ya mtu au mention @mtu' }, { quoted: msg })

        let type = 'temp'
        let duration = 300 // 5 min default
        let reason = 'No reason'

        if (action === 'perm') {
          type = 'perm'
          duration = null
          reason = args.slice(2).join(' ') || 'Permanent ban'
        } else if (action === 'kick') {
          type = 'kick_temp'
          duration = parseInt(args[2]) * 60 || 1800 // default 30min
          reason = args.slice(3).join(' ') || 'Timeout'
        } else if (action === 'temp') {
          type = 'temp'
          duration = parseInt(args[2]) * 60 || 300 // default 5min
          reason = args.slice(3).join(' ') || 'Temporary ban'
        } else if (action === 'on') {
          type = 'temp'
          duration = 300 // 5min
          reason = args.slice(2).join(' ') || 'Temporary ban'
        }

        const expiresAt = duration? new Date(Date.now() + duration * 1000).toISOString() : null

        // Save to Supabase
        const { error } = await supabase
         .from('shut_list')
         .upsert({
            group_jid: from,
            user_jid: targetUser,
            type: type,
            duration: duration,
            expires_at: expiresAt,
            reason: reason,
            banned_by: sender,
            is_active: true
          }, { onConflict: 'group_jid,user_jid' })

        if (error) {
          console.log('[SHUT DB ERROR]', error.message)
          return await sock.sendMessage(from, { text: '> DB error. Jaribu tena.' }, { quoted: msg })
        }

        // Update cache
        banCache.set(`${from}_${targetUser}`, {
          type,
          expires_at: expiresAt,
          reason
        })

        // Kick if kick_temp
        if (type === 'kick_temp') {
          if (!isBotAdmin) return await sock.sendMessage(from, { text: '> Bot si admin, siwezi kick' }, { quoted: msg })
          await sock.groupParticipantsUpdate(from,, 'remove')
        }

        // Log
        await supabase.from('shut_logs').insert({
          group_jid: from,
          user_jid: targetUser,
          action: type === 'kick_temp'? 'kicked' : 'banned',
          type: type,
          admin_jid: sender,
          reason: reason,
          duration: duration
        })

        await sock.sendMessage(from, { react: { text: '🔒', key: msg.key } })

        const timeText = type === 'perm'? 'milele' :
                        type === 'kick_temp'? `kwa dakika ${duration / 60}` :
                        `kwa dakika ${duration / 60}`

        return await sock.sendMessage(from, {
          text: `╭─⌈ 🔒 *Shut Activated* ⌋
│ User: @${targetUser.split('@')[0]}
│ Type: ${type === 'kick_temp'? 'Kick Timeout' : type === 'perm'? 'Permanent' : 'Temporary'}
│ Duration: ${timeText}
│ Reason: ${reason}
│
│ ${type === 'kick_temp'? 'Ametolewa group. Atarudishwa automatic.' : 'Messages zake zitafutwa automatic.'}
╰⊷ *Powered By Bunny Tech*`,
          mentions:
        }, { quoted: msg })
      }

      // SHUT OFF - Unban
      if (action === 'off') {
        if (!targetUser) return await sock.sendMessage(from, { text: '> Reply message ya mtu au mention @mtu' }, { quoted: msg })

        const { error } = await supabase
         .from('shut_list')
         .update({ is_active: false })
         .eq('group_jid', from)
         .eq('user_jid', targetUser)

        if (error) return await sock.sendMessage(from, { text: '> DB error' }, { quoted: msg })

        // Clear cache
        banCache.delete(`${from}_${targetUser}`)

        // Log
        await supabase.from('shut_logs').insert({
          group_jid: from,
          user_jid: targetUser,
          action: 'unbanned',
          admin_jid: sender
        })

        await sock.sendMessage(from, { react: { text: '🔓', key: msg.key } })
        return await sock.sendMessage(from, {
          text: `╭─⌈ 🔓 *Shut Deactivated* ⌋
│ User: @${targetUser.split('@')[0]}
│ Amefunguliwa
│ Anaweza kuongea tena
╰⊷ *Powered By Bunny Tech*`,
          mentions:
        }, { quoted: msg })
      }

      // SHUT LIST - Show active bans
      if (action === 'list') {
        const { data: bans } = await supabase
         .from('active_shut_bans')
         .select('*')
         .eq('group_jid', from)

        if (!bans || bans.length === 0) {
          return await sock.sendMessage(from, { text: '> Hakuna aliyefungiwa group hili' }, { quoted: msg })
        }

        let listText = `╭─⌈ 🔒 *Shut List* ⌋\n`
        bans.forEach((ban, i) => {
          const icon = ban.type === 'perm'? '🔴' : ban.type === 'kick_temp'? '👢' : '🟡'
          listText += `│ ${i + 1}. ${icon} @${ban.user_jid.split('@')[0]}\n`
          listText += `│ Type: ${ban.type} | Left: ${ban.time_remaining}\n`
          listText += `│ Reason: ${ban.reason}\n│\n`
        })
        listText += `╰⊷ *Powered By Bunny Tech*`

        return await sock.sendMessage(from, {
          text: listText,
          mentions: bans.map(b => b.user_jid)
        }, { quoted: msg })
      }

      // SHUT STATS - User stats
      if (action === 'stats') {
        const user = targetUser || sender
        const { data: stats } = await supabase
         .from('shut_stats')
         .select('*')
         .eq('group_jid', from)
         .eq('user_jid', user)
         .maybeSingle()

        if (!stats) {
          return await sock.sendMessage(from, { text: '> @' + user.split('@')[0] + ' hajawahi kufungiwa', mentions: }, { quoted: msg })
        }

        return await sock.sendMessage(from, {
          text: `╭─⌈ 📊 *Shut Stats* ⌋
│ User: @${user.split('@')[0]}
│ Total Bans: ${stats.total_bans}
│ Temp: ${stats.total_temp_bans} | Perm: ${stats.total_perm_bans}
│ Kicks: ${stats.total_kicks}
│ Messages Deleted: ${stats.total_messages_deleted}
│ Strikes: ${stats.strikes}/3
│ Last Ban: ${stats.last_banned_at? new Date(stats.last_banned_at).toLocaleString() : 'Never'}
╰⊷ *Powered By Bunny Tech*`,
          mentions:
        }, { quoted: msg })
      }

      return await sock.sendMessage(from, {
        text: `> Usage:\n${prefix}shut on @user - Temp 5min\n${prefix}shut temp 10 @user reason\n${prefix}shut perm @user reason\n${prefix}shut kick 30 @user\n${prefix}shut off @user\n${prefix}shut list\n${prefix}shut stats @user`
      }, { quoted: msg })
    }

    // 2. CHECK EVERY MESSAGE - AUTO DELETE
    const cacheKey = `${from}_${sender}`
    let banData = banCache.get(cacheKey)

    // Check cache first - RAM fast
    if (!banData) {
      // Query Supabase - use function
      const { data } = await supabase.rpc('get_active_shut', {
        p_group_jid: from,
        p_user_jid: sender
      })

      if (data && data.length > 0) {
        banData = data[0]
        // Cache for 1 minute
        banCache.set(cacheKey, banData)
        setTimeout(() => banCache.delete(cacheKey), CACHE_TTL)
      } else {
        // Not banned, cache negative for 30s
        banCache.set(cacheKey, null)
        setTimeout(() => banCache.delete(cacheKey), 30000)
        return
      }
    }

    if (!banData) return

    // User is banned - DELETE MESSAGE
    if (!isBotAdmin) {
      console.log('[SHUT] Bot not admin, cannot delete')
      return
    }

    try {
      // ANTI-BAN: Typing delay
      await sock.presenceSubscribe(from)
      await sock.sendPresenceUpdate('composing', from)
      await new Promise(r => setTimeout(r, Math.random() * 400 + 600))

      // DELETE
      await sock.sendMessage(from, { delete: msg.key })

      // Increment count
      await supabase.rpc('increment_shut_deleted', {
        p_group_jid: from,
        p_user_jid: sender
      })

      // Log deletion
      await supabase.from('shut_logs').insert({
        group_jid: from,
        user_jid: sender,
        action: 'message_deleted',
        type: banData.type,
        metadata: { message_id: msg.key.id, type: Object.keys(msg.message)[0] }
      })

      // Optional: Warn user once per 10 messages
      const shouldWarn = Math.random() < 0.1 // 10% chance
      if (shouldWarn) {
        const timeLeft = banData.time_left === -1? 'milele' : `${Math.floor(banData.time_left / 60)} dakika`
        await sock.sendMessage(from, {
          text: `⚠️ @${sender.split('@')[0]} bado umefungiwa ${timeLeft}. Reason: ${banData.reason}`,
          mentions:
        })
      }

    } catch (delErr) {
      console.log('[SHUT DELETE ERROR]', delErr.message)
    }

  } catch (err) {
    console.log('[SHUT OBSERVER ERROR]', err.message)
  }
}

// CRON JOB: Auto-expire bans + Auto-add kick_temp users
// Run this kila dakika 1 na node-cron au external cron
export async function cronAutoShut() {
  try {
    // 1. Expire old bans
    await supabase.rpc('auto_expire_shut_bans')

    // 2. Get kick_temp users to add back
    const { data: toAddBack } = await supabase
     .from('shut_list')
     .select('id, group_jid, user_jid')
     .eq('type', 'kick_temp')
     .eq('is_active', false)
     .lt('expires_at', new Date().toISOString())
     .gte('expires_at', new Date(Date.now() - 60000).toISOString()) // Last 1 minute

    // Note: Actual sock.add iko nje, hii ni SQL tu
    // Unahitaji kuiita kutoka index.js yako
    return toAddBack || []

  } catch (err) {
    console.log('[SHUT CRON ERROR]', err.message)
    return []
  }
}