// commands/sticker/take.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

export const name = 'take'
export const alias = ['steal', 'wm', 'exif']
export const category = 'Sticker'
export const desc = 'Steal sticker and change pack/author with custom text'

export default async function take(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. ADVANCED MEDIA DETECTION - viewOnce included
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const stickerMessage = msg.message?.stickerMessage || 
                           quoted?.stickerMessage ||
                           quoted?.viewOnceMessageV2?.message?.stickerMessage ||
                           quoted?.viewOnceMessage?.message?.stickerMessage

    if (!stickerMessage) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📦 *Take Sticker* ⌋
│ Reply to a sticker to steal it
│
│ *Usage:*
│ ${prefix}take - Steal with default WM
│ ${prefix}take PackName | AuthorName
│
│ *Example:*
│ ${prefix}take Bunny | Lupin
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 2. PARSE CUSTOM PACK/AUTHOR FROM ARGS
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1).join(' ')
    let pack = 'BUNNY-MD'
    let author = 'Lupin Starnley'

    if (args) {
      const split = args.split('|').map(s => s.trim())
      if (split[0]) pack = split[0].slice(0, 64) // WhatsApp limit
      if (split[1]) author = split[1].slice(0, 64)
    }

    // 3. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 4. BUILD TARGET MSG CORRECTLY - hii ndio fix kuu
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo
    const targetMsg = quotedInfo?.quotedMessage ? {
      message: quoted,
      key: {
        remoteJid: from,
        id: quotedInfo.stanzaId,
        participant: quotedInfo.participant
      }
    } : msg

    // 5. DOWNLOAD STICKER BUFFER
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

    // 6. DETECT IF ANIMATED - MODERN WAY
    const isAnimated = stickerMessage.isAnimated || 
                       stickerMessage.mimetype?.includes('webp') && buffer.toString('hex', 0, 4) === '52494646'

    // 7. CREATE NEW STICKER WITH CUSTOM EXIF
    const sticker = new Sticker(buffer, {
      pack: pack,
      author: author,
      type: isAnimated ? StickerTypes.FULL : StickerTypes.CROPPED,
      categories: ['🤖', '🎭'],
      quality: 80,
      id: Date.now().toString() // Unique ID
    })

    const stickerBuffer = await sticker.toBuffer()

    // 8. SEND STICKER
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 9. REACT DONE
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[TAKE ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Take Failed* ⌋
│ ${error.message.includes('download') ? 'Download failed' : 'Processing failed'}
│ Try with different sticker
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}