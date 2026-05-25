// commands/sticker/trigger.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'

export const name = 'trigger'
export const alias = ['triggered', 'trig']
export const category = 'Sticker'
export const desc = 'Triggered meme effect sticker'

// API LIST - 15 TOTAL FOR MAXIMUM UPTIME 🦁
const TRIGGER_APIS = [
  (url) => `https://api.popcat.xyz/triggered?image=${encodeURIComponent(url)}`,
  (url) => `https://some-random-api.com/canvas/triggered?avatar=${encodeURIComponent(url)}`,
  (url) => `https://api.dhamzxploit.my.id/api/canvas/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://api.erdwpe.com/api/maker/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://api.lolhuman.xyz/api/editor/triggered?apikey=GataDios&img=${encodeURIComponent(url)}`,
  (url) => `https://api.ryzendesu.vip/api/maker/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://api.zeeoneofc.my.id/api/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://api.botcahx.eu.org/api/maker/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://api.caliph.my.id/api/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://api.xteam.xyz/triggered?url=${encodeURIComponent(url)}&apikey=YOURKEY`,
  (url) => `https://api-fgmods.ddns.net/api/maker/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://api-fgmods.ddns.net/api/canvas/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://skizo.tech/api/triggered?apikey=YOURKEY&url=${encodeURIComponent(url)}`,
  (url) => `https://api.vreden.my.id/api/maker/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://api.siputzx.my.id/api/m/triggered?url=${encodeURIComponent(url)}`
]

async function fetchTriggerBuffer(imageUrl) {
  for (let i = 0; i < TRIGGER_APIS.length; i++) {
    try {
      const url = TRIGGER_APIS[i](imageUrl)
      const res = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (res.data && res.status === 200 && res.data.byteLength > 1000) {
        console.log(`Trigger API ${i + 1} success`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(`Trigger API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Trigger APIs failed')
}

export default async function trigger(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. ADVANCED EYE LOGIC - captures everything
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
│ Usage: ${prefix}trigger
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. UPLOAD TO GET URL - TECHNICAL DEPENDENCY FOR STABILITY
    const imageUrl = await upload(buffer)

    // 6. GET TRIGGERED GIF FROM API - 15 FALLBACKS
    const triggerBuffer = await fetchTriggerBuffer(imageUrl)

    // 7. CONVERT TO STICKER - RENDER SAFE
    const sticker = new Sticker(triggerBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['😡', '🔥'],
      quality: 70
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
    console.error('[TRIGGER ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Trigger Failed* ⌋
│ ${error.message.includes('API') ? 'All 15 APIs are down' : 'Processing failed'}
│ Try again later
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}