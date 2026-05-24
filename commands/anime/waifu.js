// commands/anime/waifu.js
import axios from 'axios'

export const name = 'waifu'
export const alias = ['waifuimg', 'wfu', 'girl']
export const category = 'Anime'
export const desc = 'Get random waifu images with 15+ API fallbacks'

const TIMEOUT = 8000 // 8s per API

// 15+ WAIFU IMAGE APIs
const WAIFU_APIS = [
  // 1. Waifu.pics
  async () => {
    const res = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: TIMEOUT })
    return { url: res.data?.url, source: 'waifu.pics' }
  },

  // 2. Waifu.im
  async () => {
    const res = await axios.get('https://api.waifu.im/search', {
      params: { included_tags: 'waifu' },
      timeout: TIMEOUT
    })
    return { url: res.data?.images?.[0]?.url, source: 'waifu.im' }
  },

  // 3. Nekos.life
  async () => {
    const res = await axios.get('https://nekos.life/api/v2/img/waifu', { timeout: TIMEOUT })
    return { url: res.data?.url, source: 'nekos.life' }
  },

  // 4. Pic.re
  async () => {
    const res = await axios.get('https://pic.re/image.json', {
      params: { category: 'waifu' },
      timeout: TIMEOUT
    })
    return { url: res.data?.file_url, source: 'pic.re' }
  },

  // 5. Purrbot
  async () => {
    const res = await axios.get('https://purrbot.site/api/img/sfw/waifu/img', { timeout: TIMEOUT })
    return { url: res.data?.link, source: 'purrbot.site' }
  },

  // 6. Anime-API
  async () => {
    const res = await axios.get('https://anime-api.hisoka17.repl.co/img/waifu', { timeout: TIMEOUT })
    return { url: res.data?.url, source: 'anime-api' }
  },

  // 7. NekosBest
  async () => {
    const res = await axios.get('https://nekos.best/api/v2/waifu', { timeout: TIMEOUT })
    return { url: res.data?.results?.[0]?.url, source: 'nekos.best' }
  },

  // 8. WaifuGenerator
  async () => {
    const res = await axios.get('https://waifu-generator.vercel.app/api/v1/waifu', { timeout: TIMEOUT })
    return { url: res.data?.url, source: 'waifu-generator' }
  },

  // 9. Kyoko
  async () => {
    const res = await axios.get('https://kyoko.rei.my.id/api/sfw/waifu', { timeout: TIMEOUT })
    return { url: res.data?.url, source: 'kyoko' }
  },

  // 10. Xterm
  async () => {
    const res = await axios.get('https://xterm.js.org/api/waifu', { timeout: TIMEOUT })
    return { url: res.data?.url, source: 'xterm' }
  },

  // 11. Catboys
  async () => {
    const res = await axios.get('https://api.catboys.com/img', { timeout: TIMEOUT })
    return { url: res.data?.url, source: 'catboys' }
  },

  // 12. Waifu.it
  async () => {
    const res = await axios.get('https://waifu.it/api/waifu', { timeout: TIMEOUT })
    return { url: res.data?.url, source: 'waifu.it' }
  },

  // 13. Some Random API
  async () => {
    const res = await axios.get('https://some-random-api.ml/img/waifu', { timeout: TIMEOUT })
    return { url: res.data?.link, source: 'some-random-api' }
  },

  // 14. AnimeImages
  async () => {
    const res = await axios.get('https://anime-api.hisoka17.repl.co/img/wallpaper', { timeout: TIMEOUT })
    return { url: res.data?.url, source: 'anime-images' }
  },

  // 15. Shiro
  async () => {
    const res = await axios.get('https://shiro.gg/api/images/waifu', { timeout: TIMEOUT })
    return { url: res.data?.url, source: 'shiro.gg' }
  },

  // 16. BONUS: Otakugifs
  async () => {
    const res = await axios.get('https://api.otakugifs.xyz/gif?reaction=waifu', { timeout: TIMEOUT })
    return { url: res.data?.url, source: 'otakugifs' }
  }
]

export default async function waifu(sock, { msg, from }, botSettings) {
  try {
    await sock.sendMessage(from, {
      react: { text: '💖', key: msg.key }
    })

    let waifuData = null
    let apiUsed = 0

    // TRY ALL 16 APIS
    for (let i = 0; i < WAIFU_APIS.length; i++) {
      try {
        console.log(`[WAIFU] Trying API ${i + 1}/${WAIFU_APIS.length}`)
        waifuData = await WAIFU_APIS[i]()
        if (waifuData && waifuData.url) {
          apiUsed = i + 1
          console.log(`[WAIFU] API ${i + 1} SUCCESS`)
          break
        }
      } catch (e) {
        console.log(`[WAIFU] API ${i + 1} failed: ${e.message}`)
      }
    }

    if (!waifuData ||!waifuData.url) {
      throw new Error('No waifu found from all 16 sources')
    }

    // SUPER ENGLISH REPORT
    const caption = `╭─⌈ 💖 *RANDOM WAIFU* ⌋
│ Source: ${waifuData.source}
│ API: ${apiUsed}/${WAIFU_APIS.length}
│ Type: SFW Anime Girl
│ Quality: HD
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      image: { url: waifuData.url },
      caption: caption
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[WAIFU ERROR]', error.message)
    
    let errorMsg = '> Failed to get waifu image'
    if (error.message.includes('16 sources')) {
      errorMsg = '> All 16 APIs down. Try again later'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}