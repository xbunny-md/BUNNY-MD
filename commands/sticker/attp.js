// commands/sticker/attp.js
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'

export const name = 'attp'
export const alias = ['attp1', 'attp2', 'attp3', 'attp4', 'attp5', 'attp6']
export const category = 'Sticker'
export const desc = 'Animated text to sticker - 15+ API fallback'

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
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      
      if (res.data && res.status === 200) {
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
  try {
    // 1. Get text
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const text = body.trim().split(' ').slice(1).join(' ')
    
    if (!text) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return
    }

    if (text.length > 30) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return
    }

    // 2. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 3. Try all APIs mpaka iwork
    const buffer = await fetchAttpBuffer(text)

    // 4. Create sticker
    const sticker = new Sticker(buffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['🤖'],
      quality: 50
    })

    const stickerBuffer = await sticker.toBuffer()

    // 5. Send sticker
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 6. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[ATTP ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
  }
}