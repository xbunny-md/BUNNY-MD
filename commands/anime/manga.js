// commands/anime/manga.js
import axios from 'axios'

export const name = 'manga'
export const alias = ['manga', 'mangasearch', 'manhwa']
export const category = 'Anime'
export const desc = 'Search manga/manhwa info with 15+ API fallbacks + features'

const TIMEOUT = 10000 // 10s per API

// 15+ REALTIME MANGA APIs
const MANGA_APIS = [
  // 1. Jikan - MyAnimeList Manga
  async (query) => {
    const res = await axios.get(`https://api.jikan.moe/v4/manga`, {
      params: { q: query, limit: 1 },
      timeout: TIMEOUT
    })
    const m = res.data?.data?.[0]
    if (!m) return null
    return {
      title: m.title,
      title_jp: m.title_japanese,
      chapters: m.chapters,
      volumes: m.volumes,
      score: m.score,
      status: m.status,
      published: m.published?.string,
      genres: m.genres?.map(g => g.name).join(', '),
      synopsis: m.synopsis,
      image: m.images?.jpg?.large_image_url,
      url: m.url,
      author: m.authors?.[0]?.name,
      type: m.type,
      rank: m.rank,
      popularity: m.popularity
    }
  },

  // 2. Anilist GraphQL
  async (query) => {
    const res = await axios.post('https://graphql.anilist.co', {
      query: `query ($search: String) { Media(search: $search, type: MANGA) { title { romaji native } chapters volumes averageScore status startDate { year } genres description staff { nodes { name { full } } } coverImage { large } siteUrl format } }`,
      variables: { search: query }
    }, { timeout: TIMEOUT })
    const m = res.data?.data?.Media
    if (!m) return null
    return {
      title: m.title?.romaji,
      title_jp: m.title?.native,
      chapters: m.chapters,
      volumes: m.volumes,
      score: m.averageScore / 10,
      status: m.status,
      published: m.startDate?.year,
      genres: m.genres?.join(', '),
      synopsis: m.description?.replace(/<[^>]*>/g, ''),
      image: m.coverImage?.large,
      url: m.siteUrl,
      author: m.staff?.nodes?.[0]?.name?.full,
      type: m.format,
      rank: null,
      popularity: null
    }
  },

  // 3. Kitsu Manga
  async (query) => {
    const res = await axios.get(`https://kitsu.io/api/edge/manga`, {
      params: { 'filter[text]': query, 'page[limit]': 1 },
      timeout: TIMEOUT,
      headers: { 'Accept': 'application/vnd.api+json' }
    })
    const m = res.data?.data?.[0]?.attributes
    if (!m) return null
    return {
      title: m.canonicalTitle,
      title_jp: m.titles?.ja_jp,
      chapters: m.chapterCount,
      volumes: m.volumeCount,
      score: m.averageRating,
      status: m.status,
      published: m.startDate,
      genres: null,
      synopsis: m.synopsis,
      image: m.posterImage?.large,
      url: `https://kitsu.io/manga/${res.data.data[0].id}`,
      author: null,
      type: m.mangaType,
      rank: null,
      popularity: m.popularityRank
    }
  },

  // 4. MangaDex
  async (query) => {
    const res = await axios.get(`https://api.mangadex.org/manga`, {
      params: { title: query, limit: 1, includes: ['cover_art', 'author'] },
      timeout: TIMEOUT
    })
    const m = res.data?.data?.[0]
    if (!m) return null
    const cover = m.relationships?.find(r => r.type === 'cover_art')
    const author = m.relationships?.find(r => r.type === 'author')
    return {
      title: m.attributes?.title?.en || Object.values(m.attributes?.title || {})[0],
      title_jp: m.attributes?.title?.ja,
      chapters: m.attributes?.lastChapter,
      volumes: m.attributes?.lastVolume,
      score: m.attributes?.rating?.bayesian,
      status: m.attributes?.status,
      published: m.attributes?.year,
      genres: m.attributes?.tags?.map(t => t.attributes?.name?.en).join(', '),
      synopsis: m.attributes?.description?.en,
      image: cover? `https://uploads.mangadex.org/covers/${m.id}/${cover.attributes?.fileName}` : null,
      url: `https://mangadex.org/title/${m.id}`,
      author: author?.attributes?.name,
      type: m.attributes?.publicationDemographic,
      rank: null,
      popularity: null
    }
  },

  // 5. MangaUpdates
  async (query) => {
    const res = await axios.post(`https://api.mangaupdates.com/v1/series/search`, {
      search: query,
      perpage: 1
    }, { timeout: TIMEOUT })
    const id = res.data?.results?.[0]?.record?.series_id
    if (!id) return null
    const detail = await axios.get(`https://api.mangaupdates.com/v1/series/${id}`, { timeout: TIMEOUT })
    const m = detail.data
    return {
      title: m.title,
      title_jp: null,
      chapters: m.latest_chapter,
      volumes: m.latest_volume,
      score: m.bayesian_rating,
      status: m.completed? 'Finished' : 'Publishing',
      published: m.year,
      genres: m.genres?.map(g => g.genre).join(', '),
      synopsis: m.description,
      image: m.image?.url?.original,
      url: m.url,
      author: m.authors?.[0]?.name,
      type: m.type,
      rank: m.rank,
      popularity: null
    }
  },

  // 6. Consumet Manga
  async (query) => {
    const res = await axios.get(`https://api.consumet.org/manga/mangadex/${encodeURIComponent(query)}`, {
      timeout: TIMEOUT
    })
    const m = res.data?.results?.[0]
    if (!m) return null
    return {
      title: m.title,
      title_jp: null,
      chapters: null,
      volumes: null,
      score: null,
      status: null,
      published: null,
      genres: null,
      synopsis: m.description,
      image: m.image,
      url: `https://mangadex.org/title/${m.id}`,
      author: null,
      type: null,
      rank: null,
      popularity: null
    }
  },

  // 7. Shikimori Manga
  async (query) => {
    const res = await axios.get(`https://shikimori.one/api/mangas`, {
      params: { search: query, limit: 1 },
      timeout: TIMEOUT
    })
    const m = res.data?.[0]
    if (!m) return null
    return {
      title: m.name,
      title_jp: m.russian,
      chapters: m.chapters,
      volumes: m.volumes,
      score: m.score,
      status: m.status,
      published: m.aired_on,
      genres: m.genres?.map(g => g.name).join(', '),
      synopsis: null,
      image: `https://shikimori.one${m.image?.original}`,
      url: `https://shikimori.one/mangas/${m.id}`,
      author: null,
      type: m.kind,
      rank: null,
      popularity: null
    }
  },

  // 8. AniList Manga V2
  async (query) => {
    const res = await axios.get(`https://api.ani.zip/mappings`, {
      params: { anilist_id: query },
      timeout: TIMEOUT
    })
    return null // Needs ID mapping - skip
  },

  // 9. MangaAPI
  async (query) => {
    const res = await axios.get(`https://mangaapi.herokuapp.com/api/search`, {
      params: { q: query },
      timeout: TIMEOUT
    })
    const m = res.data?.[0]
    if (!m) return null
    return {
      title: m.title,
      title_jp: null,
      chapters: m.chapters,
      volumes: m.volumes,
      score: m.rating,
      status: m.status,
      published: m.year,
      genres: m.genres?.join(', '),
      synopsis: m.description,
      image: m.cover,
      url: m.link,
      author: m.author,
      type: m.type,
      rank: null,
      popularity: null
    }
  },

  // 10. MangaEden
  async (query) => {
    const res = await axios.get(`https://www.mangaeden.com/api/list/0/`, {
      timeout: TIMEOUT
    })
    const manga = res.data?.manga?.find(m => m.t.toLowerCase().includes(query.toLowerCase()))
    if (!manga) return null
    return {
      title: manga.t,
      title_jp: null,
      chapters: manga.ld,
      volumes: null,
      score: null,
      status: manga.s === 1? 'Ongoing' : 'Complete',
      published: null,
      genres: manga.c?.join(', '),
      synopsis: null,
      image: `https://cdn.mangaeden.com/mangasimg/${manga.im}`,
      url: `https://www.mangaeden.com/en/en-manga/${manga.a}`,
      author: manga.a,
      type: null,
      rank: null,
      popularity: manga.h
    }
  },

  // 11. MangaHub
  async (query) => {
    const res = await axios.get(`https://api.mangahub.io/api/manga/search`, {
      params: { q: query },
      timeout: TIMEOUT
    })
    const m = res.data?.manga?.[0]
    if (!m) return null
    return {
      title: m.title,
      title_jp: null,
      chapters: m.latestChapter,
      volumes: null,
      score: m.rating,
      status: m.status,
      published: m.year,
      genres: m.genres?.join(', '),
      synopsis: m.description,
      image: m.image,
      url: m.url,
      author: m.author,
      type: null,
      rank: null,
      popularity: null
    }
  },

  // 12. Comick
  async (query) => {
    const res = await axios.get(`https://api.comick.fun/v1.0/search`, {
      params: { q: query, limit: 1 },
      timeout: TIMEOUT
    })
    const m = res.data?.[0]
    if (!m) return null
    return {
      title: m.title,
      title_jp: null,
      chapters: m.last_chapter,
      volumes: null,
      score: m.rating,
      status: m.status,
      published: m.year,
      genres: m.md_comic_md_genres?.map(g => g.md_genres?.name).join(', '),
      synopsis: m.desc,
      image: `https://meo.comick.pictures/${m.md_covers?.[0]?.b2key}`,
      url: `https://comick.fun/comic/${m.slug}`,
      author: null,
      type: m.country,
      rank: null,
      popularity: null
    }
  },

  // 13. MangaPark
  async (query) => {
    const res = await axios.get(`https://mangapark.net/ajax/search`, {
      params: { word: query },
      timeout: TIMEOUT
    })
    return null // HTML needed
  },

  // 14. Bato.to
  async (query) => {
    const res = await axios.get(`https://bato.to/api/search`, {
      params: { q: query },
      timeout: TIMEOUT
    })
    const m = res.data?.results?.[0]
    if (!m) return null
    return {
      title: m.title,
      title_jp: null,
      chapters: m.last_chapter,
      volumes: null,
      score: m.rating,
      status: m.status,
      published: m.year,
      genres: m.genres?.join(', '),
      synopsis: m.description,
      image: m.cover,
      url: `https://bato.to/series/${m.id}`,
      author: m.authors?.[0],
      type: null,
      rank: null,
      popularity: null
    }
  },

  // 15. MangaFire
  async (query) => {
    const res = await axios.get(`https://mangafire.to/filter`, {
      params: { keyword: query },
      timeout: TIMEOUT
    })
    return null // HTML needed
  }
]

