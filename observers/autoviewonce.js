// observers/autoviewonce.js
import { supabase } from '../lib/supabase.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default async function autoviewonce(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    // 1. CHECK IF MESSAGE CONTAINS VIEWONCE OR VIEWONCEV2
    const hasViewOnce = msg.message?.viewOnceMessage || msg.message?.viewOnceMessageV2
    if (!hasViewOnce) return

    // Skip if message from bot itself
    if (msg.key.fromMe) return

    // 2. GET SETTINGS - CHECK GLOBAL FIRST
    const { data: globalSettings } = await supabase
     .from('group_settings')
     .select('autoviewonce, autoviewonce_mode, autoviewonce_target')
     .eq('group_jid', 'global')
     .maybeSingle()

    // 3. GET GROUP SPECIFIC SETTINGS IF IN GROUP
    let settings = globalSettings
    if (isGroup) {
      const { data: groupSettings } = await supabase
       .from('group_settings')
       .select('autoviewonce, autoviewonce_mode, autoviewonce_target')
       .eq('group_jid', from)
       .maybeSingle()

      // Group settings override global if exists
      if (groupSettings && groupSettings.autoviewonce!== null) {
        settings = groupSettings
      }
    }

    // 4. CHECK IF AUTOVIEWONCE IS ENABLED
    if (!settings?.autoviewonce) return

    // 5. GET MODE AND TARGET FROM DB
    const mode = settings.autoviewonce_mode || 'both' // dm, chat, both
    const customTarget = settings.autoviewonce_target || botSettings.owner_jid
    const originalSender = msg.key.participant || msg.key.remoteJid
    const senderTag = `@${originalSender.split('@')[0]}`

    // 6. EXTRACT VIEWONCE MESSAGE DATA - SUPPORT BOTH V1 & V2
    let viewOnceContent = null
    let msgType = null

    if (msg.message.viewOnceMessage) {
      msgType = Object.keys(msg.message.viewOnceMessage.message)[0]
      viewOnceContent = msg.message.viewOnceMessage.message[msgType]
    } else if (msg.message.viewOnceMessageV2) {
      msgType = Object.keys(msg.message.viewOnceMessageV2.message)[0]
      viewOnceContent = msg.message.viewOnceMessageV2.message[msgType]
    }

    if (!viewOnceContent ||!msgType) return

    // 7. DOWNLOAD MEDIA - WORKS FOR ALL TYPES
    const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
      logger: sock.logger,
      reuploadRequest: sock.updateMediaMessage
    })

    // 8. BUILD RECOVERY MESSAGE
    let recoveryText = `╭─⌈ 👁️ *ViewOnce Recovered* ⌋\n`
    recoveryText += `│ From: ${senderTag}\n`
    recoveryText += `│ Type: ${msgType.replace('Message', '')}\n`
    recoveryText += `│ Chat: ${isGroup? 'Group' : 'DM'}\n`
    recoveryText += `╰⊷ *Auto Saved*`

    const caption = viewOnceContent?.caption || ''
    const fullCaption = caption? `${recoveryText}\n\n*Caption:* ${caption}` : recoveryText

    // 9. PREPARE MEDIA OBJECT - SUPPORT ALL TYPES
    let mediaObj = {}

    if (msgType === 'imageMessage') {
      mediaObj = {
        image: buffer,
        caption: fullCaption,
        mentions: [originalSender]
      }
    } else if (msgType === 'videoMessage') {
      mediaObj = {
        video: buffer,
        caption: fullCaption,
        mentions: [originalSender],
        gifPlayback: viewOnceContent.gifPlayback || false
      }
    } else if (msgType === 'audioMessage') {
      mediaObj = {
        audio: buffer,
        mimetype: viewOnceContent.mimetype || 'audio/mp4',
        ptt: viewOnceContent.ptt!== undefined? viewOnceContent.ptt : true
      }
    } else if (msgType === 'documentMessage') {
      mediaObj = {
        document: buffer,
        mimetype: viewOnceContent.mimetype,
        fileName: viewOnceContent.fileName || 'document',
        caption: fullCaption,
        mentions: [originalSender]
      }
    } else {
      // Fallback for any other type
      mediaObj = {
        text: `${recoveryText}\n\n*Type:* ${msgType} - Unsupported format`,
        mentions: [originalSender]
      }
    }

    // 10. DETERMINE TARGETS BASED ON MODE
    const targets = []
    if (mode === 'dm' || mode === 'both') {
      targets.push(customTarget)
    }
    if (mode === 'chat' || mode === 'both') {
      targets.push(from)
    }

    // 11. SEND TO ALL TARGETS
    for (const target of targets) {
      try {
        await sock.sendMessage(target, mediaObj)

        // Send text for audio since it has no caption
        if (msgType === 'audioMessage') {
          await sock.sendMessage(target, {
            text: fullCaption,
            mentions: [originalSender]
          })
        }
      } catch (sendErr) {
        console.log(`[AUTOVIEWONCE SEND ERROR to ${target}]`, sendErr.message)
      }
    }

  } catch (err) {
    console.log('[AUTOVIEWONCE ERROR]', err.message)
  }
}