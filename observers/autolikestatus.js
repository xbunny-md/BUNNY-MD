// observers/autolikestatus.js
import { supabase } from '../lib/supabase.js'

// EMOJIS 100 TOFAUTI - NO GREEN 💚 - PURPLE 💜 PRIORITY
const EMOJIS = [
  '💜', '❤️', '🧡', '💛', '💙', '💗', '💖', '💕', '💞', '💓',
  '💘', '💝', '💟', '♥️', '🩷', '🩵', '🩶', '🤍', '🤎', '🖤',
  '🔥', '✨', '⭐', '🌟', '💫', '⚡', '💥', '🎉', '🎊', '🎈',
  '😍', '🥰', '😘', '😊', '😄', '😁', '😎', '🤩', '🥳', '😇',
  '🙌', '👏', '🙏', '💪', '👑', '💎', '🏆', '🎯', '🚀', '🌈',
  '🦋', '🌸', '🌺', '🌹', '🌻', '🌼', '🌷', '💐', '🍀', '🌿',
  '🦁', '🐯', '🐱', '🐶', '🐺', '🦊', '🐻', '🐼', '🐨', '🐵',
  '🦄', '🐴', '🐙', '🦑', '🐠', '🐬', '🐳', '🦈', '🐢', '🐍',
  '🍕', '🍔', '🍟', '🌮', '🍣', '🍜', '🍰', '🍩', '🍪', '🍫',
  '🎮', '🎸', '🎧', '🎤', '🎬', '📸', '🎨', '✏️', '📚', '💻'
]

const PRIORITY_EMOJI = '💜'

export default async function autolikestatus(sock, { msg, from, isStatus }, botSettings) {
  try {
    // 1. CHECK STATUS TU - SIO MESSAGE ZA KAWAIDA
    if (!isStatus ||!msg.key.remoteJid || msg.key.remoteJid!== 'status@broadcast') return
    if (msg.key.fromMe) return

    const ownerJid = msg.key.participant || msg.key.remoteJid
    const ownerName = msg.pushName || ownerJid.split('@')[0]
    const statusId = msg.key.id

    // 2. CHECK BLACKLIST KWANZA - USILIKE HUYU
    try {
      const { data: blacklisted } = await supabase
       .from('autolike_blacklist')
       .select('user_jid')
       .eq('user_jid', ownerJid)
       .maybeSingle()

      if (blacklisted) {
        console.log(`[AUTOLIKE] Skipped blacklisted user: ${ownerName}`)
        return
      }
    } catch {}

    // 3. CHECK CONFIG + WHITELIST
    let isEnabled = true
    let priorityChance = 0.4
    let isWhitelisted = false

    try {
      // Pata config
      const { data: config } = await supabase
       .from('autolike_config')
       .select('is_enabled, priority_emoji_chance')
       .eq('id', 'config')
       .maybeSingle()

      if (config) {
        isEnabled = config.is_enabled
        priorityChance = config.priority_emoji_chance || 0.4
      }

      // Check whitelist
      const { data: whitelist } = await supabase
       .from('autolike_whitelist')
       .select('user_jid')
       .eq('user_jid', ownerJid)
       .maybeSingle()

      if (whitelist) isWhitelisted = true

    } catch (dbErr) {
      console.log('[AUTOLIKE] DB check failed, using defaults:', dbErr.message)
    }

    // Kama imezimwa NA huyu si whitelist, toka
    if (!isEnabled &&!isWhitelisted) return

    // 4. CHAGUA EMOJI - PRIORITY_CHANCE FROM DB
    let emoji
    if (Math.random() < priorityChance) {
      emoji = PRIORITY_EMOJI
    } else {
      emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
    }

    // 5. LIKE STATUS PAPO HAPO
    await sock.sendMessage(
      from,
      {
        react: {
          text: emoji,
          key: msg.key
        }
      }
    )

    // 6. LOG KILA KITU SUPABASE
    try {
      await supabase.from('autolike_logs').insert({
        status_id: statusId,
        owner_jid: ownerJid,
        owner_name: ownerName,
        emoji_used: emoji
      })
      // Trigger ita-update autolike_stats auto
    } catch (logErr) {
      console.log('[AUTOLIKE LOG ERROR]', logErr.message)
    }

    // 7. AUTO CLEAN LOGS ZA ZAMANI - KILA LIKE 10
    if (Math.random() < 0.1) { // 10% chance
      try {
        await supabase.rpc('delete_old_autolike_logs')
      } catch {}
    }

    console.log(`[AUTOLIKE] Liked ${ownerName} with ${emoji}${isWhitelisted? ' [WHITELIST]' : ''}`)

  } catch (err) {
    // NEVER FAIL OBSERVER
    console.log('[AUTOLIKE CRITICAL ERROR]', err.message)
  }
}