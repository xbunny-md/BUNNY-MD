// commands/sticker/sticker.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

export const name = 'sticker'
export const alias = ['s', 'stiker', 'wm']
export const category = 'Sticker'
export const desc = 'Convert image/video to sticker with custom pack'

export default async function sticker(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. ADVANCED MEDIA DETECTION - captures everything like CommonJS version
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const mediaMessage = msg.message?.imageMessage || 
                         msg.message?.videoMessage ||
                         quoted?.imageMessage || 
                         quoted?.videoMessage ||
                         quoted?.viewOnceMessageV2?.message?.imageMessage ||
                         quoted?.viewOnceMessageV2?.message?.videoMessage ||
                         quoted?.viewOnceMessage?.message?.imageMessage ||
                         quoted?.viewOnceMessage?.message?.videoMessage

    if (!mediaMessage) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `Reply to an image or video to create a sticker. Usage: ${prefix}s`
      }, { quoted: msg })
    }

    // 2. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 3. Download media - works for direct, quoted, and viewOnce
    const buffer = await downloadMediaMessage(
      { message: { [mediaMessage.videoMessage ? 'videoMessage' : 'imageMessage']: mediaMessage } },
      'buffer',
      {},
      { logger: console }
    )

    if (!buffer) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: 'Failed to download media.'
      }, { quoted: msg })
    }

    // 4. Create sticker with custom WM
    const isVideo = !!mediaMessage.videoMessage
    const sticker = new Sticker(buffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['🤖', '🎉'],
      quality: 70
    })

    const stickerBuffer = await sticker.toBuffer()

    // 5. Send sticker
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 6. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[STICKER ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, {
      text: `Error: ${error.message}`
    }, { quoted: msg })
  }
}