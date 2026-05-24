// observers/shut.js
import { supabase } from '../lib/supabase.js'

const banCache = new Map() // RAM cache: `${group}_${user}` -> banData
const CACHE_TTL = 60000 // 1 minute cache
const NEGATIVE_CACHE_TTL = 30000 // 30s cache if not banned

export default async function shut(sock, { msg, from, sender, isGroup, isBotAdmin }, botSettings) {
  try {
    // 1. SKIP CONDITIONS
    if (!msg || msg.key.fromMe) return
    if (!isGroup) return // Only works in groups
    if (!isBotAdmin) return // Can't delete if not admin
    if (msg.message?.protocolMessage) return // Skip deletes, etc
    if (!msg.message) return

    // 2. FIX LID ISSUE: Get correct JID using onWhatsApp
    const [waResult] = await sock.onWhatsApp(sender)
    if (!waResult?.exists) return
    
    const correctSender = waResult.jid // Use new/correct JID

    // 3. CHECK CACHE FIRST - RAM FAST
    const cacheKey = `${from}_${correctSender}`
    let banData = banCache.get(cacheKey)

    // 4. IF NOT IN CACHE, CHECK SUPABASE
    if (banData === undefined) {
      const { data, error } = await supabase.rpc('get_active_shut', {
        p_group_jid: from,
        p_user_jid: correctSender
      })

      if (error) {
        console.log('[SHUT RPC ERROR]', error.message)
        return
      }

      if (data && data.length > 0) {
        banData = data[0]
        // Cache positive result 1 minute
        banCache.set(cacheKey, banData)
        setTimeout(() => banCache.delete(cacheKey), CACHE_TTL)
      } else {
        // Cache negative result 30s - don't query every message
        banCache.set(cacheKey, null)
        setTimeout(() => banCache.delete(cacheKey), NEGATIVE_CACHE_TTL)
        return
      }
    }

    if (!banData) return

    // 5. USER IS MUTED - DELETE MESSAGE
    try {
      // ANTI-BAN: Small typing delay
      await sock.presenceSubscribe(from)
      await sock.sendPresenceUpdate('composing', from)
      await new Promise(r => setTimeout(r, Math.random() * 400 + 400))

      // DELETE MESSAGE
      await sock.sendMessage(from, { delete: msg.key })

      // INCREMENT DELETE COUNT - fire and forget
      supabase.rpc('increment_shut_deleted', {
        p_group_jid: from,
        p_user_jid: correctSender
      }).then(() => {}).catch(() => {})

      // LOG DELETION - fire and forget
      supabase.from('shut_logs').insert({
        group_jid: from,
        user_jid: correctSender,
        action: 'message_deleted',
        type: banData.type,
        metadata: {
          message_id: msg.key.id,
          message_type: Object.keys(msg.message)[0],
          content_preview: (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').slice(0, 50)
        }
      }).then(() => {}).catch(() => {})

      // WARN USER - 5% chance only to avoid spam
      const shouldWarn = Math.random() < 0.05
      if (shouldWarn) {
        const timeLeft = banData.time_left === -1 
         ? 'permanently' 
          : `${Math.floor(banData.time_left / 60)} minutes`
        
        await sock.sendMessage(from, {
          text: `⚠️ @${correctSender.split('@')[0]} you are still muted ${timeLeft}. Reason: ${banData.reason}`,
          mentions: [correctSender]
        })
      }

    } catch (delErr) {
      // Ignore "not authorized" - means message too old
      if (!delErr.message.includes('not authorized')) {
        console.log('[SHUT DELETE ERROR]', delErr.message)
      }
    }

  } catch (err) {
    console.log('[SHUT OBSERVER ERROR]', err.message)
  }
}

// CRON JOB: Auto-expire mutes only - NO KICK LOGIC
// Called by index.js every 1 minute
export async function cronAutoShut(sock) {
  try {
    // Expire old mutes only
    const { data: expiredCount, error } = await supabase.rpc('auto_expire_shut_bans')
    
    if (error) {
      console.log('[SHUT CRON ERROR]', error.message)
      return
    }

    if (expiredCount > 0) {
      console.log(`[SHUT CRON] Expired ${expiredCount} mutes`)
    }

  } catch (err) {
    console.log('[SHUT CRON ERROR]', err.message)
  }
}