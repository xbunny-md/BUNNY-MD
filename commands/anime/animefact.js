// commands/anime/animefact.js
import axios from 'axios'

export const name = 'animefact'
export const alias = ['afact', 'anifact', 'annfact']
export const category = 'Anime'
export const desc = 'Get random anime facts with 15 API fallbacks'

const TIMEOUT = 8000 // 8s per API

// 15 REAL ANIME FACT APIs - NO LOCAL
const FACT_APIS = [
  // 1. AnimeFacts REST API
  async () => {
    const res = await axios.get('https://anime-facts-rest-api.herokuapp.com/api/v1', { timeout: TIMEOUT })
    return {
      fact: res.data?.data?.fact,
      anime: res.data?.data?.anime_name,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.data?.anime_name)}&background=random&size=512`
    }
  },

  // 2. Jikan Anime Random
  async () => {
    const randomId = Math.floor(Math.random() * 50000) + 1
    const res = await axios.get(`https://api.jikan.moe/v4/anime/${randomId}`, { timeout: TIMEOUT })
    const a = res.data?.data
    if (!a ||!a.synopsis) return null
    return {
      fact: a.synopsis.split('.')[0] + '.',
      anime: a.title,
      image: a.images?.jpg?.large_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.title)}&background=random&size=512`
    }
  },

  // 3. Anilist Random
  async () => {
    const res = await axios.post('https://graphql.anilist.co', {
      query: `query { Page(page: ${Math.floor(Math.random() * 1000)}, perPage: 1) { media(type: ANIME) { title { romaji } description coverImage { large } } } }`
    }, { timeout: TIMEOUT })
    const a = res.data?.data?.Page?.media?.[0]
    if (!a) return null
    return {
      fact: a.description?.replace(/<[^>]*>/g, '').split('.')[0] + '.',
      anime: a.title?.romaji,
      image: a.coverImage?.large
    }
  },

  // 4. Kitsu Random
  async () => {
    const offset = Math.floor(Math.random() * 1000)
    const res = await axios.get(`https://kitsu.io/api/edge/anime`, {
      params: { 'page[limit]': 1, 'page[offset]': offset },
      timeout: TIMEOUT,
      headers: { 'Accept': 'application/vnd.api+json' }
    })
    const a = res.data?.data?.[0]?.attributes
    if (!a) return null
    return {
      fact: a.synopsis?.split('.')[0] + '.',
      anime: a.canonicalTitle,
      image: a.posterImage?.large
    }
  },

  // 5. AnimeChan Facts
  async () => {
    const res = await axios.get('https://animechan.xyz/api/random', { timeout: TIMEOUT })
    return {
      fact: `From ${res.data?.anime}: "${res.data?.quote}"`,
      anime: res.data?.anime,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.character)}&background=random&size=512`
    }
  },

  // 6. Shikimori Random
  async () => {
    const page = Math.floor(Math.random() * 100) + 1
    const res = await axios.get(`https://shikimori.one/api/animes`, {
      params: { page, limit: 1 },
      timeout: TIMEOUT
    })
    const a = res.data?.[0]
    if (!a) return null
    const detail = await axios.get(`https://shikimori.one/api/animes/${a.id}`, { timeout: TIMEOUT })
    return {
      fact: detail.data?.description?.split('.')[0] + '.',
      anime: detail.data?.name,
      image: `https://shikimori.one${detail.data?.image?.original}`
    }
  },

  // 7. MangaDex Anime
  async () => {
    const res = await axios.get('https://api.mangadex.org/manga/random', { timeout: TIMEOUT })
    const a = res.data?.data?.attributes
    if (!a) return null
    return {
      fact: a.description?.en?.split('.')[0] + '.',
      anime: a.title?.en || Object.values(a.title || {})[0],
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(a.title?.en)}&background=random&size=512`
    }
  },

  // 8. Enime Random
  async () => {
    const res = await axios.get('https://api.enime.moe/recent', { timeout: TIMEOUT })
    const a = res.data?.data?.[Math.floor(Math.random() * res.data.data.length)]
    if (!a) return null
    return {
      fact: a.description?.split('.')[0] + '.',
      anime: a.title?.english || a.title?.romaji,
      image: a.coverImage
    }
  },

  // 9. Simkl Random
  async () => {
    const res = await axios.get('https://api.simkl.com/anime/random', { timeout: TIMEOUT })
    const a = res.data
    if (!a) return null
    return {
      fact: a.overview?.split('.')[0] + '.',
      anime: a.title,
      image: `https://simkl.in/posters/${a.poster}_m.jpg`
    }
  },

  // 10. LiveChart Random
  async () => {
    const res = await axios.get('https://www.livechart.me/api/v1/anime/recent', { timeout: TIMEOUT })
    const a = res.data?.[Math.floor(Math.random() * res.data.length)]
    if (!a) return null
    return {
      fact: a.description?.split('.')[0] + '.',
      anime: a.title_en || a.title_romaji,
      image: a.poster_image
    }
  },

  // 11. NotifyMoe Random
  async () => {
    const res = await axios.get('https://notify.moe/api/anime/random', { timeout: TIMEOUT })
    const a = res.data
    if (!a) return null
    return {
      fact: a.summary?.split('.')[0] + '.',
      anime: a.title,
      image: a.image
    }
  },

  // 12. Consumet Random
  async () => {
    const res = await axios.get('https://api.consumet.org/anime/gogoanime/top-airing', { timeout: TIMEOUT })
    const a = res.data?.results?.[Math.floor(Math.random() * res.data.results.length)]
    if (!a) return null
    return {
      fact: `Top airing anime: ${a.title} with ${a.genres?.join(', ')} genres.`,
      anime: a.title,
      image: a.image
    }
  },

  // 13. AnimeSchedule Random
  async () => {
    const res = await axios.get('https://animeschedule.net/api/v3/anime', { timeout: TIMEOUT })
    const a = res.data?.anime?.[Math.floor(Math.random() * res.data.anime.length)]
    if (!a) return null
    return {
      fact: a.summary?.split('.')[0] + '.',
      anime: a.title,
      image: a.imageVersionRoute
    }
  },

  // 14. Waifu.it Facts
  async () => {
    const res = await axios.get('https://waifu.it/api/v4/fact', { timeout: TIMEOUT })
    return {
      fact: res.data?.fact,
      anime: 'Anime World',
      image: `https://ui-avatars.com/api/?name=Anime+Fact&background=random&size=512`
    }
  },

  // 15. Nekos.best Facts
  async () => {
    const res = await axios.get('https://nekos.best/api/v2/fact', { timeout: TIMEOUT })
    return {
      fact: res.data?.results?.[0]?.fact,
      anime: 'Anime Culture',
      image: `https://ui-avatars.com/api/?name=Anime+Fact&background=random&size=512`
    }
  }
]

export default async function animefact(sock, { msg, from }, botSettings) {
  try {
    await sock.sendMessage(from, {
      react: { text: '📚', key: msg.key }
    })

    let factData = null

    // TRY ALL 15 APIS SILENTLY
    for (let i = 0; i < FACT_APIS.length; i++) {
      try {
        factData = await FACT_APIS[i]()
        if (factData && factData.fact && factData.fact.length > 10) break
      } catch (e) {
        continue
      }
    }

    if (!factData ||!factData.fact) {
      throw new Error('No fact found')
    }

    // CLEAN MESSAGE - NO API/SOURCE
    const caption = `╭─⌈ 📚 *ANIME FACT* ⌋
│
│ ${factData.fact}
│
│ *Anime:* ${factData.anime}
│
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      image: { url: factData.image },
      caption: caption
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '✨', key: msg.key } })

  } catch (error) {
    console.error('[ANIMEFACT ERROR]', error.message)
    await sock.sendMessage(from, { 
      text: '> Failed to get anime fact. Try again' 
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}