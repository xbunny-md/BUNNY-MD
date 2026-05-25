// commands/sticker/memegen.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'

export const name = 'memegen'
export const alias = ['meme', 'smeme', 'stickermeme', 'caption']
export const category = 'Sticker'
export const desc = 'Generate meme sticker with top/bottom text - 16+ API fallback'

// API LIST - 16 TOTAL FOR MAXIMUM UPTIME 🦁
const MEME_APIS = [
  (url, top, bottom) => `https://api.memegen.link/images/custom/${encodeURIComponent(top || '_')}/${encodeURIComponent(bottom || '_')}.png?background=${encodeURIComponent(url)}`,
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
  const top = topText || '_'
  const bottom = bottomText || '_'
  
  for (let i = 0; i < MEME_APIS.length; i++) {
    try {
      const url = MEME_APIS[i](imageUrl, top, bottom)
      const res = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (res.data && res.status === 200 && res.data.byteLength > 1000) {
        console.log(`Meme API ${i + 1} success`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(`Meme API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Meme APIs failed')
}

export default async function memegen(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. PARSE TEXT - MODERN WAY
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1).join(' ')

    if (!args) {
      await sock.sendMessage(from, { react: { text: '💬', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎭 *Meme Generator* ⌋
│ Create meme stickers with text
│
│ *Usage:*
│ ${prefix}meme top_text|bottom_text
│ ${prefix}meme Just top text
│
│ *Examples:*
│ ${prefix}meme When the code|Actually works
│ ${prefix}meme Debug mode
│
│ *Tips:*
│ Reply to image/sticker or tag user
│ Works with viewOnce too
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    let topText = '', bottomText = ''
    if (args.includes('|')) {
      [topText, bottomText] = args.split('|').map(s => s.trim().slice(0, 100))
    } else {
      topText = args.trim().slice(0, 100)
    }

    // 2. ADVANCED EYE LOGIC - viewOnce included
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const mediaMessage = msg.message?.imageMessage || 
                         msg.message?.stickerMessage ||
                         quoted?.imageMessage || 
                         quoted?.stickerMessage ||
                         quoted?.viewOnceMessageV2?.message?.imageMessage ||
                         quoted?.viewOnceMessageV2?.message?.stickerMessage ||
                         quoted?.viewOnceMessage?.message?.imageMessage ||
                         quoted?.viewOnceMessage?.message?.stickerMessage

    let targetJid = msg.key.participant || msg.key.remoteJid
    let targetMsg = msg

    // 3. SET TARGET IF QUOTED EXISTS
    if (quoted && (quoted.imageMessage || quoted.stickerMessage || quoted.viewOnceMessageV2 || quoted.viewOnceMessage)) {
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

    // 4. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 5. DOWNLOAD MEDIA OR GET PROFILE PIC
    let buffer
    if (mediaMessage) {
      buffer = await downloadMediaMessage(
        targetMsg,
        'buffer',
        {},
        { logger: console }
      )
    } else {
      try {
        const ppUrl = await sock.profilePictureUrl(targetJid, 'image')
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
│ Failed to get image
│ Reply to an image/sticker or tag someone
│ Usage: ${prefix}meme top|bottom
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. UPLOAD TO GET URL - TECHNICAL DEPENDENCY
    const imageUrl = await upload(buffer)

    // 7. GET MEME IMAGE FROM API - 16 FALLBACKS
    const memeBuffer = await fetchMemeBuffer(imageUrl, topText, bottomText)

    // 8. CONVERT TO STICKER - RENDER SAFE
    const sticker = new Sticker(memeBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['😂', '🎭'],
      quality: 80,
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
    console.error('[MEMEGEN ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Meme Failed* ⌋
│ ${error.message.includes('API') ? 'All 16 APIs are down' : 'Processing failed'}
│ Usage: ${prefix}meme top|bottom
│ Example: ${prefix}meme When broh|Shusha code
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}