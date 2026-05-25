// commands/sticker/stickerdl.js
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'

export const name = 'stickerdl'
export const alias = ['dlpack', 'getpack', 'stickerpackdl', 'spack']
export const category = 'Sticker'
export const desc = 'Download full sticker pack + rebrand to BUNNY-MD - 16+ API fallback'

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
        console.log(`Pack Download Success API ${i + 1} - Found ${results.length} stickers`)
        return results.slice(0, 20) // LIMIT 20 - RAM SAFE
      }
    } catch (err) {
      console.log(`Pack API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Sticker Pack APIs failed')
}

export default async function stickerdl(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. GET PACK URL
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)

    // 2. HELP IF NO URL
    if (!args[0]) {
      await sock.sendMessage(from, { react: { text: '📦', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📦 *Sticker Pack Downloader* ⌋
│ Download full pack + rebrand BUNNY-MD
│
│ *Usage:*
│ ${prefix}stickerdl <url>
│ ${prefix}dlpack https://t.me/addstickers/pack
│
│ *Supported:*
│ • Telegram: t.me/addstickers/...
│ • GetStickerPack: getstickerpack.com/...
│ • Sticker.ly: sticker.ly/...
│
│ *Limit:* Max 20 stickers per pack
│ *Note:* All rebranded to BUNNY-MD
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    const packUrl = args[0]

    // 3. VALIDATE URL
    const validHosts = ['t.me/addstickers', 'getstickerpack.com', 'sticker.ly']
    const isValid = validHosts.some(host => packUrl.includes(host))

    if (!isValid) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *Invalid URL* ⌋
│ Supports only:
│ • t.me/addstickers/...
│ • getstickerpack.com/...
│ • sticker.ly/...
│
│ Example:
│ ${prefix}stickerdl https://t.me/addstickers/AnimePack
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 4. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    await sock.sendMessage(from, {
      text: `╭─⌈ ⏳ *Downloading Pack* ⌋
│ Fetching stickers...
│ Will rebrand to BUNNY-MD
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })

    // 5. FETCH PACK STICKERS
    const stickerUrls = await fetchPackStickers(packUrl)

    if (!stickerUrls || stickerUrls.length === 0) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *No Stickers Found* ⌋
│ Link might be invalid or private
│ Try public pack:
│ ${prefix}stickerdl https://t.me/addstickers/PublicPack
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SEND COUNT
    await sock.sendMessage(from, {
      text: `╭─⌈ ✅ *Found ${stickerUrls.length} Stickers* ⌋
│ Rebranding to BUNNY-MD...
│ Sending now...
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })

    // 7. DOWNLOAD, REBRAND AND SEND - RAM SAFE + RATE LIMIT
    let sent = 0
    for (let i = 0; i < stickerUrls.length; i++) {
      try {
        const res = await axios.get(stickerUrls[i], {
          responseType: 'arraybuffer',
          timeout: 15000,
          maxContentLength: 5 * 1024 * 1024, // 5MB limit - RAM SAFE
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })

        const buffer = Buffer.from(res.data)

        if (buffer.length > 1024 * 1024) {
          console.log(`Sticker too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`)
          continue
        }

        // Rebrand to BUNNY-MD
        const sticker = new Sticker(buffer, {
          pack: 'BUNNY-MD',
          author: 'Lupin Starnley',
          type: StickerTypes.FULL,
          categories: ['📦', '✨'],
          quality: 70,
          id: Date.now().toString()
        })

        const stickerBuffer = await sticker.toBuffer()

        await sock.sendMessage(from, {
          sticker: stickerBuffer
        })

        sent++

        // Rate limit: 2s delay to avoid spam ban
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Progress update every 5 stickers
        if (sent % 5 === 0 && sent < stickerUrls.length) {
          await sock.sendMessage(from, {
            text: `╭─⌈ 📦 *Progress* ⌋
│ ${sent}/${stickerUrls.length} stickers sent
╰⊷ *Powered By Bunny Tech*`
          })
        }

      } catch (err) {
        console.log(`Failed sticker ${i + 1}: ${err.message}`)
        continue
      }
    }

    // 8. REACT DONE
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

    await sock.sendMessage(from, {
      text: `╭─⌈ ✅ *Pack Complete* ⌋
│ Sent: ${sent}/${stickerUrls.length} stickers
│ Pack: BUNNY-MD
│ Author: Lupin Starnley 🦁
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })

  } catch (error) {
    console.error('[STICKERDL ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Download Failed* ⌋
│ ${error.message.includes('API')? 'All 16 APIs are down' : 'Processing failed'}
│ Usage: ${prefix}stickerdl <url>
│ Example: ${prefix}stickerdl https://t.me/addstickers/pack
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}