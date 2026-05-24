// observers/antidelete.js
import { supabase } from '../lib/supabase.js'

const messageCache = new Map()
const CACHE_LIMIT = 500 // RAM friendly for Render
const AUTO_CLEAN_DAYS = 7 // Delete old records after 7 days

export default async function antidelete(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    const botJid = sock.user?.id
    if (msg.key.fromMe) return

    // 1. HANDLE MESSAGE DELETE
    if (msg.message?.protocolMessage?.type === 0) {
      if (!isGroup) return

      // Check if antidelete enabled for this group
      const { data: settings } = await supabase
      .from('group_settings')
      .select('antidelete')
      .eq('group_jid', from)
      .single()

      if (!settings?.antidelete) return

      const deletedKey = msg.message.protocolMessage.key
      const deletedMsg = messageCache.get(deletedKey.id)

      if (!deletedMsg) return

      const deleter = sender
      const originalSender = deletedMsg.key.participant || deletedMsg.key.remoteJid
      const deleterTag = `@${deleter.split('@')[0]}`
      const senderTag = `@${originalSender.split('@')[0]}`

      // Save to Supabase
      await supabase.from('deleted_messages').insert({
        message_id: deletedKey.id,
        group_jid: from,
        sender_jid: originalSender,
        sender_name: deletedMsg.pushName || originalSender.split('@')[0],
        message_type: Object.keys(deletedMsg.message)[0],
        content: deletedMsg.message.conversation ||
                 deletedMsg.message.extendedTextMessage?.text ||
                 deletedMsg.message.imageMessage?.caption ||
                 deletedMsg.message.videoMessage?.caption || null,
        deleted_by: deleter,
        original_timestamp: new Date(deletedMsg.messageTimestamp * 1000).toISOString()
      })

      // Auto clean old deleted_messages after 7 days - kuzuia kujaa
      await supabase
      .from('deleted_messages')
      .delete()
      .lt('deleted_at', new Date(Date.now() - AUTO_CLEAN_DAYS * 86400000).toISOString())

      // Build recovery message - ROUND EDGES STYLE
      const msgType = Object.keys(deletedMsg.message)[0]
      let recoveryText = `╭─⌈ 🗑️ *AntiDelete* ⌋\n`
      recoveryText += `│ Deleted by: ${deleterTag}\n`
      recoveryText += `│ Sender: ${senderTag}\n`
      recoveryText += `╰⊷ *Recovered*`

      // Resend based on type
      if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
        const text = deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage?.text
        await sock.sendMessage(from, {
          text: `${recoveryText}\n\n*Message:* ${text}`,
          mentions: [originalSender, deleter]
        })

      } else if (msgType === 'imageMessage') {
        const buffer = await sock.downloadMediaMessage(deletedMsg)
        const caption = deletedMsg.message.imageMessage?.caption || ''
        await sock.sendMessage(from, {
          image: buffer,
          caption: `${recoveryText}\n\n*Caption:* ${caption}`,
          mentions: [originalSender, deleter]
        })

      } else if (msgType === 'videoMessage') {
        const buffer = await sock.downloadMediaMessage(deletedMsg)
        const caption = deletedMsg.message.videoMessage?.caption || ''
        await sock.sendMessage(from, {
          video: buffer,
          caption: `${recoveryText}\n\n*Caption:* ${caption}`,
          mentions: [originalSender, deleter]
        })

      } else if (msgType === 'stickerMessage') {
        const buffer = await sock.downloadMediaMessage(deletedMsg)
        await sock.sendMessage(from, { sticker: buffer })
        await sock.sendMessage(from, {
          text: recoveryText,
          mentions: [originalSender, deleter]
        })

      } else if (msgType === 'audioMessage') {
        const buffer = await sock.downloadMediaMessage(deletedMsg)
        await sock.sendMessage(from, {
          audio: buffer,
          mimetype: 'audio/mp4',
          ptt: deletedMsg.message.audioMessage?.ptt || false
        })
        await sock.sendMessage(from, {
          text: recoveryText,
          mentions: [originalSender, deleter]
        })

      } else {
        await sock.sendMessage(from, {
          text: `${recoveryText}\n\n*Type:* ${msgType} deleted`,
          mentions: [originalSender, deleter]
        })
      }

      messageCache.delete(deletedKey.id)
      return
    }

    // 2. CACHE ALL GROUP MESSAGES - RAM FRIENDLY
    if (isGroup && msg.key.id) {
      messageCache.set(msg.key.id, msg)

      // Auto clean cache after 12hrs
      setTimeout(() => {
        messageCache.delete(msg.key.id)
      }, 43200000)

      // Limit cache size for Render free tier
      if (messageCache.size > CACHE_LIMIT) {
        const firstKey = messageCache.keys().next().value
        messageCache.delete(firstKey)
      }
    }

  } catch (err) {
    console.log('[ANTIDELETE ERROR]', err.message)
  }
}