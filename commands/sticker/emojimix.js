// commands/sticker/emojimix.js
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'

export const name = 'emojimix'
export const alias = ['emix', 'mixemoji', 'emo', 'emojicombine']
export const category = 'Sticker'
export const desc = 'Mix 2 emojis into 1 sticker - 16+ API fallback + brute force'

// API LIST - 16 TOTAL 🦁
const EMOJI_APIS = [
  (e1, e2) => `https://api.popcat.xyz/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://www.gstatic.com/android/keyboard/emojikitchen/${getEmojiCode(e1)}/${getEmojiCode(e1)}_${getEmojiCode(e2)}.png`,
  (e1, e2) => `https://api.erdwpe.com/api/maker/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api.botcahx.eu.org/api/maker/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api.ryzendesu.vip/api/maker/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api.zeeoneofc.my.id/api/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api.caliph.biz.id/api/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api.zahwazein.xyz/maker/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api.akuari.my.id/canvas/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api.xteam.xyz/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api-brunosobrino.zipponodes.xyz/api/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api.boxmine.xyz/api/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api.neoxr.eu/api/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api.siputzx.my.id/api/m/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api.dhamzxploit.my.id/api/canvas/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
  (e1, e2) => `https://api.lolhuman.xyz/api/editor/emojimix?apikey=GataDios&emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`
]

// Helper to convert emoji to unicode codepoint - MODERN WAY
function getEmojiCode(emoji) {
  return [...emoji].map(e => e.codePointAt(0).toString(16)).join('-')
}

// Extract all emojis from string
function extractEmojis(str) {
  const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu
  return str.match(emojiRegex) || []
}

// BRUTE FORCE: Try normal + reversed order
async function fetchEmojiMixBuffer(emoji1, emoji2) {
  // Try normal order first: 😂+🔥
  for (let i = 0; i < EMOJI_APIS.length; i++) {
    try {
      const url = EMOJI_APIS[i](emoji1, emoji2)
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (res.data && res.status === 200 && res.data.byteLength > 1000) {
        console.log(`EmojiMix API ${i + 1} success - normal order`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(`EmojiMix API ${i + 1} failed: ${err.message}`)
      continue
    }
  }

  // BRUTE FORCE: Try reversed order: 🔥+😂
  console.log('Brute force: trying reversed order')
  for (let i = 0; i < EMOJI_APIS.length; i++) {
    try {
      const url = EMOJI_APIS[i](emoji2, emoji1)
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (res.data && res.status === 200 && res.data.byteLength > 1000) {
        console.log(`EmojiMix API ${i + 1} success - reversed order`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(`EmojiMix API ${i + 1} reversed failed: ${err.message}`)
      continue
    }
  }

  throw new Error('All EmojiMix APIs failed - combination not supported')
}

export default async function emojimix(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. GET EMOJIS FROM TEXT - MODERN EXTRACTION
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const fullText = body.trim().split(' ').slice(1).join(' ')
    const emojis = extractEmojis(fullText)

    // 2. VALIDATE - HELP SCREEN
    if (emojis.length < 2) {
      await sock.sendMessage(from, { react: { text: '💬', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎭 *Emoji Mix* ⌋
│ Mix 2 emojis into 1 sticker
│
│ *Usage:*
│ ${prefix}emix 😂 🔥
│ ${prefix}emojimix 🥰😍
│ ${prefix}emo 😎🤖
│
│ *Examples:*
│ ${prefix}emix 😂🔥
│ ${prefix}emix 🥰 😍
│
│ *Note:* Not all combinations exist
│ Brute force will try reversed too
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    const emoji1 = emojis[0]
    const emoji2 = emojis[1]

    // 3. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 4. GET MIXED EMOJI IMAGE - BRUTE FORCE
    const mixBuffer = await fetchEmojiMixBuffer(emoji1, emoji2)

    // 5. CONVERT TO STICKER - RENDER SAFE
    const sticker = new Sticker(mixBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['😂', '🎭', '✨'],
      quality: 80,
      id: Date.now().toString()
    })

    const stickerBuffer = await sticker.toBuffer()

    // 6. SEND STICKER
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 7. REACT DONE
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[EMOJIMIX ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Emoji Mix Failed* ⌋
│ ${error.message.includes('combination')? 'Combination not supported' : 'Processing failed'}
│
│ *Try:*
│ ${prefix}emix 😂 🔥
│ ${prefix}emix 🥰 😍
│
│ *Note:* Google only supports
│ certain emoji combinations
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}