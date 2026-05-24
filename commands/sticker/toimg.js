// commands/sticker/toimg.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { webp2png } from '../lib/converter.js'

export const name = 'toimg'
export const alias = ['toimage', 'topng']
export const category = 'Sticker'
export const desc = 'Convert sticker to image'

export default async function toimg(sock, { msg, from }, botSettings) {
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

    // 5. Convert webp to png
    const imageBuffer = await webp2png(buffer)

    // 6. Send as image
    await sock.sendMessage(from, {
      image: imageBuffer,
      caption: `╭─⌈ 🖼️ *STICKER TO IMAGE* ⌋
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })

    // 7. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[TOIMG ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
  }
}