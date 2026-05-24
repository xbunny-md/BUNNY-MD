// commands/sticker/memegen.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'

export const name = 'memegen'
export const alias = ['meme', 'smeme', 'stickermeme', 'caption']
export const category = 'Sticker'
export const desc = 'Generate meme sticker with top/bottom text - 15+ API fallback'

// API LIST - 16 TOTAL 🦁
const MEME_APIS = [
  (url, top, bottom) => `https://api.memegen.link/images/custom/${encodeURIComponent(top)}/${encodeURIComponent(bottom)}.png?background=${encodeURIComponent(url)}`,
  (url, top, bottom) => `https://api.popcat.xyz/meme?image=${encodeURIComponent(url)}&top=${encodeURIComponent(top)}&bottom=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.lolhuman.xyz/api/editor/memegen?apikey=GataDios&img=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.erdwpe.com/api/maker/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.botcahx.eu.org/api/maker/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.ryzendesu.vip/api/maker/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.zeeoneofc.my.id/api/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.caliph.biz.id/api/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.zahwazein.xyz/maker/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.akuari.my.id/canvas/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.xteam.xyz/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api-brunosobrino.zipponodes.xyz/api/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.boxmine.xyz/api/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.neoxr.eu/api/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.siputzx.my.id/api/m/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`,
  (url, top, bottom) => `https://api.dhamzxploit.my.id/api/canvas/memegen?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(top)}&text2=${encodeURIComponent(bottom)}`
]

async function fetchMemeBuffer(imageUrl, topText, bottomText) {
  for (let i = 0; i < MEME_APIS.length; i++) {
    try {
      const url = MEME_APIS[i](imageUrl, topText, bottomText)
      const res = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      
      if (res.data && res.status === 200) {
        console.log(` Meme Success API ${i + 1}`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(` Meme API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Meme APIs failed')
}

export default async function memegen(sock, { msg, from }, botSettings) {
  try {
    // 1. Get text - format: top|bottom or just text
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1).join(' ')
    
    if (!args) {
      return await sock.sendMessage(from, { 
        text: `> ❌ Need text!\n> Usage:.memegen top_text|bottom_text\n> Example:.memegen When the code|Actually works\n> Or:.memegen Just top text` 
      }, { quoted: msg })
    }

    let topText = '', bottomText = ''
    if (args.includes('|')) {
      [topText, bottomText] = args.split('|').map(s => s.trim())
    } else {
      topText = args.trim()
    }

    // 2. Get quoted message or sender
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

    // 3. Check if image/sticker
    const isImage = targetMsg.message?.imageMessage
    const isSticker = targetMsg.message?.stickerMessage

    // 4. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 5. Download media
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
        text: `> ❌ Image not found. Reply picha/sticker au tag mtu\n> Example:.memegen text juu|text chini` 
      }, { quoted: msg })
    }

    // 6. Upload to get URL
    const imageUrl = await upload(buffer)

    // 7. Get meme image
    const memeBuffer = await fetchMemeBuffer(imageUrl, topText, bottomText)

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
    console.error('[MEMEGEN ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, { 
      text: `> ❌ Failed. Use:.memegen top|bottom\n> Example:.memegen When broh|Shusha code\n> Aliases:.meme, .smeme, .caption` 
    }, { quoted: msg })
  }
}