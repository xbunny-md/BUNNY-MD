// commands/sticker/comrade.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'

export const name = 'comrade'
export const alias = ['ussr', 'communist', 'red', 'soviet']
export const category = 'Sticker'
export const desc = 'Comrade/Communist effect sticker - 16+ API fallback'

// API LIST - 16 TOTAL 🦁
const COMRADE_APIS = [
  (url) => `https://some-random-api.com/canvas/comrade?avatar=${encodeURIComponent(url)}`,
  (url) => `https://api.popcat.xyz/comrade?image=${encodeURIComponent(url)}`,
  (url) => `https://api.dhamzxploit.my.id/api/canvas/comrade?url=${encodeURIComponent(url)}`,
  (url) => `https://api.erdwpe.com/api/maker/comrade?url=${encodeURIComponent(url)}`,
  (url) => `https://api.lolhuman.xyz/api/editor/comrade?apikey=GataDios&img=${encodeURIComponent(url)}`,
  (url) => `https://api.botcahx.eu.org/api/maker/comrade?url=${encodeURIComponent(url)}`,
  (url) => `https://api.ryzendesu.vip/api/maker/comrade?url=${encodeURIComponent(url)}`,
  (url) => `https://api.zeeoneofc.my.id/api/comrade?url=${encodeURIComponent(url)}`,
  (url) => `https://api.caliph.biz.id/api/comrade?url=${encodeURIComponent(url)}`,
  (url) => `https://api.zahwazein.xyz/maker/comrade?url=${encodeURIComponent(url)}`,
  (url) => `https://api.akuari.my.id/canvas/comrade?url=${encodeURIComponent(url)}`,
  (url) => `https://api.xteam.xyz/comrade?url=${encodeURIComponent(url)}`,
  (url) => `https://api-brunosobrino.zipponodes.xyz/api/comrade?url=${encodeURIComponent(url)}`,
  (url) => `https://api.boxmine.xyz/api/comrade?url=${encodeURIComponent(url)}`,
  (url) => `https://api.neoxr.eu/api/comrade?url=${encodeURIComponent(url)}`,
  (url) => `https://api.siputzx.my.id/api/m/comrade?url=${encodeURIComponent(url)}`
]

async function fetchComradeBuffer(imageUrl) {
  for (let i = 0; i < COMRADE_APIS.length; i++) {
    try {
      const url = COMRADE_APIS[i](imageUrl)
      const res = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (res.data && res.status === 200 && res.data.byteLength > 1000) {
        console.log(`Comrade API ${i + 1} success`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(`Comrade API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Comrade APIs failed')
}

export default async function comrade(sock, { msg, from }, botSettings) {
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
│ Usage: ${prefix}comrade
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. UPLOAD TO GET URL - TECHNICAL DEPENDENCY
    const imageUrl = await upload(buffer)

    // 6. GET COMRADE IMAGE FROM API - 16 FALLBACKS
    const comradeBuffer = await fetchComradeBuffer(imageUrl)

    // 7. CONVERT TO STICKER - RENDER SAFE
    const sticker = new Sticker(comradeBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['☭', '🔴'],
      quality: 80,
      id: Date.now().toString()
    })

    const stickerBuffer = await sticker.toBuffer()

    // 8. SEND STICKER
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 9. REACT DONE
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[COMRADE ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Comrade Failed* ⌋
│ ${error.message.includes('API') ? 'All 16 APIs are down' : 'Processing failed'}
│ Usage: ${prefix}comrade [reply picha/mtu]
│ Aliases: ${prefix}ussr, ${prefix}red
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}