// commands/sticker/comrade.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'

export const name = 'comrade'
export const alias = ['ussr', 'communist', 'red', 'soviet']
export const category = 'Sticker'
export const desc = 'Comrade/Communist effect sticker - 15+ API fallback'

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
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      
      if (res.data && res.status === 200) {
        console.log(` Comrade Success API ${i + 1}`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(` Comrade API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Comrade APIs failed')
}

export default async function comrade(sock, { msg, from }, botSettings) {
  try {
    // 1. Get quoted message or sender
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    let targetMsg = msg
    let targetJid = msg.key.participant || msg.key.remoteJid
    
    if (quoted?.quotedMessage) {
      targetMsg = { 
        message: quoted.quotedMessage, 
        key: { 
          remoteJid: from, 
          id: quoted.stanzaId, 
          participant: quoted.participant 
        } 
      }
      targetJid = quoted.participant || quoted.remoteJid
    }

    // 2. Check if image/sticker
    const isImage = targetMsg.message?.imageMessage
    const isSticker = targetMsg.message?.stickerMessage

    // 3. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 4. Download media
    let buffer
    if (isImage || isSticker) {
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
        const res = await axios.get(ppUrl, { responseType: 'arraybuffer' })
        buffer = Buffer.from(res.data)
      } catch {
        const res = await axios.get('https://i.ibb.co/2dH8p5Z/profile.jpg', { responseType: 'arraybuffer' })
        buffer = Buffer.from(res.data)
      }
    }

    if (!buffer) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, { 
        text: `> ❌ Image not found. Reply picha/sticker au tag mtu\n> Example: .comrade` 
      }, { quoted: msg })
    }

    // 5. Upload to get URL
    const imageUrl = await upload(buffer)

    // 6. Get comrade image
    const comradeBuffer = await fetchComradeBuffer(imageUrl)

    // 7. Convert to sticker
    const sticker = new Sticker(comradeBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['🤖'],
      quality: 50
    })

    const stickerBuffer = await sticker.toBuffer()

    // 8. Send sticker
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 9. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[COMRADE ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, { 
      text: `> ❌ Failed. Use: .comrade [reply picha/mtu]\n> Aliases: .ussr, .communist, .red, .soviet` 
    }, { quoted: msg })
  }
}