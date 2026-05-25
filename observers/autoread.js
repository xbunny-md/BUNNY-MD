// observers/autoread.js
import { supabase } from '../lib/supabase.js'

export default async function autoread(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    // Skip if message from bot itself
    if (msg.key.fromMe) return

    const chatJid = from
    const senderName = msg.pushName || sender.split('@')[0]
    const messageId = msg.key.id
    const msgType = Object.keys(msg.message || {})[0] || 'unknown'

    // 1. CHECK BLACKLIST FIRST - USISOME HII CHAT
    try {
      const { data: blacklisted } = await supabase
      .from('autoread_blacklist')
      .select('chat_jid')
      .eq('chat_jid', chatJid)
      .maybeSingle()

      if (blacklisted) {
        console.log(`[AUTOREAD] Skipped blacklisted chat: ${chatJid}`)
        return
      }
    } catch {}

    // 2. GET CONFIG + WHITELIST
    let isEnabled = true
    let scope = 'all'
    let delayMin = 1000
    let delayMax = 3000
    let markChatRead = true
    let isWhitelisted = false

    try {
      const { data: config } = await supabase
      .from('autoread_config')
      .select('*')
      .eq('id', 'config')
      .maybeSingle()

      if (config) {
        isEnabled = config.is_enabled
        scope = config.autoread_scope || 'all'
        delayMin = config.delay_min_ms || 1000
        delayMax = config.delay_max_ms || 3000
        markChatRead = config.mark_chat_read?? true
      }

      // Check whitelist
      const { data: whitelist } = await supabase
      .from('autolike_whitelist')
      .select('chat_jid')
      .eq('chat_jid', chatJid)
      .maybeSingle()

      if (whitelist) isWhitelisted = true

    } catch (dbErr) {
      console.log('[AUTOREAD] DB check failed, using defaults:', dbErr.message)
    }

    // Kama imezimwa NA si whitelist, toka
    if (!isEnabled &&!isWhitelisted) return

    // 3. CHECK SCOPE - WHERE SHOULD IT WORK
    if (scope === 'groups' &&!isGroup) return
    if (scope === 'dm' && isGroup) return
    // 'all' works everywhere

    // 4. CALCULATE RANDOM DELAY FROM DB
    const readDelay = delayMin + Math.random() * (delayMax - delayMin)
    await new Promise(resolve => setTimeout(resolve, readDelay))

    // 5. MARK MESSAGE AS READ
    await sock.readMessages([msg.key])

    // 6. MARK WHOLE CHAT READ IF ENABLED
    if (markChatRead) {
      try {
        await sock.chatModify({ markRead: true, lastMessages: [msg] }, chatJid)
      } catch {}
    }

    // 7. LOG TO SUPABASE
    try {
      await supabase.from('autoread_logs').insert({
        message_id: messageId,
        chat_jid: chatJid,
        sender_jid: sender,
        sender_name: senderName,
        is_group: isGroup,
        message_type: msgType
      })
    } catch (logErr) {
      console.log('[AUTOREAD LOG ERROR]', logErr.message)
    }

    // 8. AUTO CLEAN OLD LOGS - 10% chance
    if (Math.random() < 0.1) {
      try {
        await supabase.rpc('delete_old_autoread_logs')
      } catch {}
    }

    console.log(`[AUTOREAD] Read message from ${senderName} in ${isGroup? 'group' : 'dm'}`)

  } catch (err) {
    // NEVER FAIL OBSERVER
    console.log('[AUTOREAD ERROR]', err.message)
  }
}