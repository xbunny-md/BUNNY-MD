// observers/shut.js
import { supabase } from '../lib/supabase.js'

const banCache = new Map() // RAM cache: `${group}_${user}` -> banData
const CACHE_TTL = 60000 // 1 minute cache
const NEGATIVE_CACHE_TTL = 30000 // 30s cache kama hajafungiwa

export default async function shut(sock, { msg, from, sender, isGroup, isBotAdmin, groupMetadata }, botSettings) {
  try {
    // 1. SKIP CONDITIONS
    if (!msg || msg.key.fromMe) return
    if (!isGroup) return // Shut inafanya kazi groups tu
    if (!isBotAdmin) return // Siwezi kufuta kama si admin

    // Skip protocol messages, deletes, etc
    if (msg.message?.protocolMessage) return
    if (!msg.message) return

    // 2. CHECK CACHE FIRST - RAM FAST
    const cacheKey = `${from}_${sender}`
    let banData = banCache.get(cacheKey)

    // 3. IF NOT IN CACHE, CHECK SUPABASE
    if (banData === undefined) {
      const { data } = await supabase.rpc('get_active_shut', {
        p_group_jid: from,
        p_user_jid: sender
      })

      if (data && data.length > 0) {
        banData = data[0]
        // Cache positive result 1 minute
        banCache.set(cacheKey, banData)
        setTimeout(() => banCache.delete(cacheKey), CACHE_TTL)
      } else {
        // Cache negative result 30s - asirudie ku-query kila message
        banCache.set(cacheKey, null)
        setTimeout(() => banCache.delete(cacheKey), NEGATIVE_CACHE_TTL)
        return
      }
    }

    if (!banData) return

    // 4. USER IS BANNED - DELETE MESSAGE
    try {
      // ANTI-BAN: Typing delay kidogo
      await sock.presenceSubscribe(from)
      await sock.sendPresenceUpdate('composing', from)
      await new Promise(r => setTimeout(r, Math.random() * 400 + 400))

      // DELETE MESSAGE
      await sock.sendMessage(from, { delete: msg.key })

      // INCREMENT DELETE COUNT
      await supabase.rpc('increment_shut_deleted', {
        p_group_jid: from,
        p_user_jid: sender
      })

      // LOG DELETION - fire and forget
      supabase.from('shut_logs').insert({
        group_jid: from,
        user_jid: sender,
        action: 'message_deleted',
        type: banData.type,
        metadata: {
          message_id: msg.key.id,
          message_type: Object.keys(msg.message)[0],
          content_preview: (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').slice(0, 50)
        }
      }).then(() => {}).catch(() => {})

      // WARN USER - 5% chance tu ili isisumbue
      const shouldWarn = Math.random() < 0.05
      if (shouldWarn) {
        const timeLeft = banData.time_left === -1? 'milele' : `${Math.floor(banData.time_left / 60)} dakika`
        await sock.sendMessage(from, {
          text: `⚠️ @${sender.split('@')[0]} bado umefungiwa ${timeLeft}. Sababu: ${banData.reason}`,
          mentions: [sender]
        })
      }

    } catch (delErr) {
      // Kama delete fails, maybe message too old
      if (!delErr.message.includes('not authorized')) {
        console.log('[SHUT DELETE ERROR]', delErr.message)
      }
    }

  } catch (err) {
    console.log('[SHUT OBSERVER ERROR]', err.message)
  }
}

// CRON JOB: Auto-expire bans + Auto-add kick_temp users
// Itwa na index.js kila dakika 1
export async function cronAutoShut(sock) {
  try {
    // 1. Expire old bans
    const { data: expiredCount } = await supabase.rpc('auto_expire_shut_bans')
    if (expiredCount > 0) {
      console.log(`[SHUT CRON] Expired ${expiredCount} bans`)
    }

    // 2. Get kick_temp users to add back
    const { data: toAddBack } = await supabase
    .from('shut_list')
    .select('id, group_jid, user_jid')
    .eq('type', 'kick_temp')
    .eq('is_active', true)
    .lt('expires_at', new Date().toISOString())
    .gte('expires_at', new Date(Date.now() - 60000).toISOString()) // Last 1 minute only

    if (!toAddBack || toAddBack.length === 0) return []

    // 3. Add them back
    const results = []
    for (const user of toAddBack) {
      try {
        // Check if bot is admin in that group
        const groupMeta = await sock.groupMetadata(user.group_jid)
        const botJid = sock.user.id
        const botParticipant = groupMeta.participants.find(p => p.id === botJid)

        if (botParticipant?.admin === null) {
          console.log(`[SHUT CRON] Bot not admin in ${user.group_jid}, skipping add`)
          continue
        }

        await sock.groupParticipantsUpdate(user.group_jid, [user.user_jid], 'add')

        // Mark as inactive
        await supabase
        .from('shut_list')
        .update({ is_active: false })
        .eq('id', user.id)

        // Log
        await supabase.from('shut_logs').insert({
          group_jid: user.group_jid,
          user_jid: user.user_jid,
          action: 'added_back',
          type: 'kick_temp',
          reason: 'Timeout expired'
        })

        // Notify group
        await sock.sendMessage(user.group_jid, {
          text: `✅ @${user.user_jid.split('@')[0]} timeout imeisha, karibu tena`,
          mentions: [user.user_jid]
        })

        results.push(user)
        console.log(`[SHUT CRON] Added back ${user.user_jid} to ${user.group_jid}`)

        // Anti-ban delay
        await new Promise(r => setTimeout(r, 2000))

      } catch (e) {
        console.log('[SHUT AUTO-ADD ERROR]', e.message)
        // Kama add fails, mark as inactive anyway ili isirudie
        await supabase
        .from('shut_list')
        .update({ is_active: false })
        .eq('id', user.id)
      }
    }

    return results

  } catch (err) {
    console.log('[SHUT CRON ERROR]', err.message)
    return []
  }
}