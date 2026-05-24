// commands/sticker/trigger.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'

export const name = 'trigger'
export const alias = ['triggered', 'trig']
export const category = 'Sticker'
export const desc = 'Triggered meme effect sticker'

// API LIST - 8 TOTAL 🦁
const TRIGGER_APIS = [
  (url) => `https://api.popcat.xyz/triggered?image=${encodeURIComponent(url)}`,
  (url) => `https://some-random-api.com/canvas/triggered?avatar=${encodeURIComponent(url)}`,
  (url) => `https://api.dhamzxploit.my.id/api/canvas/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://api.erdwpe.com/api/maker/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://api.lolhuman.xyz/api/editor/triggered?apikey=GataDios&img=${encodeURIComponent(url)}`,
  (url) => `https://api.ryzendesu.vip/api/maker/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://api.zeeoneofc.my.id/api/triggered?url=${encodeURIComponent(url)}`,
  (url) => `https://api.botcahx.eu.org/api/maker/triggered?url=${encodeURIComponent(url)}`
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
      
      if (res.data && res.status === 200) {
        console.log(` Trigger Success API ${i + 1}`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(` Trigger API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Trigger APIs failed')
}

export default async function trigger(sock, { msg, from }, botSettings) {
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
      return
    }

    // 5. Upload to get URL
    const imageUrl = await upload(buffer)

    // 6. Get triggered gif
    const triggerBuffer = await fetchTriggerBuffer(imageUrl)

    // 7. Convert to sticker
    const sticker = new Sticker(triggerBuffer, {
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
    console.error('[TRIGGER ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
  }
}