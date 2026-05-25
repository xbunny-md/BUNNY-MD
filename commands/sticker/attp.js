// commands/sticker/attp.js
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'

export const name = 'attp'
export const alias = ['attp1', 'attp2', 'attp3', 'attp4', 'attp5', 'attp6']
export const category = 'Sticker'
export const desc = 'Animated text to sticker - 18+ API fallback'

// API LIST - 18 TOTAL 🦁
const ATTP_APIS = [
  (text) => `https://api.erdwpe.com/api/maker/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.lolhuman.xyz/api/attp?apikey=GataDios&text=${encodeURIComponent(text)}`,
  (text) => `https://api.caliph.biz.id/api/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.zahwazein.xyz/maker/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.akuari.my.id/text2gif/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.xteam.xyz/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.dhamzxploit.my.id/api/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api-brunosobrino.zipponodes.xyz/api/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.boxmine.xyz/api/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.ryzendesu.vip/api/maker/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.neoxr.eu/api/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.siputzx.my.id/api/m/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.zeeoneofc.my.id/api/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.itsrose.rest/maker/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.botcahx.eu.org/api/maker/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.fgmods.xyz/api/maker/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://vihangayt.me/maker/attp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.lolhuman.xyz/api/attp2?apikey=GataDios&text=${encodeURIComponent(text)}`
]

// Function ya kujaribu API zote
async function fetchAttpBuffer(text) {
  for (let i = 0; i < ATTP_APIS.length; i++) {
    try {
      const url = ATTP_APIS[i](text)
      const res = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (res.data && res.status === 200 && res.data.byteLength > 1000) {
        console.log(`[ATTP] Success API ${i + 1}`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(`[ATTP] API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All ATTP APIs failed')
}

export default async function attp(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. GET TEXT
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const text = body.trim().split(' ').slice(1).join(' ')

    // 2. HELP IF NO TEXT
    if (!text) {
      await sock.sendMessage(from, { react: { text: '✨', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✨ *Animated Text Sticker* ⌋
│ Create glowing animated text stickers
│
│ *Usage:*
│ ${prefix}attp <text>
│
│ *Examples:*
│ ${prefix}attp Hello
│ ${prefix}attp Bunny MD
│
│ *Limit:* Max 30 characters
│ *Aliases:* ${prefix}attp1, ${prefix}attp2
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 3. VALIDATE LENGTH
    if (text.length > 30) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *Text Too Long* ⌋
│ Max 30 characters allowed
│ Your text: ${text.length} chars
│
│ Try shorter text
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 4. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 5. TRY ALL APIs MPAKA IWORK
    const buffer = await fetchAttpBuffer(text)

    // 6. CREATE STICKER - RENDER SAFE
    const sticker = new Sticker(buffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['✨', '🎨'],
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
    console.error('[ATTP ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *ATTP Failed* ⌋
│ ${error.message.includes('API') ? 'All 18 APIs are down' : 'Processing failed'}
│ Usage: ${prefix}attp <text>
│ Example: ${prefix}attp Hello World
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}