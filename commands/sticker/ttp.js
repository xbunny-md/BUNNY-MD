// commands/sticker/ttp.js
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'

export const name = 'ttp'
export const alias = ['ttp1', 'ttp2', 'ttp3', 'ttp4', 'ttp5', 'ttp6']
export const category = 'Sticker'
export const desc = 'Text to sticker - 17+ API fallback, 6 styles'

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
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (res.data && res.status === 200 && res.data.byteLength > 1000) {
        console.log(`TTP Success API ${i + 1}`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(`TTP API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All TTP APIs failed')
}

export default async function ttp(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix
  const usedAlias = msg.message?.conversation?.split(' ')[0]?.toLowerCase() ||
                    msg.message?.extendedTextMessage?.text?.split(' ')[0]?.toLowerCase() || ''

  try {
    // 1. GET TEXT
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const text = body.trim().split(' ').slice(1).join(' ')

    // 2. HELP IF NO TEXT
    if (!text) {
      await sock.sendMessage(from, { react: { text: '✍️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✍️ *Text to Sticker* ⌋
│ Convert text to sticker image
│
│ *Usage:*
│ ${prefix}ttp <text>
│ ${prefix}ttp1 Hello World
│ ${prefix}ttp2 Bunny MD
│
│ *Styles:* ${prefix}ttp1 to ${prefix}ttp6
│ *Limit:* Max 50 characters
│
│ *Example:*
│ ${prefix}ttp1 LUPIN STARNLEY
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 3. VALIDATE LENGTH
    if (text.length > 50) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *Text Too Long* ⌋
│ Max 50 characters allowed
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

    // 5. TRY ALL APIs
    const buffer = await fetchTtpBuffer(text)

    // 6. CREATE STICKER - RAM SAFE
    const sticker = new Sticker(buffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['✍️', '🔥'],
      quality: 70,
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
    console.error('[TTP ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *TTP Failed* ⌋
│ ${error.message.includes('API')? 'All 17 APIs are down' : 'Processing failed'}
│ Usage: ${prefix}ttp <text>
│ Example: ${prefix}ttp1 Hello World
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}