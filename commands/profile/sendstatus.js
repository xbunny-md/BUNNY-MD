// commands/profile/sendstatus.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'

export const name = 'sendstatus'
export const alias = ['poststatus', 'updatestatus', 'statusup', 'sstatus']
export const category = 'Profile'
export const desc = 'Uploads image, video, audio, document, sticker or text as WhatsApp status'

export default async function sendstatus(sock, { msg, from, args, body }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. REACT FIRST
    await sock.sendMessage(from, {
      react: { text: '📤', key: msg.key }
    })

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const textAfterCmd = body.slice(prefix.length + name.length).trim()

    let mediaBuffer = null
    let mediaType = null
    let caption = ''
    let mimetype = ''
    let fileName = ''

    // 2. FUNCTION TO EXTRACT MEDIA - FIXED DOWNLOAD
    const extractMedia = async (messageObj) => {
      if (!messageObj) return null

      // Image
      if (messageObj.imageMessage) {
        return {
          buffer: await downloadMediaMessage({ message: messageObj }, 'buffer', {}, { logger: console }),
          type: 'image',
          caption: textAfterCmd || messageObj.imageMessage.caption || '',
          mimetype: messageObj.imageMessage.mimetype
        }
      }
      // Video
      else if (messageObj.videoMessage) {
        return {
          buffer: await downloadMediaMessage({ message: messageObj }, 'buffer', {}, { logger: console }),
          type: 'video',
          caption: textAfterCmd || messageObj.videoMessage.caption || '',
          mimetype: messageObj.videoMessage.mimetype
        }
      }
      // Audio
      else if (messageObj.audioMessage) {
        return {
          buffer: await downloadMediaMessage({ message: messageObj }, 'buffer', {}, { logger: console }),
          type: 'audio',
          caption: '',
          mimetype: messageObj.audioMessage.mimetype
        }
      }
      // Document
      else if (messageObj.documentMessage) {
        return {
          buffer: await downloadMediaMessage({ message: messageObj }, 'buffer', {}, { logger: console }),
          type: 'document',
          caption: textAfterCmd || messageObj.documentMessage.caption || '',
          mimetype: messageObj.documentMessage.mimetype,
          fileName: messageObj.documentMessage.fileName
        }
      }
      // Sticker - convert to image
      else if (messageObj.stickerMessage) {
        return {
          buffer: await downloadMediaMessage({ message: messageObj }, 'buffer', {}, { logger: console }),
          type: 'image',
          caption: textAfterCmd || 'Sticker Status',
          mimetype: 'image/webp'
        }
      }
      // Text messages
      else if (messageObj.conversation) {
        return {
          type: 'text',
          caption: textAfterCmd || messageObj.conversation
        }
      }
      else if (messageObj.extendedTextMessage) {
        return {
          type: 'text',
          caption: textAfterCmd || messageObj.extendedTextMessage.text
        }
      }
      // ViewOnce messages V1 & V2
      else if (messageObj.viewOnceMessage?.message || messageObj.viewOnceMessageV2?.message) {
        const innerMsg = messageObj.viewOnceMessage?.message || messageObj.viewOnceMessageV2?.message
        if (innerMsg.imageMessage) {
          return {
            buffer: await downloadMediaMessage({ message: innerMsg }, 'buffer', {}, { logger: console }),
            type: 'image',
            caption: textAfterCmd || innerMsg.imageMessage.caption || '',
            mimetype: innerMsg.imageMessage.mimetype
          }
        } else if (innerMsg.videoMessage) {
          return {
            buffer: await downloadMediaMessage({ message: innerMsg }, 'buffer', {}, { logger: console }),
            type: 'video',
            caption: textAfterCmd || innerMsg.videoMessage.caption || '',
            mimetype: innerMsg.videoMessage.mimetype
          }
        }
      }
      return null
    }

    let extractedData = null

    // 3. WAY 1: Check quoted message - REPLY YOYOTE
    if (quoted) {
      extractedData = await extractMedia(quoted)
    }
    // 4. WAY 2: Check direct message - TUMA DIRECT
    else if (msg.message) {
      extractedData = await extractMedia(msg.message)
    }

    // 5. WAY 3: Text only status
    if (!extractedData && textAfterCmd) {
      extractedData = {
        type: 'text',
        caption: textAfterCmd
      }
    }

    if (!extractedData) {
      throw new Error('NO_CONTENT')
    }

    mediaBuffer = extractedData.buffer
    mediaType = extractedData.type
    caption = extractedData.caption
    mimetype = extractedData.mimetype || ''
    fileName = extractedData.fileName || 'Document'

    // 6. UPLOAD TO STATUS - ALL TYPES FIXED
    const statusJid = 'status@broadcast'
    
    switch (mediaType) {
      case 'text':
        // Text status with random background - NEW FEATURE
        const backgrounds = ['#0d1117', '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#FFFF00', '#00FFFF', '#FF69B4']
        const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)]
        const randomFont = Math.floor(Math.random() * 5) + 1

        await sock.sendMessage(statusJid, {
          text: caption
        }, {
          backgroundColor: randomBg,
          font: randomFont
        })
        break

      case 'image':
        await sock.sendMessage(statusJid, {
          image: mediaBuffer,
          caption: caption
        })
        break

      case 'video':
        await sock.sendMessage(statusJid, {
          video: mediaBuffer,
          caption: caption
        })
        break

      case 'audio':
        await sock.sendMessage(statusJid, {
          audio: mediaBuffer,
          mimetype: mimetype || 'audio/mp4'
        })
        break

      case 'document':
        await sock.sendMessage(statusJid, {
          document: mediaBuffer,
          mimetype: mimetype,
          fileName: fileName,
          caption: caption
        })
        break

      default:
        throw new Error('UNSUPPORTED_TYPE')
    }

    // 7. SEND CONFIRMATION WITH STATS
    const fileSize = mediaBuffer? `${(mediaBuffer.length / 1024).toFixed(2)} KB` : 'N/A'
    
    await sock.sendMessage(from, {
      text: `╭─⌈ 📤 *STATUS POSTED* ⌋
│ Type: ${mediaType.toUpperCase()}
│ Caption: ${caption? caption.slice(0, 40) + (caption.length > 40? '...' : '') : 'None'}
│ Size: ${fileSize}
│ Status: Uploaded Successfully ✅
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`
    }, { quoted: msg })

    // 8. REACT DONE
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[SENDSTATUS ERROR]', error.message)

    let errorMsg = `╭─⌈ ❌ *Failed* ⌋
│ Failed to post status
│ Check your media or try again
╰⊷ *Powered By Bunny Tech*`

    if (error.message === 'NO_CONTENT') {
      errorMsg = `╭─⌈ ❌ *No Content* ⌋
│ Send media or text to post
│
│ *Usage:*
│ ${prefix}sendstatus Hello world
│ Reply any message with ${prefix}sendstatus
│ ${prefix}sendstatus - with media attached
╰⊷ *Powered By Bunny Tech*`
    } else if (error.message === 'UNSUPPORTED_TYPE') {
      errorMsg = `╭─⌈ ❌ *Unsupported* ⌋
│ This media type cannot be posted
│ Supported: Image, Video, Audio, Document, Sticker, Text
╰⊷ *Powered By Bunny Tech*`
    } else if (error.message.includes('rate limit')) {
      errorMsg = `╭─⌈ ❌ *Rate Limit* ⌋
│ Too many status posts
│ Wait a few minutes and try again
╰⊷ *Powered By Bunny Tech*`
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}