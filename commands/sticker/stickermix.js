// commands/sticker/stickermix.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'
import sharp from 'sharp'

export const name = 'stickermix'
export const alias = ['scomb', 'mixsticker', 'emostick']
export const category = 'Sticker'
export const desc = 'Mix sticker/image with emoji - 15+ API fallback'

// API LIST - 16 TOTAL 🦁
const STICKERMIX_APIS = [
  (url, emoji) => `https://api.popcat.xyz/stickermix?image=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.lolhuman.xyz/api/editor/stickermix?apikey=GataDios&img=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.erdwpe.com/api/maker/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.botcahx.eu.org/api/maker/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.ryzendesu.vip/api/maker/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.zeeoneofc.my.id/api/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.caliph.biz.id/api/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.zahwazein.xyz/maker/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.akuari.my.id/canvas/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.xteam.xyz/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api-brunosobrino.zipponodes.xyz/api/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.boxmine.xyz/api/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.neoxr.eu/api/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.siputzx.my.id/api/m/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://some-random-api.com/canvas/misc/stickermix?avatar=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`,
  (url, emoji) => `https://api.dhamzxploit.my.id/api/canvas/stickermix?url=${encodeURIComponent(url)}&emoji=${encodeURIComponent(emoji)}`
]

// Convert emoji to Twemoji PNG URL - local fallback
function getEmojiUrl(emoji) {
  const code = [...emoji].map(e => e.codePointAt(0).toString(16)).join('-')
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${code}.png`
}

async function fetchStickerMixBuffer(imageUrl, emoji) {
  for (let i = 0; i < STICKERMIX_APIS.length; i++) {
    try {
      const url = STICKERMIX_APIS[i](imageUrl, emoji)
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (res.data && res.status === 200) {
        console.log(` StickerMix Success API ${i + 1}`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(` StickerMix API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All StickerMix APIs failed')
}

// Local fallback using sharp - overlay emoji on bottom-right
async function localStickerMix(imageBuffer, emoji) {
  const baseImg = await sharp(imageBuffer).resize(512, 512).toBuffer()

  try {
    const emojiUrl = getEmojiUrl(emoji)
    const emojiRes = await axios.get(emojiUrl, { responseType: 'arraybuffer' })
    const emojiBuffer = await sharp(Buffer.from(emojiRes.data)).resize(128, 128).toBuffer()

    return await sharp(baseImg)
    .composite([{
        input: emojiBuffer,
        bottom: 10,
        right: 10
      }])
    .png()
    .toBuffer()
  } catch {
    // If emoji fails, return base image
    return baseImg
  }
}

export default async function stickermix(sock, { msg, from }, botSettings) {
  try {
    // 1. Get emoji from command
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)

    if (args.length < 1) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> ❌ Please provide 1 emoji!\n> Usage: ${botSettings.prefix}stickermix 😂\n> Reply to image/sticker first\n> Example: ${botSettings.prefix}scomb 🔥`
      }, { quoted: msg })
    }

    const emoji = args[0]
    const emojiRegex = /\p{Emoji}/u
    if (!emojiRegex.test(emoji)) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> ❌ Invalid emoji! Use a real emoji\n> Example: ${botSettings.prefix}stickermix 😂`
      }, { quoted: msg })
    }

    // 2. Get quoted message
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
      // Use profile picture if no image
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
        text: `> ❌ Image not found. Reply to image/sticker\n> Usage: ${botSettings.prefix}stickermix 😂`
      }, { quoted: msg })
    }

    // 6. Upload to get URL
    const imageUrl = await upload(buffer)

    // 7. Try API mix first, fallback to local
    let mixBuffer
    try {
      mixBuffer = await fetchStickerMixBuffer(imageUrl, emoji)
    } catch {
      console.log(' APIs failed, using local mix')
      mixBuffer = await localStickerMix(buffer, emoji)
    }

    // 8. Convert to sticker
    const sticker = new Sticker(mixBuffer, {
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
    console.error('[STICKERMIX ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, {
      text: `> ❌ Failed. Reply to image/sticker\n> Usage: ${botSettings.prefix}stickermix 😂\n> Example: ${botSettings.prefix}scomb 🔥`
    }, { quoted: msg })
  }
}