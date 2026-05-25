// commands/sticker/wasted.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'

export const name = 'wasted'
export const alias = ['wst', 'gta']
export const category = 'Sticker'
export const desc = 'GTA Wasted effect sticker'

// API LIST - 7 TOTAL 🦁
const WASTED_APIS = [
  (url) => `https://some-random-api.com/canvas/wasted?avatar=${encodeURIComponent(url)}`,
  (url) => `https://api.popcat.xyz/wasted?image=${encodeURIComponent(url)}`,
  (url) => `https://api.dhamzxploit.my.id/api/canvas/wasted?url=${encodeURIComponent(url)}`,
  (url) => `https://api.erdwpe.com/api/maker/wasted?url=${encodeURIComponent(url)}`,
  (url) => `https://api.lolhuman.xyz/api/editor/wasted?apikey=GataDios&img=${encodeURIComponent(url)}`,
  (url) => `https://api.ryzendesu.vip/api/maker/wasted?url=${encodeURIComponent(url)}`,
  (url) => `https://api.botcahx.eu.org/api/maker/wasted?url=${encodeURIComponent(url)}`
]

async function fetchWastedBuffer(imageUrl) {
  for (let i = 0; i < WASTED_APIS.length; i++) {
    try {
      const url = WASTED_APIS[i](imageUrl)
      const res = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (res.data && res.status === 200) {
        console.log(`Wasted API ${i + 1} success`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(`Wasted API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Wasted APIs failed')
}

export default async function wasted(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. ADVANCED EYE LOGIC - kama sticker.js
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
      // Get profile pic kama hakuna image
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
│ Usage: ${prefix}wasted
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. UPLOAD TO GET URL - hii ndio fix ya render
    const imageUrl = await upload(buffer)

    // 6. GET WASTED IMAGE FROM API
    const wastedBuffer = await fetchWastedBuffer(imageUrl)

    // 7. CONVERT TO STICKER - FIXED FOR RENDER
    const sticker = new Sticker(wastedBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['💀', '🔫'],
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
    console.error('[WASTED ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Wasted Failed* ⌋
│ ${error.message.includes('API') ? 'All APIs are down' : 'Processing failed'}
│ Try again later
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}