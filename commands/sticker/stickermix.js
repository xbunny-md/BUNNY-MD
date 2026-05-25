// commands/sticker/stickermix.js
import { downloadMediaMessage, jidNormalizedUser } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'
import sharp from 'sharp'

export const name = 'stickermix'
export const alias = ['scomb', 'mixsticker', 'emostick']
export const category = 'Sticker'
export const desc = 'Mix sticker/image with emoji - Upload first, Sharp fallback'

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

// LOCAL FALLBACK USING SHARP - RAM SAFE
async function localStickerMix(imageBuffer, emoji) {
  const baseImg = await sharp(imageBuffer).resize(512, 512, { fit: 'inside', withoutEnlargement: true }).toBuffer()
  const metadata = await sharp(baseImg).metadata()
  const size = Math.min(metadata.width, metadata.height)
  const emojiSize = Math.floor(size * 0.25) // 25% of image size

  try {
    const emojiUrl = getEmojiUrl(emoji)
    const emojiRes = await axios.get(emojiUrl, { responseType: 'arraybuffer', timeout: 5000 })
    const emojiBuffer = await sharp(Buffer.from(emojiRes.data)).resize(emojiSize, emojiSize).toBuffer()

    return await sharp(baseImg)
      .composite([{
        input: emojiBuffer,
        bottom: Math.floor(size * 0.02),
        right: Math.floor(size * 0.02)
      }])
      .png({ quality: 80, compressionLevel: 9 })
      .toBuffer()
  } catch {
    // If emoji fails, return base image
    return baseImg
  }
}

// FETCH: UPLOAD + API FIRST, SHARP FALLBACK
async function fetchStickerMixBuffer(buffer, emoji) {
  // 1. TRY UPLOAD + APIs FIRST
  try {
    console.log('Trying upload + APIs')
    const imageUrl = await upload(buffer)
    
    for (let i = 0; i < STICKERMIX_APIS.length; i++) {
      try {
        const url = STICKERMIX_APIS[i](imageUrl, emoji)
        const res = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })

        if (res.data && res.status === 200 && res.data.byteLength > 1000) {
          console.log(`StickerMix API ${i + 1} success`)
          return Buffer.from(res.data)
        }
      } catch (err) {
        console.log(`StickerMix API ${i + 1} failed: ${err.message}`)
        continue
      }
    }
  } catch (err) {
    console.log(`Upload/APIs failed: ${err.message}`)
  }

  // 2. FALLBACK TO LOCAL SHARP
  console.log('Falling back to local Sharp')
  return await localStickerMix(buffer, emoji)
}

export default async function stickermix(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. GET EMOJI FROM COMMAND
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)

    // 2. ADVANCED MEDIA DETECTION - viewOnce included
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const mediaMessage = msg.message?.imageMessage || 
                         msg.message?.stickerMessage ||
                         quoted?.imageMessage || 
                         quoted?.stickerMessage ||
                         quoted?.viewOnceMessageV2?.message?.imageMessage ||
                         quoted?.viewOnceMessageV2?.message?.stickerMessage ||
                         quoted?.viewOnceMessage?.message?.imageMessage ||
                         quoted?.viewOnceMessage?.message?.stickerMessage

    // 3. HELP IF NO EMOJI OR NO MEDIA
    if (args.length < 1 || !mediaMessage) {
      await sock.sendMessage(from, { react: { text: '😂', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 😂 *Sticker Mix* ⌋
│ Mix sticker/image with emoji
│
│ *Usage:*
│ Reply to image/sticker + ${prefix}stickermix <emoji>
│ ${prefix}scomb 😂
│ ${prefix}emostick 🔥
│
│ *Examples:*
│ ${prefix}stickermix 😂
│ ${prefix}scomb 🔥
│ ${prefix}mixsticker ❤️
│
│ *Supports:*
│ • Images
│ • Stickers
│ • ViewOnce media
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    const emoji = args[0]
    const emojiRegex = /\p{Emoji}/u
    if (!emojiRegex.test(emoji)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *Invalid Emoji* ⌋
│ Use a real emoji
│ Example: ${prefix}stickermix 😂
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 4. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 5. BUILD TARGET MSG CORRECTLY
    let targetMsg = msg
    let targetJid = msg.key.participant || msg.key.remoteJid

    if (quoted) {
      const quotedInfo = msg.message?.extendedTextMessage?.contextInfo
      targetMsg = {
        message: quoted,
        key: {
          remoteJid: from,
          id: quotedInfo.stanzaId,
          participant: quotedInfo.participant
        }
      }
      targetJid = quotedInfo.participant || quotedInfo.remoteJid || from
    }

    // 6. DOWNLOAD MEDIA
    let buffer
    if (mediaMessage) {
      buffer = await downloadMediaMessage(
        targetMsg,
        'buffer',
        {},
        { logger: console }
      )
    } else {
      // Use profile picture if no image
      try {
        const ppUrl = await sock.profilePictureUrl(jidNormalizedUser(targetJid), 'image')
        const res = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 8000 })
        buffer = Buffer.from(res.data)
      } catch {
        const res = await axios.get('https://i.ibb.co/2dH8p5Z/profile.jpg', { responseType: 'arraybuffer' })
        buffer = Buffer.from(res.data)
      }
    }

    if (!buffer || buffer.length === 0) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *Error* ⌋
│ Image not found
│ Reply to image/sticker
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 7. GET MIXED IMAGE - UPLOAD FIRST, SHARP FALLBACK
    const mixBuffer = await fetchStickerMixBuffer(buffer, emoji)

    // 8. CONVERT TO STICKER - RAM SAFE
    const sticker = new Sticker(mixBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['😂', '🔥'],
      quality: 70,
      id: Date.now().toString()
    })

    const stickerBuffer = await sticker.toBuffer()

    // 9. SEND STICKER
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 10. REACT DONE
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[STICKERMIX ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *StickerMix Failed* ⌋
│ ${error.message.includes('methods') ? 'All methods failed' : 'Processing failed'}
│ Usage: ${prefix}stickermix <emoji>
│ Example: ${prefix}stickermix 😂
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}