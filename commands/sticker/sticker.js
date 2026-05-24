// commands/sticker/sticker.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

export const name = 'sticker'
export const alias = ['s', 'stiker']
export const category = 'Sticker'
export const desc = 'Convert image/video to sticker'

export default async function sticker(sock, { msg, from }, botSettings) {
  try {
    // 1. Get quoted message or current message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const message = quoted || msg.message
    
    if (!message) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return
    }

    // 2. Check if media exists
    const isImage = message.imageMessage
    const isVideo = message.videoMessage
    
    if (!isImage &&!isVideo) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return
    }

    // 3. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 4. Download media
    const buffer = await downloadMediaMessage(
      { message: quoted? { message: quoted } : msg },
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

    // 5. Create sticker
    const sticker = new Sticker(buffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: isVideo? StickerTypes.FULL : StickerTypes.DEFAULT,
      categories: ['🤖'],
      quality: 50
    })

    const stickerBuffer = await sticker.toBuffer()

    // 6. Send sticker
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 7. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[STICKER ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
  }
}