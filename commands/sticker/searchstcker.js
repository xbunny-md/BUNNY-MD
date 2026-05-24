// commands/sticker/getsticker.js
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'

export const name = 'getsticker'
export const alias = ['searchsticker', 'stickersearch', 'findsticker', 'gsticker']
export const category = 'Sticker'
export const desc = 'Search and download sticker packs - 15+ API fallback'

// API LIST - 16 TOTAL 🦁
const STICKER_APIS = [
  (query) => `https://api.waifu.pics/sfw/${encodeURIComponent(query)}`,
  (query) => `https://api.popcat.xyz/sticker?text=${encodeURIComponent(query)}`,
  (query) => `https://api.nekosapi.com/v3/images/random?tags=${encodeURIComponent(query)}`,
  (query) => `https://api.lolhuman.xyz/api/stickerpack?apikey=GataDios&query=${encodeURIComponent(query)}`,
  (query) => `https://api.erdwpe.com/api/search/sticker?query=${encodeURIComponent(query)}`,
  (query) => `https://api.botcahx.eu.org/api/search/sticker?query=${encodeURIComponent(query)}`,
  (query) => `https://api.ryzendesu.vip/api/search/sticker?query=${encodeURIComponent(query)}`,
  (query) => `https://api.zeeoneofc.my.id/api/stickerpack?query=${encodeURIComponent(query)}`,
  (query) => `https://api.caliph.biz.id/api/stickerpack?query=${encodeURIComponent(query)}`,
  (query) => `https://api.zahwazein.xyz/search/sticker?query=${encodeURIComponent(query)}`,
  (query) => `https://api.akuari.my.id/search/sticker?query=${encodeURIComponent(query)}`,
  (query) => `https://api.xteam.xyz/stickerpack?query=${encodeURIComponent(query)}`,
  (query) => `https://api-brunosobrino.zipponodes.xyz/api/stickerpack?query=${encodeURIComponent(query)}`,
  (query) => `https://api.boxmine.xyz/api/stickerpack?query=${encodeURIComponent(query)}`,
  (query) => `https://api.neoxr.eu/api/stickerpack?query=${encodeURIComponent(query)}`,
  (query) => `https://api.siputzx.my.id/api/s/sticker?query=${encodeURIComponent(query)}`
]

async function fetchStickers(query) {
  for (let i = 0; i < STICKER_APIS.length; i++) {
    try {
      const url = STICKER_APIS[i](query)
      const res = await axios.get(url, { 
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      
      // Handle different API response formats
      let results = []
      if (res.data?.url) results = [res.data.url]
      else if (res.data?.result) results = Array.isArray(res.data.result) ? res.data.result : [res.data.result]
      else if (res.data?.data) results = Array.isArray(res.data.data) ? res.data.data : [res.data.data]
      else if (Array.isArray(res.data)) results = res.data
      
      // Extract URLs from objects
      results = results.map(item => {
        if (typeof item === 'string') return item
        return item.url || item.sticker || item.image || item.link
      }).filter(Boolean)
      
      if (results.length > 0) {
        console.log(` Sticker Search Success API ${i + 1} - Found ${results.length}`)
        return results.slice(0, 10) // Limit to 10 stickers
      }
    } catch (err) {
      console.log(` Sticker API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Sticker Search APIs failed')
}

export default async function getsticker(sock, { msg, from }, botSettings) {
  try {
    // 1. Get search query
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const query = body.trim().split(' ').slice(1).join(' ')
    
    if (!query) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> ❌ Please provide search keyword!\n> Usage: ${botSettings.prefix}getsticker cat\n> Example: ${botSettings.prefix}searchsticker doge\n> Aliases: ${botSettings.prefix}gsticker, ${botSettings.prefix}stickersearch`
      }, { quoted: msg })
    }

    // 2. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 3. Search stickers
    const stickerUrls = await fetchStickers(query)
    
    if (!stickerUrls || stickerUrls.length === 0) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> ❌ No stickers found for "${query}"\n> Try: ${botSettings.prefix}getsticker anime\n> Or: ${botSettings.prefix}getsticker funny`
      }, { quoted: msg })
    }

    // 4. Send found message
    await sock.sendMessage(from, {
      text: `> ✅ Found ${stickerUrls.length} stickers for "${query}"\n> Sending...`
    }, { quoted: msg })

    // 5. Download and send each sticker
    let sent = 0
    for (const url of stickerUrls) {
      try {
        const res = await axios.get(url, { 
          responseType: 'arraybuffer',
          timeout: 15000 
        })
        const buffer = Buffer.from(res.data)

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
        
        // Delay to avoid spam
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (err) {
        console.log(` Failed to send sticker: ${err.message}`)
        continue
      }
    }

    // 6. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

    await sock.sendMessage(from, {
      text: `> ✅ Sent ${sent}/${stickerUrls.length} stickers for "${query}"`
    }, { quoted: msg })

  } catch (error) {
    console.error('[GETSTICKER ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, {
      text: `> ❌ Failed to search stickers\n> Usage: ${botSettings.prefix}getsticker cat\n> Try: ${botSettings.prefix}searchsticker doge`
    }, { quoted: msg })
  }
}