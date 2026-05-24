// commands/sticker/emojimix.js
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'

export const name = 'emojimix'
export const alias = ['emix', 'mixemoji', 'emo', 'emojicombine']
export const category = 'Sticker'
export const desc = 'Mix 2 emojis into 1 sticker - 15+ API fallback'

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

// Helper to convert emoji to unicode codepoint
function getEmojiCode(emoji) {
  return [...emoji].map(e => e.codePointAt(0).toString(16)).join('-')
}

async function fetchEmojiMixBuffer(emoji1, emoji2) {
  for (let i = 0; i < EMOJI_APIS.length; i++) {
    try {
      const url = EMOJI_APIS[i](emoji1, emoji2)
      const res = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      
      if (res.data && res.status === 200) {
        console.log(` EmojiMix Success API ${i + 1}`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(` EmojiMix API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All EmojiMix APIs failed')
}

export default async function emojimix(sock, { msg, from }, botSettings) {
  try {
    // 1. Get emojis from text
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    
    if (args.length < 2) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, { 
        text: `> ❌ Please provide 2 emojis!\n> Usage: ${botSettings.prefix}emojimix 😂 🔥\n> Example: ${botSettings.prefix}emix 🥰 😍\n> Aliases:.emix,.emo` 
      }, { quoted: msg })
    }

    const emoji1 = args[0]
    const emoji2 = args[1]

    // 2. Validate emojis
    const emojiRegex = /\p{Emoji}/u
    if (!emojiRegex.test(emoji1) ||!emojiRegex.test(emoji2)) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, { 
        text: `> ❌ Invalid emojis! Please use real emojis\n> Example: ${botSettings.prefix}emojimix 😂 🔥` 
      }, { quoted: msg })
    }

    // 3. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 4. Get mixed emoji image
    const mixBuffer = await fetchEmojiMixBuffer(emoji1, emoji2)

    // 5. Convert to sticker
    const sticker = new Sticker(mixBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['🤖'],
      quality: 50
    })

    const stickerBuffer = await sticker.toBuffer()

    // 6. Send sticker
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 7. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[EMOJIMIX ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, { 
      text: `> ❌ Failed to mix emojis. Some combinations don't exist!\n> Try: ${botSettings.prefix}emojimix 😂 🔥\n> Note: Not all emoji pairs are supported by Google` 
    }, { quoted: msg })
  }
}