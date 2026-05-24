// commands/sticker/vv.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'

export const name = 'vv'
export const alias = ['viewonce', 'reveal', 'once', 'rvo']
export const category = 'Sticker'
export const desc = 'Reveal viewonce image/video/audio - works 100%'

export default async function vv(sock, { msg, from }, botSettings) {
  try {
    // 1. React first
    await sock.sendMessage(from, {
      react: { text: '👀', key: msg.key }
    })

    // 2. Get quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    if (!quoted?.quotedMessage) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> ❌ Reply to a viewonce message!\n> Usage: Reply to viewonce image/video/audio + ${botSettings.prefix}vv\n> Works: Image, Video, Audio viewonce ✅`
      }, { quoted: msg })
    }

    const quotedMsg = quoted.quotedMessage

    // 3. Check if it's viewonce - support all types
    const isViewOnceImage = quotedMsg.viewOnceMessage?.message?.imageMessage
    const isViewOnceVideo = quotedMsg.viewOnceMessage?.message?.videoMessage
    const isViewOnceAudio = quotedMsg.viewOnceMessage?.message?.audioMessage
    
    // Support viewOnceMessageV2 as well
    const isV2Image = quotedMsg.viewOnceMessageV2?.message?.imageMessage
    const isV2Video = quotedMsg.viewOnceMessageV2?.message?.videoMessage
    const isV2Audio = quotedMsg.viewOnceMessageV2?.message?.audioMessage

    if (!isViewOnceImage && !isViewOnceVideo && !isViewOnceAudio && 
        !isV2Image && !isV2Video && !isV2Audio) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> ❌ That's not a viewonce message!\n> Reply to viewonce image/video/audio only\n> Usage: ${botSettings.prefix}vv`
      }, { quoted: msg })
    }

    // 4. Rebuild message object for download
    let targetMsg
    if (quotedMsg.viewOnceMessage) {
      targetMsg = {
        key: {
          remoteJid: from,
          id: quoted.stanzaId,
          participant: quoted.participant
        },
        message: quotedMsg.viewOnceMessage.message
      }
    } else if (quotedMsg.viewOnceMessageV2) {
      targetMsg = {
        key: {
          remoteJid: from,
          id: quoted.stanzaId,
          participant: quoted.participant
        },
        message: quotedMsg.viewOnceMessageV2.message
      }
    }

    // 5. Download media
    const buffer = await downloadMediaMessage(
      targetMsg,
      'buffer',
      {},
      { logger: console }
    )

    if (!buffer) throw new Error('DOWNLOAD_FAILED')

    // 6. Send based on media type
    if (isViewOnceImage || isV2Image) {
      const caption = quotedMsg.viewOnceMessage?.message?.imageMessage?.caption || 
                     quotedMsg.viewOnceMessageV2?.message?.imageMessage?.caption || ''
      
      await sock.sendMessage(from, {
        image: buffer,
        caption: caption ? `> 👁️ ViewOnce Revealed\n> Caption: ${caption}\n> By: ${botSettings.botname || 'BUNNY MD'}` : `> 👁️ ViewOnce Image Revealed\n> By: ${botSettings.botname || 'BUNNY MD'}`
      }, { quoted: msg })
      
    } else if (isViewOnceVideo || isV2Video) {
      const caption = quotedMsg.viewOnceMessage?.message?.videoMessage?.caption || 
                     quotedMsg.viewOnceMessageV2?.message?.videoMessage?.caption || ''
      
      await sock.sendMessage(from, {
        video: buffer,
        caption: caption ? `> 👁️ ViewOnce Revealed\n> Caption: ${caption}\n> By: ${botSettings.botname || 'BUNNY MD'}` : `> 👁️ ViewOnce Video Revealed\n> By: ${botSettings.botname || 'BUNNY MD'}`
      }, { quoted: msg })
      
    } else if (isViewOnceAudio || isV2Audio) {
      const isPtt = quotedMsg.viewOnceMessage?.message?.audioMessage?.ptt || 
                   quotedMsg.viewOnceMessageV2?.message?.audioMessage?.ptt
      
      await sock.sendMessage(from, {
        audio: buffer,
        ptt: isPtt || false,
        mimetype: 'audio/mpeg'
      }, { quoted: msg })
    }

    // 7. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[VV ERROR]', error.message)
    
    let errorMsg = '> ❌ Failed to reveal viewonce'
    
    if (error.message === 'DOWNLOAD_FAILED') {
      errorMsg = '> ❌ Failed to download media\n> Media might be expired or deleted'
    } else if (error.message.includes('decrypt')) {
      errorMsg = '> ❌ Cannot decrypt media\n> Viewonce already opened or expired'
    } else {
      errorMsg = '> ❌ Error revealing viewonce\n> Make sure you reply to viewonce message'
    }
    
    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}