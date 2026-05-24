// commands/sticker/stickerdl.js
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'

export const name = 'stickerdl'
export const alias = ['dlpack', 'getpack', 'stickerpackdl', 'spack']
export const category = 'Sticker'
export const desc = 'Download full sticker pack + rebrand to BUNNY-MD - 15+ API fallback'

// API LIST - 16 TOTAL 🦁
const PACK_APIS = [
  (url) => `https://api.telegram.org/file/bot${process.env.TG_BOT_TOKEN || ''}/${url}`, // Direct TG
  (url) => `https://api.lolhuman.xyz/api/stickerpackdl?apikey=GataDios&url=${encodeURIComponent(url)}`,
  (url) => `https://api.erdwpe.com/api/downloader/stickerpack?url=${encodeURIComponent(url)}`,
  (url) => `https://api.botcahx.eu.org/api/downloader/stickerpack?url=${encodeURIComponent(url)}`,
  (url) => `https://api.ryzendesu.vip/api/downloader/stickerpack?url=${encodeURIComponent(url)}`,
  (url) => `https://api.zeeoneofc.my.id/api/stickerpackdl?url=${encodeURIComponent(url)}`,
  (url) => `https://api.caliph.biz.id/api/stickerpackdl?url=${encodeURIComponent(url)}`,
  (url) => `https://api.zahwazein.xyz/downloader/stickerpack?url=${encodeURIComponent(url)}`,
  (url) => `https://api.akuari.my.id/downloader/stickerpack?url=${encodeURIComponent(url)}`,
  (url) => `https://api.xteam.xyz/stickerpackdl?url=${encodeURIComponent(url)}`,
  (url) => `https://api-brunosobrino.zipponodes.xyz/api/stickerpackdl?url=${encodeURIComponent(url)}`,
  (url) => `https://api.boxmine.xyz/api/stickerpackdl?url=${encodeURIComponent(url)}`,
  (url) => `https://api.neoxr.eu/api/stickerpackdl?url=${encodeURIComponent(url)}`,
  (url) => `https://api.siputzx.my.id/api/d/stickerpack?url=${encodeURIComponent(url)}`,
  (url) => `https://api.dhamzxploit.my.id/api/downloader/stickerpack?url=${encodeURIComponent(url)}`,
  (url) => `https://stickerpacks.pages.dev/api/dl?url=${encodeURIComponent(url)}`
]

async function fetchPackStickers(packUrl) {
  for (let i = 0; i < PACK_APIS.length; i++) {
    try {
      const url = PACK_APIS[i](packUrl)
      const res = await axios.get(url, { 
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      
      let results = []
      if (res.data?.result) results = res.data.result
      else if (res.data?.data) results = res.data.data
      else if (res.data?.stickers) results = res.data.stickers
      else if (Array.isArray(res.data)) results = res.data
      
      // Extract URLs
      results = results.map(item => {
        if (typeof item === 'string') return item
        return item.url || item.link || item.file || item.image
      }).filter(Boolean)
      
      if (results.length > 0) {
        console.log(` Pack Download Success API ${i + 1} - Found ${results.length} stickers`)
        return results
      }
    } catch (err) {
      console.log(` Pack API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Sticker Pack APIs failed')
}

export default async function stickerdl(sock, { msg, from }, botSettings) {
  try {
    // 1. Get pack URL
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    
    if (!args[0]) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> ❌ Please provide sticker pack URL!\n> Usage: ${botSettings.prefix}stickerdl https://t.me/addstickers/packname\n> Example: ${botSettings.prefix}dlpack https://getstickerpack.com/stickers/pack\n> All stickers will be rebranded to BUNNY-MD`
      }, { quoted: msg })
    }

    const packUrl = args[0]
    
    // Validate URL
    if (!packUrl.includes('t.me/addstickers') &&!packUrl.includes('getstickerpack.com') &&!packUrl.includes('sticker.ly')) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> ❌ Invalid pack URL!\n> Supports: Telegram, GetStickerPack, Sticker.ly\n> Example: ${botSettings.prefix}stickerdl https://t.me/addstickers/AnimePack`
      }, { quoted: msg })
    }

    // 2. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    await sock.sendMessage(from, {
      text: `> ⏳ Downloading pack...\n> All stickers will be made by Lupin Starnley BUNNY-MD 🦁`
    }, { quoted: msg })

    // 3. Fetch pack stickers
    const stickerUrls = await fetchPackStickers(packUrl)
    
    if (!stickerUrls || stickerUrls.length === 0) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> ❌ Failed to get stickers from pack\n> Link might be invalid or private\n> Try: ${botSettings.prefix}stickerdl https://t.me/addstickers/PublicPack`
      }, { quoted: msg })
    }

    // 4. Send count
    await sock.sendMessage(from, {
      text: `> ✅ Found ${stickerUrls.length} stickers\n> Rebranding to BUNNY-MD + sending...`
    }, { quoted: msg })

    // 5. Download, rebrand and send each sticker
    let sent = 0
    for (let i = 0; i < stickerUrls.length; i++) {
      try {
        const res = await axios.get(stickerUrls[i], {
          responseType: 'arraybuffer',
          timeout: 15000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        
        const buffer = Buffer.from(res.data)

        // Rebrand to BUNNY-MD
        const sticker = new Sticker(buffer, {
          pack: 'BUNNY-MD',
          author: 'Lupin Starnley',
          type: StickerTypes.FULL,
          categories: ['🤖'],
          quality: 50
        })

        const stickerBuffer = await sticker.toBuffer()
        
        await sock.sendMessage(from, {
          sticker: stickerBuffer
        })
        
        sent++
        
        // Delay 1.5s to avoid rate limit
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Progress update every 10 stickers
        if (sent % 10 === 0) {
          await sock.sendMessage(from, {
            text: `> 📦 Progress: ${sent}/${stickerUrls.length} stickers sent`
          }, { quoted: msg })
        }
        
      } catch (err) {
        console.log(` Failed sticker ${i + 1}: ${err.message}`)
        continue
      }
    }

    // 6. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

    await sock.sendMessage(from, {
      text: `> ✅ Pack Download Complete!\n> Sent: ${sent}/${stickerUrls.length} stickers\n> Pack: BUNNY-MD\n> Author: Lupin Starnley 🦁`
    }, { quoted: msg })

  } catch (error) {
    console.error('[STICKERDL ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, {
      text: `> ❌ Failed to download pack\n> Usage: ${botSettings.prefix}stickerdl https://t.me/addstickers/packname\n> Make sure link is public`
    }, { quoted: msg })
  }
}