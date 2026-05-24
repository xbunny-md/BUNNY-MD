// commands/sticker/tovideo.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { webp2mp4 } from '../lib/converter.js'

export const name = 'tovideo'
export const alias = ['tomp4', 'togif']
export const category = 'Sticker'
export const desc = 'Convert animated sticker to video'

export default async function tovideo(sock, { msg, from }, botSettings) {
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

    // 3. Check if animated
    if (!quoted.stickerMessage.isAnimated) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return
    }

    // 4. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 5. Download sticker
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

    // 6. Convert webp to mp4
    const videoBuffer = await webp2mp4(buffer)

    // 7. Send as video
    await sock.sendMessage(from, {
      video: videoBuffer,
      caption: `╭─⌈ 🎬 *STICKER TO VIDEO* ⌋
╰⊷ *Powered By Bunny Tech*`,
      gifPlayback: true
    }, { quoted: msg })

    // 8. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[TOVIDEO ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
  }
}