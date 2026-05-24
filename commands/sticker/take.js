// commands/sticker/take.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

export const name = 'take'
export const alias = ['steal', 'wm', 'exif']
export const category = 'Sticker'
export const desc = 'Steal sticker and change pack/author'

export default async function take(sock, { msg, from }, botSettings) {
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

    // 5. Check if animated
    const isAnimated = quoted.stickerMessage.isAnimated || false

    // 6. Create new sticker with new exif
    const sticker = new Sticker(buffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: isAnimated ? StickerTypes.FULL : StickerTypes.DEFAULT,
      categories: ['🤖'],
      quality: 50
    })

    const stickerBuffer = await sticker.toBuffer()

    // 7. Send sticker
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 8. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[TAKE ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
  }
}