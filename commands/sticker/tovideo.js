// commands/sticker/tovideo.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'

export const name = 'tovideo'
export const alias = ['tomp4', 'togif']
export const category = 'Sticker'
export const desc = 'Convert animated sticker to video'

export default async function tovideo(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix // DYNAMIC PREFIX

  try {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const stickerMessage = msg.message?.stickerMessage || quoted?.stickerMessage

    if (!stickerMessage) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: 'Reply to a sticker to convert it to video.'
      }, { quoted: msg })
    }

    if (!stickerMessage.isAnimated) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `This sticker is not animated. Use ${prefix}toimg for static stickers.`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

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

    await sock.sendMessage(from, {
      video: buffer,
      caption: `╭─⌈ 🎬 *STICKER TO VIDEO* ⌋
╰⊷ *Powered By Bunny Tech*`,
      gifPlayback: true
    }, { quoted: msg })

    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[TOVIDEO ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, {
      text: `Error: ${error.message}`
    }, { quoted: msg })
  }
}