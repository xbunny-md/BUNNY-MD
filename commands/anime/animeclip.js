// commands/anime/animeclip.js
import axios from 'axios'

export const name = 'animeclip'
export const alias = ['aclip', 'anishort', 'gif']
export const category = 'Anime'
export const desc = 'Get random anime short video clips: kiss, hug, pat, slap, kill, etc'

const TIMEOUT = 10000 // 10s for video

// SUPPORTED ACTIONS
const ACTIONS = ['kiss', 'hug', 'pat', 'slap', 'punch', 'kick', 'bite', 'lick', 'cuddle', 'poke', 'highfive', 'handhold', 'yeet', 'kill', 'cry', 'smile', 'wave', 'dance', 'blush', 'happy']

// 15 ANIME GIF/VIDEO APIs
const CLIP_APIS = [
  // 1. Nekos.best
  async (action) => {
    const res = await axios.get(`https://nekos.best/api/v2/${action}`, { timeout: TIMEOUT })
    const data = res.data?.results?.[0]
    return { url: data?.url, anime: data?.anime_name }
  },

  // 2. Waifu.pics
  async (action) => {
    const res = await axios.get(`https://api.waifu.pics/sfw/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Random' }
  },

  // 3. Purrbot.site
  async (action) => {
    const res = await axios.get(`https://purrbot.site/api/img/sfw/${action}/gif`, { timeout: TIMEOUT })
    return { url: res.data?.link, anime: 'Purrbot' }
  },

  // 4. OtakuGifs
  async (action) => {
    const res = await axios.get(`https://api.otakugifs.xyz/gif?reaction=${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'OtakuGifs' }
  },

  // 5. Nekos.life
  async (action) => {
    const res = await axios.get(`https://nekos.life/api/v2/img/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Nekos.life' }
  },

  // 6. Waifu.im
  async (action) => {
    const res = await axios.get('https://api.waifu.im/search', {
      params: { included_tags: action, is_nsfw: false, gif: true },
      timeout: TIMEOUT
    })
    return { url: res.data?.images?.[0]?.url, anime: res.data?.images?.[0]?.source || 'Waifu.im' }
  },

  // 7. Kyoko
  async (action) => {
    const res = await axios.get(`https://kyoko.rei.my.id/api/sfw/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Kyoko' }
  },

  // 8. Shiro.gg
  async (action) => {
    const res = await axios.get(`https://shiro.gg/api/images/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Shiro.gg' }
  },

  // 9. Anime-API
  async (action) => {
    const res = await axios.get(`https://anime-api.hisoka17.repl.co/gif/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.url, anime: 'Anime-API' }
  },

  // 10. Kawaii API
  async (action) => {
    const res = await axios.get(`https://kawaii.red/api/gif/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.response, anime: 'Kawaii.red' }
  },

  // 11. Weeb.sh
  async (action) => {
    const res = await axios.get(`https://api.weeb.sh/images/random`, {
      params: { type: action },
      headers: { 'Authorization': 'Bearer demo' },
      timeout: TIMEOUT
    })
    return { url: res.data?.url, anime: 'Weeb.sh' }
  },

  // 12. Pic.re
  async (action) => {
    const res = await axios.get(`https://pic.re/gif/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.file_url, anime: 'Pic.re' }
  },

  // 13. Some Random API
  async (action) => {
    const res = await axios.get(`https://some-random-api.ml/animu/${action}`, { timeout: TIMEOUT })
    return { url: res.data?.link, anime: 'Random API' }
  },

  // 14. Tenor Anime
  async (action) => {
    const res = await axios.get(`https://tenor.googleapis.com/v2/search`, {
      params: { q: `anime ${action}`, key: 'LIVDSRZULELA', limit: 20, media_filter: 'gif' },
      timeout: TIMEOUT
    })
    const gif = res.data?.results?.[Math.floor(Math.random() * res.data.results.length)]
    return { url: gif?.media_formats?.gif?.url, anime: 'Tenor' }
  },

  // 15. Giphy Anime
  async (action) => {
    const res = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
      params: { q: `anime ${action}`, api_key: 'dc6zaTOxFJmzC', limit: 20 },
      timeout: TIMEOUT
    })
    const gif = res.data?.data?.[Math.floor(Math.random() * res.data.data.length)]
    return { url: gif?.images?.original?.url, anime: 'Giphy' }
  }
]

export default async function animeclip(sock, { msg, from, args }, botSettings) {
  try {
    let action = args[0]?.toLowerCase()
    
    if (!action) {
      return await sock.sendMessage(from, {
        text: `> Usage: .animeclip <action>\n\n*Available Actions:*\n${ACTIONS.join(', ')}\n\n*Example:* .animeclip kiss`
      }, { quoted: msg })
    }

    // Check if action is valid
    if (!ACTIONS.includes(action)) {
      return await sock.sendMessage(from, {
        text: `> Invalid action "${action}"\n\n*Available:*\n${ACTIONS.join(', ')}`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      react: { text: '🎬', key: msg.key }
    })

    let clipData = null

    // TRY ALL 15 APIS SILENTLY
    for (let i = 0; i < CLIP_APIS.length; i++) {
      try {
        clipData = await CLIP_APIS[i](action)
        if (clipData && clipData.url.includes('http')) break
      } catch (e) {
        continue
      }
    }

    if (!clipData ||!clipData.url) {
      throw new Error('No clip found')
    }

    // CLEAN DESIGN
    const caption = `╭─⌈ 🎬 *ANIME CLIP* ⌋
│
│ Action: ${action.toUpperCase()}
│ Anime: ${clipData.anime || 'Unknown'}
│
╰⊷ *Powered By Bunny Tech*`

    // Send as video if mp4, else as gif
    if (clipData.url.includes('.mp4')) {
      await sock.sendMessage(from, {
        video: { url: clipData.url },
        caption: caption,
        gifPlayback: true
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        video: { url: clipData.url },
        caption: caption,
        gifPlayback: true
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '✨', key: msg.key } })

  } catch (error) {
    console.error('[ANIMECLIP ERROR]', error.message)
    await sock.sendMessage(from, { 
      text: `> Failed to get ${args[0]} clip. Try again` 
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}