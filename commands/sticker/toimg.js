// commands/sticker/toimg.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'

export const name = 'toimg'
export const alias = ['toimage', 'topng', 'picha']
export const category = 'Sticker'
export const desc = 'Convert sticker to image'

export default async function toimg(sock, { msg, from }) {
  try {
    // 1. Get quoted or direct sticker message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const stickerMessage = msg.message?.stickerMessage || quoted?.stickerMessage

    if (!stickerMessage) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, { 
        text: 'Reply to a sticker to convert it to an image.' 
      }, { quoted: msg })
    }

    // 2. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 3. Download sticker buffer directly
    const buffer = await downloadMediaMessage(
      { message: { stickerMessage } },
      'buffer',
      {},
      { logger: console }
    )

    if (!buffer) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, { 
        text: 'Failed to download sticker.' 
      }, { quoted: msg })
    }

    // 4. Send as image - WhatsApp handles webp automatically
    await sock.sendMessage(from, {
      image: buffer,
      caption: `╭─⌈ 🖼️ *STICKER TO IMAGE* ⌋
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })

    // 5. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[TOIMG ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, { 
      text: `Error: ${error.message}` 
    }, { quoted: msg })
  }
}