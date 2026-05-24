// commands/sticker/gay.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'

export const name = 'gay'
export const alias = ['rainbow', 'pride', 'lgbt', 'gay1']
export const category = 'Sticker'
export const desc = 'Rainbow Gay/Pride effect sticker - 15+ API fallback'

// API LIST - 16 TOTAL 🦁
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

async function fetchGayBuffer(imageUrl) {
  for (let i = 0; i < GAY_APIS.length; i++) {
    try {
      const url = GAY_APIS[i](imageUrl)
      const res = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      
      if (res.data && res.status === 200) {
        console.log(` Gay Success API ${i + 1}`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(` Gay API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Gay APIs failed')
}

export default async function gay(sock, { msg, from }, botSettings) {
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
        text: `> ❌ Image not found. Reply picha/sticker au tag mtu\n> Example: .gay` 
      }, { quoted: msg })
    }

    // 5. Upload to get URL
    const imageUrl = await upload(buffer)

    // 6. Get gay image
    const gayBuffer = await fetchGayBuffer(imageUrl)

    // 7. Convert to sticker
    const sticker = new Sticker(gayBuffer, {
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
    console.error('[GAY ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, { 
      text: `> ❌ Failed. Use: .gay [reply picha/mtu]\n> Aliases: .rainbow, .pride, .lgbt` 
    }, { quoted: msg })
  }
}