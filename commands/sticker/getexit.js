// commands/sticker/getexif.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { extractMetadata } from 'wa-sticker-formatter'

export const name = 'getexif'
export const alias = ['exif', 'stickerinfo']
export const category = 'Sticker'
export const desc = 'Get sticker packname and author'

export default async function getexif(sock, { msg, from }, botSettings) {
  try {
    // 1. Get quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    
    if (!quoted) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return
    }

    // 2. Check if sticker
    const isSticker = quoted.stickerMessage
    
    if (!isSticker) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return
    }

    // 3. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 4. Download sticker
    const buffer = await downloadMediaMessage(
      { message: { message: quoted } },
      'buffer',
      {},
      { logger: console }
    )

    if (!buffer) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return
    }

    // 5. Extract metadata
    const metadata = await extractMetadata(buffer)
    
    const pack = metadata['sticker-pack-name'] || 'Unknown'
    const author = metadata['sticker-pack-publisher'] || 'Unknown'
    const emojis = metadata['emojis'] || []
    const isAnimated = quoted.stickerMessage.isAnimated || false

    // 6. Send info
    await sock.sendMessage(from, {
      text: `╭─⌈ 📋 *STICKER INFO* ⌋
│ Pack: ${pack}
│ Author: ${author}
│ Type: ${isAnimated ? 'Animated' : 'Static'}
│ Emojis: ${emojis.length > 0 ? emojis.join(' ') : 'None'}
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })

    // 7. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[GETEXIF ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
  }
}