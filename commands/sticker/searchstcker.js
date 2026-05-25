// commands/sticker/getsticker.js
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'

export const name = 'getsticker'
export const alias = ['searchsticker', 'stickersearch', 'findsticker', 'gsticker']
export const category = 'Sticker'
export const desc = 'Search and download sticker packs - 16+ API fallback'

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
        console.log(`Sticker Search Success API ${i + 1} - Found ${results.length}`)
        return results.slice(0, 5) // Limit to 5 stickers - RAM SAFE
      }
    } catch (err) {
      console.log(`Sticker API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Sticker Search APIs failed')
}

export default async function getsticker(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. GET SEARCH QUERY
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const query = body.trim().split(' ').slice(1).join(' ')

    // 2. HELP IF NO QUERY
    if (!query) {
      await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔍 *Sticker Search* ⌋
│ Search and download sticker packs
│
│ *Usage:*
│ ${prefix}getsticker <keyword>
│ ${prefix}gsticker cat
│ ${prefix}stickersearch doge
│
│ *Examples:*
│ ${prefix}getsticker anime
│ ${prefix}gsticker funny
│ ${prefix}findsticker love
│
│ *Limit:* Max 5 stickers per search
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 3. VALIDATE QUERY LENGTH
    if (query.length > 50) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *Query Too Long* ⌋
│ Max 50 characters allowed
│ Your query: ${query.length} chars
│
│ Try shorter keyword
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 4. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 5. SEARCH STICKERS
    const stickerUrls = await fetchStickers(query)

    if (!stickerUrls || stickerUrls.length === 0) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *No Results* ⌋
│ No stickers found for "${query}"
│
│ *Try:*
│ ${prefix}getsticker anime
│ ${prefix}gsticker funny
│ ${prefix}stickersearch cat
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SEND FOUND MESSAGE
    await sock.sendMessage(from, {
      text: `╭─⌈ ✅ *Found ${stickerUrls.length} Stickers* ⌋
│ Query: "${query}"
│ Sending now...
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })

    // 7. DOWNLOAD AND SEND EACH STICKER - RAM SAFE + RATE LIMIT
    let sent = 0
    for (const url of stickerUrls) {
      try {
        const res = await axios.get(url, { 
          responseType: 'arraybuffer',
          timeout: 15000,
          maxContentLength: 5 * 1024 * 1024 // 5MB limit - RAM SAFE
        })
        const buffer = Buffer.from(res.data)

        if (buffer.length > 1024 * 1024) {
          console.log(`Sticker too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`)
          continue
        }

        const sticker = new Sticker(buffer, {
          pack: 'BUNNY-MD',
          author: 'Lupin Starnley',
          type: StickerTypes.FULL,
          categories: ['🔍', '✨'],
          quality: 70,
          id: Date.now().toString()
        })

        const stickerBuffer = await sticker.toBuffer()
        await sock.sendMessage(from, {
          sticker: stickerBuffer
        })
        sent++

        // Rate limit: 1.5s delay to avoid spam
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (err) {
        console.log(`Failed to send sticker: ${err.message}`)
        continue
      }
    }

    // 8. REACT DONE
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

    await sock.sendMessage(from, {
      text: `╭─⌈ ✅ *Complete* ⌋
│ Sent ${sent}/${stickerUrls.length} stickers
│ Query: "${query}"
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })

  } catch (error) {
    console.error('[GETSTICKER ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Search Failed* ⌋
│ ${error.message.includes('API') ? 'All 16 APIs are down' : 'Processing failed'}
│ Usage: ${prefix}getsticker <keyword>
│ Example: ${prefix}getsticker cat
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}