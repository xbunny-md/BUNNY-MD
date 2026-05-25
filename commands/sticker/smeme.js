// commands/sticker/smeme.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import sharp from 'sharp'

export const name = 'smeme'
export const alias = ['stickermeme', 'memesticker', 'sm']
export const category = 'Sticker'
export const desc = 'Add text to sticker meme style - Top|Bottom'

export default async function smeme(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. GET TEXT FIRST
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const text = body.trim().split(' ').slice(1).join(' ')

    // 2. ADVANCED STICKER DETECTION - viewOnce included
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const stickerMessage = quoted?.stickerMessage ||
                           quoted?.viewOnceMessageV2?.message?.stickerMessage ||
                           quoted?.viewOnceMessage?.message?.stickerMessage

    // 3. HELP IF NO STICKER OR NO TEXT
    if (!stickerMessage || !text) {
      await sock.sendMessage(from, { react: { text: '🖼️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🖼️ *Sticker Meme* ⌋
│ Add top and bottom text to sticker
│
│ *Usage:*
│ Reply to sticker + ${prefix}smeme top|bottom
│ ${prefix}smeme top text only
│ ${prefix}smeme |bottom text only
│
│ *Examples:*
│ ${prefix}smeme WHEN YOU|REALIZE
│ ${prefix}smeme TOP TEXT
│ ${prefix}smeme |BOTTOM ONLY
│
│ *Supports:*
│ • Static stickers
│ • ViewOnce stickers
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 4. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 5. BUILD TARGET MSG CORRECTLY
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo
    const targetMsg = {
      message: quoted,
      key: {
        remoteJid: from,
        id: quotedInfo.stanzaId,
        participant: quotedInfo.participant
      }
    }

    // 6. DOWNLOAD STICKER
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

    // 7. SPLIT TEXT FOR TOP/BOTTOM - SAFE HANDLING
    const [topText, bottomText] = text.split('|')
    const top = (topText?.trim() || '').slice(0, 50) // Limit 50 chars
    const bottom = (bottomText?.trim() || '').slice(0, 50)

    if (!top && !bottom) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *No Text* ⌋
│ Add text after command
│ Usage: ${prefix}smeme top|bottom
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 8. CREATE MEME IMAGE - RAM SAFE
    const image = sharp(buffer)
    const metadata = await image.metadata()
    const width = metadata.width || 512
    const height = metadata.height || 512

    // Resize if too large - RAM SAFE
    if (width > 512 || height > 512) {
      image.resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    }

    const finalWidth = Math.min(width, 512)
    const finalHeight = Math.min(height, 512)
    const fontSize = Math.max(20, Math.floor(finalWidth / 12))
    const strokeWidth = Math.max(2, Math.floor(finalWidth / 80))

    // Escape HTML entities
    const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const svgText = `
    <svg width="${finalWidth}" height="${finalHeight}">
      <style>
        .text { 
          fill: white; 
          font-size: ${fontSize}px; 
          font-family: Impact, 'Arial Black', sans-serif; 
          font-weight: 900;
          text-anchor: middle; 
          stroke: black; 
          stroke-width: ${strokeWidth}px;
          paint-order: stroke fill;
        }
      </style>
      ${top ? `<text x="50%" y="${fontSize + 10}" class="text">${escapeHtml(top.toUpperCase())}</text>` : ''}
      ${bottom ? `<text x="50%" y="${finalHeight - 15}" class="text">${escapeHtml(bottom.toUpperCase())}</text>` : ''}
    </svg>
    `

    const memeBuffer = await image
      .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
      .png({ quality: 80, compressionLevel: 9 })
      .toBuffer()

    // 9. CONVERT TO STICKER - RAM SAFE
    const sticker = new Sticker(memeBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['😂', '🔥'],
      quality: 70,
      id: Date.now().toString()
    })

    const stickerBuffer = await sticker.toBuffer()

    // 10. SEND STICKER
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 11. REACT DONE
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[SMEME ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Smeme Failed* ⌋
│ ${error.message.includes('download') ? 'Download failed' : 'Processing failed'}
│ Usage: ${prefix}smeme top|bottom
│ Example: ${prefix}smeme WHEN|REALIZE
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}