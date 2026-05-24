// commands/sticker/mix.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { upload } from '../../lib/upload.js'
import sharp from 'sharp'

export const name = 'mix'
export const alias = ['stickermix', 'combine', 'merge']
export const category = 'Sticker'
export const desc = 'Changanya stickers/picha 2 ziwe sticker 1 - 15+ API fallback'

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

async function fetchMixBuffer(url1, url2) {
  for (let i = 0; i < MIX_APIS.length; i++) {
    try {
      const url = MIX_APIS[i](url1, url2)
      const res = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      
      if (res.data && res.status === 200) {
        console.log(` Mix Success API ${i + 1}`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(` Mix API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Mix APIs failed')
}

// Fallback local mix using sharp
async function localMix(buffer1, buffer2) {
  const img1 = await sharp(buffer1).resize(256, 256).toBuffer()
  const img2 = await sharp(buffer2).resize(256, 256).toBuffer()
  
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
 .png()
 .toBuffer()
}

export default async function mix(sock, { msg, from }, botSettings) {
  try {
    // 1. Get quoted messages - need 2 images
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    const mentions = quoted?.mentionedJid || []
    
    let buffer1, buffer2
    
    // Case 1: Reply 2 messages - need to check quoted
    if (quoted?.quotedMessage) {
      const quotedMsg = {
        message: quoted.quotedMessage,
        key: { 
          remoteJid: from, 
          id: quoted.stanzaId, 
          participant: quoted.participant 
        }
      }
      
      if (quotedMsg.message?.imageMessage || quotedMsg.message?.stickerMessage) {
        buffer1 = await downloadMediaMessage(quotedMsg, 'buffer', {}, { logger: console })
      }
    }
    
    // Case 2: Current message has image + quoted has image
    if (msg.message?.imageMessage || msg.message?.stickerMessage) {
      buffer2 = await downloadMediaMessage(msg, 'buffer', {}, { logger: console })
    }
    
    // Case 3: Use tagged users profile pics
    if (!buffer1 && mentions[0]) {
      try {
        const ppUrl = await sock.profilePictureUrl(mentions[0], 'image')
        const res = await axios.get(ppUrl, { responseType: 'arraybuffer' })
        buffer1 = Buffer.from(res.data)
      } catch {}
    }
    
    if (!buffer2 && mentions[1]) {
      try {
        const ppUrl = await sock.profilePictureUrl(mentions[1], 'image')
        const res = await axios.get(ppUrl, { responseType: 'arraybuffer' })
        buffer2 = Buffer.from(res.data)
      } catch {}
    }
    
    // Case 4: Use sender if still missing
    if (!buffer1) {
      try {
        const ppUrl = await sock.profilePictureUrl(msg.key.participant || from, 'image')
        const res = await axios.get(ppUrl, { responseType: 'arraybuffer' })
        buffer1 = Buffer.from(res.data)
      } catch {}
    }

    // 3. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    if (!buffer1 ||!buffer2) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, { 
        text: `> ❌ Need 2 images/stickers!\n> Usage:.mix\n> Reply picha 1, tag mtu au tuma picha 2\n> Example:.mix @user1 @user2` 
      }, { quoted: msg })
    }

    // 5. Upload both images
    const [url1, url2] = await Promise.all([
      upload(buffer1),
      upload(buffer2)
    ])

    // 6. Try API mix first, fallback to local
    let mixBuffer
    try {
      mixBuffer = await fetchMixBuffer(url1, url2)
    } catch {
      console.log(' APIs failed, using local mix')
      mixBuffer = await localMix(buffer1, buffer2)
    }

    // 7. Convert to sticker
    const sticker = new Sticker(mixBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['🤖'],
      quality: 50
    })

    const stickerBuffer = await sticker.toBuffer()

    // 8. Send sticker
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 9. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[MIX ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, { 
      text: `> ❌ Failed. Use:.mix\n> Need 2 images: reply + send, or tag 2 users\n> Example:.mix @user1 @user2` 
    }, { quoted: msg })
  }
}