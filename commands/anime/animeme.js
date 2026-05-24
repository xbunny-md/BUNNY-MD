// commands/anime/animeme.js
import axios from 'axios'

export const name = 'animeme'
export const alias = ['ameme', 'ameme', 'meme']
export const category = 'Anime'
export const desc = 'Get random anime memes with 15 API fallbacks'

const TIMEOUT = 8000 // 8s per API

// 15 REAL ANIME MEME APIs
const MEME_APIS = [
  // 1. Meme API - Animemes
  async () => {
    const res = await axios.get('https://meme-api.com/gimme/animemes', { timeout: TIMEOUT })
    return {
      url: res.data?.url,
      title: res.data?.title,
      subreddit: res.data?.subreddit
    }
  },

  // 2. Meme API - GoodAnimemes
  async () => {
    const res = await axios.get('https://meme-api.com/gimme/GoodAnimemes', { timeout: TIMEOUT })
    return {
      url: res.data?.url,
      title: res.data?.title,
      subreddit: res.data?.subreddit
    }
  },

  // 3. Meme API - WholesomeAnimemes
  async () => {
    const res = await axios.get('https://meme-api.com/gimme/wholesomeanimemes', { timeout: TIMEOUT })
    return {
      url: res.data?.url,
      title: res.data?.title,
      subreddit: res.data?.subreddit
    }
  },

  // 4. Meme API - AnimeFunny
  async () => {
    const res = await axios.get('https://meme-api.com/gimme/animefunny', { timeout: TIMEOUT })
    return {
      url: res.data?.url,
      title: res.data?.title,
      subreddit: res.data?.subreddit
    }
  },

  // 5. Meme API - Anime_IRL
  async () => {
    const res = await axios.get('https://meme-api.com/gimme/anime_irl', { timeout: TIMEOUT })
    return {
      url: res.data?.url,
      title: res.data?.title,
      subreddit: res.data?.subreddit
    }
  },

  // 6. Reddit Random - animemes
  async () => {
    const res = await axios.get('https://www.reddit.com/r/animemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.over_18) return null
    return {
      url: post.url_overridden_by_dest || post.url,
      title: post.title,
      subreddit: post.subreddit
    }
  },

  // 7. Reddit Random - GoodAnimemes
  async () => {
    const res = await axios.get('https://www.reddit.com/r/GoodAnimemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.over_18) return null
    return {
      url: post.url_overridden_by_dest || post.url,
      title: post.title,
      subreddit: post.subreddit
    }
  },

  // 8. Reddit Random - wholesomeanimemes
  async () => {
    const res = await axios.get('https://www.reddit.com/r/wholesomeanimemes/random.json', { timeout: TIMEOUT })
    const post = res.data?.[0]?.data?.children?.[0]?.data
    if (!post || post.over_18) return null
    return {
      url: post.url_overridden_by_dest || post.url,
      title: post.title,
      subreddit: post.subreddit
    }
  },

  // 9. Some Random API
  async () => {
    const res = await axios.get('https://some-random-api.ml/meme', { timeout: TIMEOUT })
    return {
      url: res.data?.image,
      title: res.data?.caption,
      subreddit: 'Random'
    }
  },

  // 10. Duncte123
  async () => {
    const res = await axios.get('https://apis.duncte123.me/meme', { timeout: TIMEOUT })
    return {
      url: res.data?.data?.image,
      title: res.data?.data?.title,
      subreddit: res.data?.data?.subreddit
    }
  },

  // 11. Imgflip Anime
  async () => {
    const res = await axios.get('https://api.imgflip.com/get_memes', { timeout: TIMEOUT })
    const memes = res.data?.data?.memes?.filter(m => m.name.toLowerCase().includes('anime'))
    const meme = memes?.[Math.floor(Math.random() * memes.length)]
    return {
      url: meme?.url,
      title: meme?.name,
      subreddit: 'Imgflip'
    }
  },

  // 12. PopCat Meme
  async () => {
    const res = await axios.get('https://api.popcat.xyz/meme', { timeout: TIMEOUT })
    return {
      url: res.data?.image,
      title: res.data?.title,
      subreddit: 'PopCat'
    }
  },

  // 13. Meme Generator
  async () => {
    const res = await axios.get('https://meme-generator.com/api/v1/meme/random', { timeout: TIMEOUT })
    return {
      url: res.data?.url,
      title: res.data?.title,
      subreddit: 'Generator'
    }
  },

  // 14. 9GAG Anime
  async () => {
    const res = await axios.get('https://9gag.com/v1/group-posts/group/anime/type/hot', { timeout: TIMEOUT })
    const posts = res.data?.data?.posts
    const post = posts?.[Math.floor(Math.random() * posts.length)]
    return {
      url: post?.images?.image700?.url,
      title: post?.title,
      subreddit: '9GAG'
    }
  },

  // 15. Nekos.life Meme
  async () => {
    const res = await axios.get('https://nekos.life/api/v2/img/waifu', { timeout: TIMEOUT })
    return {
      url: res.data?.url,
      title: 'Random Waifu Meme',
      subreddit: 'Nekos.life'
    }
  }
]

export default async function animeme(sock, { msg, from }, botSettings) {
  try {
    await sock.sendMessage(from, {
      react: { text: '🤣', key: msg.key }
    })

    let memeData = null

    // TRY ALL 15 APIS SILENTLY
    for (let i = 0; i < MEME_APIS.length; i++) {
      try {
        memeData = await MEME_APIS[i]()
        if (memeData && memeData.url && memeData.url.includes('http')) break
      } catch (e) {
        continue
      }
    }

    if (!memeData ||!memeData.url) {
      throw new Error('No meme found')
    }

    // CLEAN DESIGN - NO API/SOURCE
    const caption = `╭─⌈ 🤣 *ANIME MEME* ⌋
│
│ ${memeData.title || 'Random Anime Meme'}
│
│ r/${memeData.subreddit || 'animemes'}
│
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      image: { url: memeData.url },
      caption: caption
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '💀', key: msg.key } })

  } catch (error) {
    console.error('[ANIMEME ERROR]', error.message)
    await sock.sendMessage(from, { 
      text: '> Failed to get meme. Try again' 
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}