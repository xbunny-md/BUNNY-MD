// commands/sticker/getexif.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { extractMetadata } from 'wa-sticker-formatter'

export const name = 'getexif'
export const alias = ['exif', 'stickerinfo', 'sinfo']
export const category = 'Sticker'
export const desc = 'Get sticker packname, author and details'

export default async function getexif(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. ADVANCED STICKER DETECTION - viewOnce included
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const stickerMessage = msg.message?.stickerMessage || 
                           quoted?.stickerMessage ||
                           quoted?.viewOnceMessageV2?.message?.stickerMessage ||
                           quoted?.viewOnceMessage?.message?.stickerMessage

    if (!stickerMessage) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📋 *Get Sticker Info* ⌋
│ Reply to a sticker to get details
│
│ *Usage:*
│ ${prefix}getexif
│ ${prefix}exif
│
│ *Shows:*
│ • Pack name
│ • Author
│ • Type: Animated/Static
│ • Emojis
│ • File size
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 2. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 3. BUILD TARGET MSG CORRECTLY - MODERN WAY
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo
    const targetMsg = quotedInfo?.quotedMessage ? {
      message: quoted,
      key: {
        remoteJid: from,
        id: quotedInfo.stanzaId,
        participant: quotedInfo.participant
      }
    } : msg

    // 4. DOWNLOAD STICKER BUFFER
    const buffer = await downloadMediaMessage(
      targetMsg,
      'buffer',
      {},
      { logger: console }
    )

    if (!buffer || buffer.length === 0) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *Error* ⌋
│ Failed to download sticker
│ Try again or use different sticker
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. EXTRACT METADATA - SAFE FALLBACK
    let metadata = {}
    try {
      metadata = await extractMetadata(buffer)
    } catch (err) {
      console.log('[GETEXIF] Metadata extract failed:', err.message)
      metadata = {}
    }

    const pack = metadata['sticker-pack-name'] || metadata['sticker-pack-id'] || 'Unknown'
    const author = metadata['sticker-pack-publisher'] || metadata['sticker-pack-publishers'] || 'Unknown'
    const emojis = metadata['emojis'] || []
    const isAnimated = stickerMessage.isAnimated || false
    const mimetype = stickerMessage.mimetype || 'image/webp'
    const fileSizeKB = (buffer.length / 1024).toFixed(2)
    const width = stickerMessage.width || 512
    const height = stickerMessage.height || 512

    // 6. SEND DETAILED INFO
    await sock.sendMessage(from, {
      text: `╭─⌈ 📋 *STICKER INFO* ⌋
│ *Pack:* ${pack}
│ *Author:* ${author}
│ *Type:* ${isAnimated ? 'Animated 🎞️' : 'Static 🖼️'}
│ *Size:* ${width}x${height}px
│ *Format:* ${mimetype.split('/')[1].toUpperCase()}
│ *File:* ${fileSizeKB} KB
│ *Emojis:* ${emojis.length > 0 ? emojis.join(' ') : 'None'}
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })

    // 7. REACT DONE
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[GETEXIF ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *GetExif Failed* ⌋
│ ${error.message.includes('download') ? 'Download failed' : 'Metadata read failed'}
│ Usage: ${prefix}getexif [reply sticker]
│ Aliases: ${prefix}exif, ${prefix}sinfo
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}