export default async function manga(sock, { msg, from, args }, botSettings) {
  let processingMsg = null
  try {
    const query = args.join(' ')
    if (!query) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}manga <name>\n> Example: ${botSettings.prefix}manga One Piece`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      react: { text: '📚', key: msg.key }
    })

    processingMsg = await sock.sendMessage(from, {
      text: `> Searching manga "${query}"...`
    }, { quoted: msg })

    let mangaData = null
    let apiUsed = 0

    // TRY ALL 15 APIS
    for (let i = 0; i < MANGA_APIS.length; i++) {
      try {
        console.log(`[MANGA] Trying API ${i + 1}/${MANGA_APIS.length}`)
        mangaData = await MANGA_APIS[i](query)
        if (mangaData && mangaData.title) {
          apiUsed = i + 1
          console.log(`[MANGA] API ${i + 1} SUCCESS`)
          break
        }
      } catch (e) {
        console.log(`[MANGA] API ${i + 1} failed: ${e.message}`)
      }
    }

    if (!mangaData) {
      throw new Error('No results from all 15 sources')
    }

    // FEATURES: Simple English Report
    const report = `╭─⌈ 📚 *${mangaData.title}* ⌋
│ Japanese: ${mangaData.title_jp || 'N/A'}
│ Type: ${mangaData.type || 'Manga'}
│ Author: ${mangaData.author || 'Unknown'}
│ Chapters: ${mangaData.chapters || '?'}
│ Volumes: ${mangaData.volumes || '?'}
│ Score: ${mangaData.score || 'N/A'}/10
│ Status: ${mangaData.status || 'Unknown'}
│ Published: ${mangaData.published || 'N/A'}
│ Rank: #${mangaData.rank || 'N/A'}
│ Popularity: #${mangaData.popularity || 'N/A'}
│ Genres: ${mangaData.genres || 'N/A'}
│
│ Synopsis: ${(mangaData.synopsis || 'No synopsis available').slice(0, 250)}...
╰⊷ *Source: API ${apiUsed} • Powered By Bunny Tech*`

    // Send with thumbnail
    if (mangaData.image) {
      await sock.sendMessage(from, {
        image: { url: mangaData.image },
        caption: report
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, { text: report }, { quoted: msg })
    }

    // Delete processing msg
    if (processingMsg) {
      await sock.sendMessage(from, { delete: processingMsg.key }).catch(() => {})
    }
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[MANGA ERROR]', error.message)
    
    let errorMsg = '> Manga search failed'
    if (error.message.includes('15 sources')) {
      errorMsg = '> All 15 APIs failed. Try again later'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })

    if (processingMsg) {
      try {
        await sock.sendMessage(from, { delete: processingMsg.key })
      } catch {}
    }
  }
}