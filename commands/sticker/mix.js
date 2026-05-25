// commands/sticker/mix.js
import { downloadMediaMessage, getContentType, jidNormalizedUser } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'
import sharp from 'sharp'

export const name = 'mix'
export const alias = ['stickermix', 'combine', 'merge']
export const category = 'Sticker'
export const desc = 'Combine 2 stickers/images into 1 sticker - Upload first, Sharp fallback'

// API LIST - 16 TOTAL 🦁
const MIX_APIS = [
  (url1, url2) => `https://api.popcat.xyz/ship?user1=${encodeURIComponent(url1)}&user2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.lolhuman.xyz/api/editor/combine?apikey=GataDios&img1=${encodeURIComponent(url1)}&img2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.erdwpe.com/api/maker/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.botcahx.eu.org/api/maker/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.ryzendesu.vip/api/maker/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.zeeoneofc.my.id/api/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.caliph.biz.id/api/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.zahwazein.xyz/maker/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.akuari.my.id/canvas/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.xteam.xyz/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api-brunosobrino.zipponodes.xyz/api/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.boxmine.xyz/api/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.neoxr.eu/api/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.siputzx.my.id/api/m/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://some-random-api.com/canvas/misc/ship?avatar1=${encodeURIComponent(url1)}&avatar2=${encodeURIComponent(url2)}`,
  (url1, url2) => `https://api.dhamzxploit.my.id/api/canvas/ship?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`
]

// SHARP LOCAL FALLBACK - RAM SAFE 🦁
async function localMix(buffer1, buffer2) {
  const img1 = await sharp(buffer1).resize(256, 256, { fit: 'cover' }).png().toBuffer()
  const img2 = await sharp(buffer2).resize(256, 256, { fit: 'cover' }).png().toBuffer()

  return await sharp({
    create: {
      width: 512,
      height: 256,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([
    { input: img1, left: 0, top: 0 },
    { input: img2, left: 256, top: 0 }
  ])
  .png({ quality: 80, compressionLevel: 9 })
  .toBuffer()
}

// FETCH: UPLOAD + API FIRST, SHARP FALLBACK
async function fetchMixBuffer(buffer1, buffer2) {
  // 1. TRY UPLOAD + APIs FIRST
  try {
    console.log('Trying upload + APIs')
    const [url1, url2] = await Promise.all([
      upload(buffer1),
      upload(buffer2)
    ])
    
    for (let i = 0; i < MIX_APIS.length; i++) {
      try {
        const url = MIX_APIS[i](url1, url2)
        const res = await axios.get(url, { 
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })

        if (res.data && res.status === 200 && res.data.byteLength > 1000) {
          console.log(`Mix API ${i + 1} success`)
          return Buffer.from(res.data)
        }
      } catch (err) {
        console.log(`Mix API ${i + 1} failed: ${err.message}`)
        continue
      }
    }
  } catch (err) {
    console.log(`Upload/APIs failed: ${err.message}`)
  }

  // 2. FALLBACK TO LOCAL SHARP
  console.log('Falling back to local Sharp')
  return await localMix(buffer1, buffer2)
}

// MODERN JID NORMALIZER - HANDLES LID/JID 🦁
function normalizeJid(jid) {
  if (!jid) return null
  return jidNormalizedUser(jid)
}

export default async function mix(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 2. COLLECT MEDIA SOURCES - MODERN DETECTION
    const context = msg.message?.extendedTextMessage?.contextInfo
    const mentions = context?.mentionedJid || []
    const quoted = context?.quotedMessage
    
    let mediaBuffers = []

    // Helper to get buffer from message
    const getBuffer = async (message, jid) => {
      try {
        if (message?.imageMessage || message?.stickerMessage) {
          const targetMsg = { message, key: { remoteJid: from, id: msg.key.id } }
          return await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: console })
        } else if (message?.viewOnceMessageV2?.message?.imageMessage) {
          const targetMsg = { message: message.viewOnceMessageV2.message, key: { remoteJid: from, id: msg.key.id } }
          return await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: console })
        } else if (message?.viewOnceMessage?.message?.imageMessage) {
          const targetMsg = { message: message.viewOnceMessage.message, key: { remoteJid: from, id: msg.key.id } }
          return await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: console })
        } else if (jid) {
          const ppUrl = await sock.profilePictureUrl(normalizeJid(jid), 'image')
          const res = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 8000 })
          return Buffer.from(res.data)
        }
      } catch {
        return null
      }
    }

    // Source 1: Current message
    const buf1 = await getBuffer(msg.message, null)
    if (buf1) mediaBuffers.push(buf1)

    // Source 2: Quoted message
    if (quoted && mediaBuffers.length < 2) {
      const buf2 = await getBuffer(quoted, context?.participant)
      if (buf2) mediaBuffers.push(buf2)
    }

    // Source 3: Mentions - MODERN JID HANDLING
    for (const jid of mentions) {
      if (mediaBuffers.length >= 2) break
      const normalizedJid = normalizeJid(jid)
      if (!normalizedJid) continue
      
      try {
        const ppUrl = await sock.profilePictureUrl(normalizedJid, 'image')
        const res = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 8000 })
        mediaBuffers.push(Buffer.from(res.data))
      } catch (err) {
        console.log(`PP fetch failed for ${normalizedJid}: ${err.message}`)
      }
    }

    // Source 4: Sender as fallback
    if (mediaBuffers.length < 2) {
      const bufSelf = await getBuffer(null, msg.key.participant || from)
      if (bufSelf) mediaBuffers.push(bufSelf)
    }

    // 3. VALIDATE - NEED 2 IMAGES
    if (mediaBuffers.length < 2) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📸 *Sticker Mix* ⌋
│ Need 2 images/stickers to combine
│
│ *Methods:*
│ 1. Reply image + send another
│ 2. ${prefix}mix @user1 @user2
│ 3. Reply sticker + tag user
│
│ *Examples:*
│ ${prefix}mix @user
│ ${prefix}mix (reply pic + send pic)
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    const [buffer1, buffer2] = mediaBuffers

    // 4. GET MIXED IMAGE - UPLOAD FIRST, SHARP FALLBACK
    const mixBuffer = await fetchMixBuffer(buffer1, buffer2)

    // 5. CONVERT TO STICKER - RAM SAFE
    const sticker = new Sticker(mixBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['🔀', '✨'],
      quality: 70,
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
    console.error('[MIX ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Mix Failed* ⌋
│ All methods failed
│ Usage: ${prefix}mix @user1 @user2
│ Or: Reply image + send image
│ Aliases: ${prefix}stickermix, ${prefix}merge
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}