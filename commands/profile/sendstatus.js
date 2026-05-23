// commands/profile/sendstatus.js
export const name = 'sendstatus'
export const alias = ['poststatus', 'updatestatus', 'statusup']
export const category = 'Profile'
export const desc = 'Uploads image, video, audio, document, sticker or text as your WhatsApp status'

export default async function sendstatus(sock, { msg, from, args, body }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 📤
    await sock.sendMessage(from, {
      react: { text: '📤', key: msg.key }
    })

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const textAfterCmd = body.slice(botSettings.prefix.length + name.length).trim()

    let mediaBuffer = null
    let mediaType = null
    let caption = ''
    let mimetype = ''

    // 2. Function to extract media from any message type
    const extractMedia = async (messageObj) => {
      if (!messageObj) return null

      // Image
      if (messageObj.imageMessage) {
        return {
          buffer: await sock.downloadMediaMessage({ message: messageObj }),
          type: 'image',
          caption: textAfterCmd || messageObj.imageMessage.caption || '',
          mimetype: messageObj.imageMessage.mimetype
        }
      }
      // Video
      else if (messageObj.videoMessage) {
        return {
          buffer: await sock.downloadMediaMessage({ message: messageObj }),
          type: 'video',
          caption: textAfterCmd || messageObj.videoMessage.caption || '',
          mimetype: messageObj.videoMessage.mimetype
        }
      }
      // Audio
      else if (messageObj.audioMessage) {
        return {
          buffer: await sock.downloadMediaMessage({ message: messageObj }),
          type: 'audio',
          caption: '',
          mimetype: messageObj.audioMessage.mimetype
        }
      }
      // Document
      else if (messageObj.documentMessage) {
        return {
          buffer: await sock.downloadMediaMessage({ message: messageObj }),
          type: 'document',
          caption: textAfterCmd || messageObj.documentMessage.caption || '',
          mimetype: messageObj.documentMessage.mimetype,
          fileName: messageObj.documentMessage.fileName
        }
      }
      // Sticker - convert to image
      else if (messageObj.stickerMessage) {
        return {
          buffer: await sock.downloadMediaMessage({ message: messageObj }),
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
      // ViewOnce messages
      else if (messageObj.viewOnceMessage?.message) {
        const innerMsg = messageObj.viewOnceMessage.message
        if (innerMsg.imageMessage) {
          return {
            buffer: await sock.downloadMediaMessage({ message: innerMsg }),
            type: 'image',
            caption: textAfterCmd || innerMsg.imageMessage.caption || '',
            mimetype: innerMsg.imageMessage.mimetype
          }
        } else if (innerMsg.videoMessage) {
          return {
            buffer: await sock.downloadMediaMessage({ message: innerMsg }),
            type: 'video',
            caption: textAfterCmd || innerMsg.videoMessage.caption || '',
            mimetype: innerMsg.videoMessage.mimetype
          }
        }
      }
      return null
    }

    let extractedData = null

    // 3. Way 1: Check quoted message - REPLY YOYOTE
    if (quoted) {
      extractedData = await extractMedia(quoted)
    }
    // 4. Way 2: Check direct message - TUMA DIRECT
    else if (msg.message) {
      extractedData = await extractMedia(msg.message)
    }

    // 5. Way 3: Text only status
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

    // 6. Upload to status - ALL TYPES
    switch (mediaType) {
      case 'text':
        await sock.sendMessage('status@broadcast', {
          text: caption
        }, {
          backgroundColor: '#0d1117',
          font: 1
        })
        break

      case 'image':
        await sock.sendMessage('status@broadcast', {
          image: mediaBuffer,
          caption: caption
        })
        break

      case 'video':
        await sock.sendMessage('status@broadcast', {
          video: mediaBuffer,
          caption: caption
        })
        break

      case 'audio':
        await sock.sendMessage('status@broadcast', {
          audio: mediaBuffer,
          mimetype: mimetype || 'audio/mp4'
        })
        break

      case 'document':
        await sock.sendMessage('status@broadcast', {
          document: mediaBuffer,
          mimetype: mimetype,
          fileName: extractedData.fileName || 'Document',
          caption: caption
        })
        break

      default:
        throw new Error('UNSUPPORTED_TYPE')
    }

    // 7. Send confirmation
    await sock.sendMessage(from, {
      text: `╭─⌈ 📤 *STATUS POSTED* ⌋
│ Type: ${mediaType.toUpperCase()}
│ Caption: ${caption || 'None'}
│ Status: Uploaded successfully ✅
╰⊷ *Powered by Bunny Tech*`
    }, { quoted: msg })

    // 8. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[SENDSTATUS ERROR]', error.message)

    let errorMsg = '> Failed to post status'

    if (error.message === 'NO_CONTENT') {
      errorMsg = `> Send media or text to post\n> Usage: ${botSettings.prefix}sendstatus Hello world\n> Or reply any message with ${botSettings.prefix}sendstatus`
    } else if (error.message === 'UNSUPPORTED_TYPE') {
      errorMsg = '> This media type cannot be posted to status'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}