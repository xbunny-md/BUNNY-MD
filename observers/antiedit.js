// observers/antiedit.js
import { supabase } from '../lib/supabase.js'

const editCache = new Map()
const CACHE_LIMIT = 500 // RAM friendly for Render
const AUTO_CLEAN_HOURS = 24 // Delete old records after 24hrs

export default async function antiedit(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    const botJid = sock.user?.id
    if (msg.key.fromMe) return
    if (!isGroup) return

    // 1. HANDLE MESSAGE EDIT
    if (msg.message?.protocolMessage?.type === 14) {
      // Check if antiedit enabled for this group
      const { data: settings } = await supabase
    .from('group_settings')
    .select('antiedit')
    .eq('group_jid', from)
    .single()

      if (!settings?.antiedit) return

      const editedKey = msg.message.protocolMessage.key
      const oldMsg = editCache.get(editedKey.id)

      if (!oldMsg) return

      const editor = sender
      const originalSender = editedKey.participant || editedKey.remoteJid
      const editorTag = `@${editor.split('@')[0]}`
      const senderTag = `@${originalSender.split('@')[0]}`

      // Get old and new content
      const oldContent = oldMsg.message.conversation ||
                        oldMsg.message.extendedTextMessage?.text ||
                        oldMsg.message.imageMessage?.caption ||
                        oldMsg.message.videoMessage?.caption || null

      const newContent = msg.message.protocolMessage.editedMessage?.conversation ||
                        msg.message.protocolMessage.editedMessage?.extendedTextMessage?.text ||
                        msg.message.protocolMessage.editedMessage?.imageMessage?.caption ||
                        msg.message.protocolMessage.editedMessage?.videoMessage?.caption || null

      if (!oldContent || oldContent === newContent) return

      // Get version number
      const { data: lastVersion } = await supabase
    .from('message_history')
    .select('version_number')
    .eq('message_id', editedKey.id)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

      const nextVersion = lastVersion? lastVersion.version_number + 1 : 1

      // Save to Supabase
      await supabase.from('message_history').insert({
        message_id: editedKey.id,
        group_jid: from,
        sender_jid: originalSender,
        sender_name: oldMsg.pushName || originalSender.split('@')[0],
        version_number: nextVersion,
        content: newContent,
        edited_at: new Date().toISOString()
      })

      // Auto clean old message_history after 24hrs
      await supabase
    .from('message_history')
    .delete()
    .lt('edited_at', new Date(Date.now() - AUTO_CLEAN_HOURS * 3600000).toISOString())

      // Build recovery message - FULL ROUND EDGES STYLE
      let recoveryText = `╭─⌈ ✏️ *AntiEdit* ⌋\n`
      recoveryText += `│ Edited by: ${editorTag}\n`
      recoveryText += `│ Sender: ${senderTag}\n`
      recoveryText += `│ Version: ${nextVersion}\n`
      recoveryText += `│ \n`
      recoveryText += `│ *Before:*\n`
      recoveryText += `│ ${oldContent}\n`
      recoveryText += `│ \n`
      recoveryText += `│ *After:*\n`
      recoveryText += `│ ${newContent}\n`
      recoveryText += `╰⊷ *Powered by Bunny Tech*`

      await sock.sendMessage(from, {
        text: recoveryText,
        mentions: [originalSender, editor]
      })

      // Update cache with new version
      editCache.set(editedKey.id, {
      ...oldMsg,
        message: msg.message.protocolMessage.editedMessage
      })

      return
    }

    // 2. CACHE ALL TEXT MESSAGES - RAM FRIENDLY
    const msgType = Object.keys(msg.message)[0]
    const hasText = msgType === 'conversation' ||
                   msgType === 'extendedTextMessage' ||
                   msg.message.imageMessage?.caption ||
                   msg.message.videoMessage?.caption

    if (hasText && msg.key.id) {
      editCache.set(msg.key.id, msg)

      // Auto clean cache after 12hrs
      setTimeout(() => {
        editCache.delete(msg.key.id)
      }, 43200000)

      // Limit cache size for Render free tier
      if (editCache.size > CACHE_LIMIT) {
        const firstKey = editCache.keys().next().value
        editCache.delete(firstKey)
      }
    }

  } catch (err) {
    console.log('[ANTIEDIT ERROR]', err.message)
  }
}