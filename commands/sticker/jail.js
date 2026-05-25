// commands/sticker/jail.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'
import Jimp from 'jimp'

export const name = 'jail'
export const alias = ['prison', 'bars', 'jail1', 'jail2', 'jail3']
export const category = 'Sticker'
export const desc = 'Jail bars effect sticker - Upload first, Jimp fallback, RAM safe'

// API LIST - 16 TOTAL 🦁
const JAIL_APIS = [
  (url) => `https://some-random-api.com/canvas/jail?avatar=${encodeURIComponent(url)}`,
  (url) => `https://api.popcat.xyz/jail?image=${encodeURIComponent(url)}`,
  (url) => `https://api.dhamzxploit.my.id/api/canvas/jail?url=${encodeURIComponent(url)}`,
  (url) => `https://api.erdwpe.com/api/maker/jail?url=${encodeURIComponent(url)}`,
  (url) => `https://api.lolhuman.xyz/api/editor/jail?apikey=GataDios&img=${encodeURIComponent(url)}`,
  (url) => `https://api.botcahx.eu.org/api/maker/jail?url=${encodeURIComponent(url)}`,
  (url) => `https://api.ryzendesu.vip/api/maker/jail?url=${encodeURIComponent(url)}`,
  (url) => `https://api.zeeoneofc.my.id/api/jail?url=${encodeURIComponent(url)}`,
  (url) => `https://api.caliph.biz.id/api/jail?url=${encodeURIComponent(url)}`,
  (url) => `https://api.zahwazein.xyz/maker/jail?url=${encodeURIComponent(url)}`,
  (url) => `https://api.akuari.my.id/canvas/jail?url=${encodeURIComponent(url)}`,
  (url) => `https://api.xteam.xyz/jail?url=${encodeURIComponent(url)}`,
  (url) => `https://api-brunosobrino.zipponodes.xyz/api/jail?url=${encodeURIComponent(url)}`,
  (url) => `https://api.boxmine.xyz/api/jail?url=${encodeURIComponent(url)}`,
  (url) => `https://api.neoxr.eu/api/jail?url=${encodeURIComponent(url)}`,
  (url) => `https://api.siputzx.my.id/api/m/jail?url=${encodeURIComponent(url)}`
]

// JIMP LOCAL FALLBACK - RAM SAFE 0.1MB 🦁
async function createJailLocal(buffer) {
  const image = await Jimp.read(buffer)
  
  // RAM SAFE: Shrink to 256x256 = ~0.1MB
  image.resize(256, 256)
  image.quality(60) // Punguza quality kuokoa RAM
  
  // Create jail bars overlay
  const bars = new Jimp(256, 256, 0x00000000)
  const barWidth = 10
  const gap = 30
  
  for (let x = 0; x < 256; x += gap) {
    bars.scan(x, 0, barWidth, 256, function (px, py, idx) {
      this.bitmap.data[idx + 0] = 60  // R
      this.bitmap.data[idx + 1] = 60  // G  
      this.bitmap.data[idx + 2] = 60  // B
      this.bitmap.data[idx + 3] = 255 // A
    })
  }
  
  // Add horizontal bars
  bars.scan(0, 50, 256, 8, function (px, py, idx) {
    this.bitmap.data[idx + 0] = 60
    this.bitmap.data[idx + 1] = 60
    this.bitmap.data[idx + 2] = 60
    this.bitmap.data[idx + 3] = 255
  })
  bars.scan(0, 200, 256, 8, function (px, py, idx) {
    this.bitmap.data[idx + 0] = 60
    this.bitmap.data[idx + 1] = 60
    this.bitmap.data[idx + 2] = 60
    this.bitmap.data[idx + 3] = 255
  })
  
  image.composite(bars, 0, 0)
  return await image.getBufferAsync(Jimp.MIME_PNG)
}

// FETCH: UPLOAD + API FIRST, JIMP FALLBACK
async function fetchJailBuffer(buffer) {
  // 1. TRY UPLOAD + APIs FIRST
  try {
    console.log('Trying upload + APIs')
    const imageUrl = await upload(buffer)
    
    for (let i = 0; i < JAIL_APIS.length; i++) {
      try {
        const url = JAIL_APIS[i](imageUrl)
        const res = await axios.get(url, { 
          responseType: 'arraybuffer',
          timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })

        if (res.data && res.status === 200 && res.data.byteLength > 1000) {
          console.log(`Jail API ${i + 1} success`)
          return Buffer.from(res.data)
        }
      } catch (err) {
        console.log(`Jail API ${i + 1} failed: ${err.message}`)
        continue
      }
    }
  } catch (err) {
    console.log(`Upload/APIs failed: ${err.message}`)
  }

  // 2. FALLBACK TO LOCAL JIMP - RAM SAFE
  console.log('Falling back to local Jimp')
  return await createJailLocal(buffer)
}

export default async function jail(sock, { msg, from }, botSettings) {
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
│ Usage: ${prefix}jail
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. GET JAIL IMAGE - UPLOAD FIRST, JIMP FALLBACK
    const jailBuffer = await fetchJailBuffer(buffer)

    // 6. CONVERT TO STICKER - RAM SAFE
    const sticker = new Sticker(jailBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['🔒', '⛓️'],
      quality: 60, // Punguza quality kuokoa RAM
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
    console.error('[JAIL ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Jail Failed* ⌋
│ All methods failed
│ Usage: ${prefix}jail [reply picha/mtu]
│ Aliases: ${prefix}prison, ${prefix}bars
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}