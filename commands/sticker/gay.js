// commands/sticker/gay.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import Jimp from 'jimp'

export const name = 'sgay'
export const alias = ['rainbow', 'pride', 'lgbt', 'gay1']
export const category = 'Sticker'
export const desc = 'Rainbow Gay/Pride effect sticker - Local + 16 API fallback'

// LOCAL RAINBOW EFFECT - IJITEGEMEE 🦁
async function createGayLocal(buffer) {
  const image = await Jimp.read(buffer)
  const { width, height } = image.bitmap
  
  // Resize to square 512x512 for sticker
  image.resize(512, 512)
  
  // Create rainbow overlay
  const rainbow = new Jimp(512, 512)
  const colors = [
    0xFF000080, // Red 50% opacity
    0xFF7F0080, // Orange 50% opacity  
    0xFFFF0080, // Yellow 50% opacity
    0x00FF0080, // Green 50% opacity
    0x0000FF80, // Blue 50% opacity
    0x4B008280  // Violet 50% opacity
  ]
  
  const stripeHeight = Math.ceil(512 / colors.length)
  colors.forEach((color, i) => {
    rainbow.scan(0, i * stripeHeight, 512, stripeHeight, function (x, y, idx) {
      this.bitmap.data[idx + 0] = (color >> 24) & 255 // R
      this.bitmap.data[idx + 1] = (color >> 16) & 255 // G
      this.bitmap.data[idx + 2] = (color >> 8) & 255  // B
      this.bitmap.data[idx + 3] = color & 255         // A
    })
  })
  
  // Composite rainbow over image
  image.composite(rainbow, 0, 0, {
    mode: Jimp.BLEND_OVERLAY,
    opacitySource: 0.5,
    opacityDest: 1
  })
  
  return await image.getBufferAsync(Jimp.MIME_PNG)
}

// API LIST - 16 TOTAL - Using Base64 Data URL 🦁
const GAY_APIS = [
  (url) => `https://some-random-api.com/canvas/gay?avatar=${encodeURIComponent(url)}`,
  (url) => `https://api.popcat.xyz/gay?image=${encodeURIComponent(url)}`,
  (url) => `https://api.dhamzxploit.my.id/api/canvas/gay?url=${encodeURIComponent(url)}`,
  (url) => `https://api.erdwpe.com/api/maker/gay?url=${encodeURIComponent(url)}`,
  (url) => `https://api.lolhuman.xyz/api/editor/gay?apikey=GataDios&img=${encodeURIComponent(url)}`,
  (url) => `https://api.botcahx.eu.org/api/maker/gay?url=${encodeURIComponent(url)}`,
  (url) => `https://api.ryzendesu.vip/api/maker/gay?url=${encodeURIComponent(url)}`,
  (url) => `https://api.zeeoneofc.my.id/api/gay?url=${encodeURIComponent(url)}`,
  (url) => `https://api.caliph.biz.id/api/gay?url=${encodeURIComponent(url)}`,
  (url) => `https://api.zahwazein.xyz/maker/gay?url=${encodeURIComponent(url)}`,
  (url) => `https://api.akuari.my.id/canvas/gay?url=${encodeURIComponent(url)}`,
  (url) => `https://api.xteam.xyz/gay?url=${encodeURIComponent(url)}`,
  (url) => `https://api-brunosobrino.zipponodes.xyz/api/gay?url=${encodeURIComponent(url)}`,
  (url) => `https://api.boxmine.xyz/api/gay?url=${encodeURIComponent(url)}`,
  (url) => `https://api.neoxr.eu/api/gay?url=${encodeURIComponent(url)}`,
  (url) => `https://api.siputzx.my.id/api/m/gay?url=${encodeURIComponent(url)}`
]

async function fetchGayBuffer(buffer) {
  // 1. TRY LOCAL FIRST - NO UPLOAD NEEDED
  try {
    console.log('Trying local rainbow effect')
    return await createGayLocal(buffer)
  } catch (err) {
    console.log(`Local effect failed: ${err.message}`)
  }

  // 2. FALLBACK TO APIs using Base64 Data URL
  const base64 = `data:image/png;base64,${buffer.toString('base64')}`
  
  for (let i = 0; i < GAY_APIS.length; i++) {
    try {
      const url = GAY_APIS[i](base64)
      const res = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (res.data && res.status === 200 && res.data.byteLength > 1000) {
        console.log(`Gay API ${i + 1} success`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(`Gay API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Gay methods failed')
}

export default async function gay(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. ADVANCED EYE LOGIC - viewOnce included
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const mediaMessage = msg.message?.imageMessage || 
                         msg.message?.stickerMessage ||
                         quoted?.imageMessage || 
                         quoted?.stickerMessage ||
                         quoted?.viewOnceMessageV2?.message?.imageMessage ||
                         quoted?.viewOnceMessageV2?.message?.stickerMessage ||
                         quoted?.viewOnceMessage?.message?.imageMessage ||
                         quoted?.viewOnceMessage?.message?.stickerMessage

    let targetJid = msg.key.participant || msg.key.remoteJid
    let targetMsg = msg

    // 2. SET TARGET IF QUOTED EXISTS
    if (quoted && (quoted.imageMessage || quoted.stickerMessage || quoted.viewOnceMessageV2 || quoted.viewOnceMessage)) {
      const quotedInfo = msg.message?.extendedTextMessage?.contextInfo
      targetMsg = { 
        message: quoted, 
        key: { 
          remoteJid: from, 
          id: quotedInfo.stanzaId, 
          participant: quotedInfo.participant 
        } 
      }
      targetJid = quotedInfo.participant || quotedInfo.remoteJid || from
    }

    // 3. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 4. DOWNLOAD MEDIA OR GET PROFILE PIC
    let buffer
    if (mediaMessage) {
      buffer = await downloadMediaMessage(
        targetMsg,
        'buffer',
        {},
        { logger: console }
      )
    } else {
      try {
        const ppUrl = await sock.profilePictureUrl(targetJid, 'image')
        const res = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 8000 })
        buffer = Buffer.from(res.data)
      } catch {
        const res = await axios.get('https://i.ibb.co/2dH8p5Z/profile.jpg', { responseType: 'arraybuffer' })
        buffer = Buffer.from(res.data)
      }
    }

    if (!buffer || buffer.length === 0) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *Error* ⌋
│ Failed to get image
│ Reply to an image/sticker or tag someone
│ Usage: ${prefix}gay
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. GET GAY IMAGE - LOCAL FIRST, THEN API FALLBACK
    const gayBuffer = await fetchGayBuffer(buffer)

    // 6. CONVERT TO STICKER - RENDER SAFE
    const sticker = new Sticker(gayBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['🏳️‍🌈', '🌈'],
      quality: 80,
      id: Date.now().toString()
    })

    const stickerBuffer = await sticker.toBuffer()

    // 7. SEND STICKER
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 8. REACT DONE
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[GAY ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Gay Failed* ⌋
│ ${error.message.includes('methods') ? 'All methods failed' : 'Processing failed'}
│ Usage: ${prefix}gay [reply picha/mtu]
│ Aliases: ${prefix}rainbow, ${prefix}pride
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}