// commands/sticker/smeme.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import sharp from 'sharp'

export const name = 'smeme'
export const alias = ['stickermeme', 'memesticker']
export const category = 'Sticker'
export const desc = 'Add text to sticker meme style'

export default async function smeme(sock, { msg, from }, botSettings) {
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

    // 3. Get text
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const text = body.trim().split(' ').slice(1).join(' ')
    
    if (!text) {
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

    // 6. Split text for top/bottom
    const [topText, bottomText] = text.split('|')
    const top = topText?.trim() || ''
    const bottom = bottomText?.trim() || ''

    // 7. Create meme image
    const image = sharp(buffer)
    const { width, height } = await image.metadata()
    
    const svgText = `
    <svg width="${width}" height="${height}">
      <style>
        .text { 
          fill: white; 
          font-size: ${Math.floor(width / 12)}px; 
          font-family: Impact, Arial Black, sans-serif; 
          font-weight: 900;
          text-anchor: middle; 
          stroke: black; 
          stroke-width: ${Math.floor(width / 100)}px;
          paint-order: stroke fill;
        }
      </style>
      ${top ? `<text x="50%" y="10%" class="text">${top.toUpperCase()}</text>` : ''}
      ${bottom ? `<text x="50%" y="95%" class="text">${bottom.toUpperCase()}</text>` : ''}
    </svg>
    `

    const memeBuffer = await image
      .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
      .png()
      .toBuffer()

    // 8. Convert to sticker
    const sticker = new Sticker(memeBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['🤖'],
      quality: 50
    })

    const stickerBuffer = await sticker.toBuffer()

    // 9. Send sticker
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 10. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[SMEME ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
  }
}