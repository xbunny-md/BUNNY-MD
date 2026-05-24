// commands/sticker/ttp.js
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'

export const name = 'ttp'
export const alias = ['ttp1', 'ttp2', 'ttp3', 'ttp4', 'ttp5', 'ttp6']
export const category = 'Sticker'
export const desc = 'Text to sticker - 15+ API fallback'

// API LIST - 17 TOTAL 🦁
const TTP_APIS = [
  (text) => `https://api.erdwpe.com/api/maker/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.lolhuman.xyz/api/ttp?apikey=GataDios&text=${encodeURIComponent(text)}`,
  (text) => `https://api.caliph.biz.id/api/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.zahwazein.xyz/maker/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.akuari.my.id/text2img/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.xteam.xyz/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.dhamzxploit.my.id/api/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api-brunosobrino.zipponodes.xyz/api/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.boxmine.xyz/api/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.ryzendesu.vip/api/maker/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.neoxr.eu/api/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.siputzx.my.id/api/m/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.zeeoneofc.my.id/api/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.itsrose.rest/maker/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.botcahx.eu.org/api/maker/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://api.fgmods.xyz/api/maker/ttp?text=${encodeURIComponent(text)}`,
  (text) => `https://vihangayt.me/maker/ttp?text=${encodeURIComponent(text)}`
]

// Function ya kujaribu API zote
async function fetchTtpBuffer(text) {
  for (let i = 0; i < TTP_APIS.length; i++) {
    try {
      const url = TTP_APIS[i](text)
      const res = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      
      if (res.data && res.status === 200) {
        console.log(` Success API ${i + 1}`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(` API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All TTP APIs failed')
}

export default async function ttp(sock, { msg, from }, botSettings) {
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

    if (text.length > 50) {
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
    const buffer = await fetchTtpBuffer(text)

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
    console.error('[TTP ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
  }
}