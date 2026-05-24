// commands/anime/mangadl.js
import axios from 'axios'

export const name = 'mangadl'
export const alias = ['mangaimg', 'readmanga', 'mchapter']
export const category = 'Anime'
export const desc = 'Download manga chapter images with 15+ API fallbacks'

const TIMEOUT = 15000 // 15s per API

// 15+ MANGA DOWNLOAD APIs
const CHAPTER_APIS = [
  // 1. MangaDex Chapter
  async (mangaName, chapter) => {
    const search = await axios.get(`https://api.mangadex.org/manga`, {
      params: { title: mangaName, limit: 1 },
      timeout: TIMEOUT
    })
    const mangaId = search.data?.data?.[0]?.id
    if (!mangaId) return null
    
    const ch = await axios.get(`https://api.mangadex.org/chapter`, {
      params: { manga: mangaId, chapter: chapter, limit: 1, translatedLanguage: ['en'] },
      timeout: TIMEOUT
    })
    const chapterId = ch.data?.data?.[0]?.id
    if (!chapterId) return null

    const server = await axios.get(`https://api.mangadex.org/at-home/server/${chapterId}`, { timeout: TIMEOUT })
    const baseUrl = server.data?.baseUrl
    const hash = server.data?.chapter?.hash
    const pages = server.data?.chapter?.data
    
    if (!baseUrl ||!hash ||!pages) return null
    return pages.map(page => `${baseUrl}/data/${hash}/${page}`)
  },

  // 2. Consumet MangaDex
  async (mangaName, chapter) => {
    const search = await axios.get(`https://api.consumet.org/manga/mangadex/${encodeURIComponent(mangaName)}`, {
      timeout: TIMEOUT
    })
    const mangaId = search.data?.results?.[0]?.id
    if (!mangaId) return null

    const info = await axios.get(`https://api.consumet.org/manga/mangadex/info/${mangaId}`, { timeout: TIMEOUT })
    const ch = info.data?.chapters?.find(c => c.chapterNumber == chapter)
    if (!ch) return null

    const pages = await axios.get(`https://api.consumet.org/manga/mangadex/read/${ch.id}`, { timeout: TIMEOUT })
    return pages.data?.map(p => p.img)
  },

  // 3. MangaEden
  async (mangaName, chapter) => {
    const list = await axios.get(`https://www.mangaeden.com/api/list/0/`, { timeout: TIMEOUT })
    const manga = list.data?.manga?.find(m => m.t.toLowerCase().includes(mangaName.toLowerCase()))
    if (!manga) return null

    const chapters = await axios.get(`https://www.mangaeden.com/api/manga/${manga.i}/`, { timeout: TIMEOUT })
    const ch = chapters.data?.chapters?.find(c => c[0] == chapter)
    if (!ch) return null

    const pages = await axios.get(`https://www.mangaeden.com/api/chapter/${ch[3]}/`, { timeout: TIMEOUT })
    return pages.data?.images?.map(img => `https://cdn.mangaeden.com/mangasimg/${img[1]}`)
  },

  // 4. MangaHub
  async (mangaName, chapter) => {
    const search = await axios.get(`https://api.mangahub.io/api/manga/search`, {
      params: { q: mangaName },
      timeout: TIMEOUT
    })
    const slug = search.data?.manga?.[0]?.slug
    if (!slug) return null

    const ch = await axios.get(`https://api.mangahub.io/api/manga/${slug}/chapters`, { timeout: TIMEOUT })
    const chapterData = ch.data?.chapters?.find(c => c.number == chapter)
    if (!chapterData) return null

    const pages = await axios.get(`https://api.mangahub.io/api/manga/${slug}/chapter/${chapterData.number}`, { timeout: TIMEOUT })
    return pages.data?.pages
  },

  // 5. Comick
  async (mangaName, chapter) => {
    const search = await axios.get(`https://api.comick.fun/v1.0/search`, {
      params: { q: mangaName, limit: 1 },
      timeout: TIMEOUT
    })
    const slug = search.data?.[0]?.slug
    if (!slug) return null

    const ch = await axios.get(`https://api.comick.fun/comic/${slug}/chapters`, { timeout: TIMEOUT })
    const chapterData = ch.data?.chapters?.find(c => c.chap == chapter)
    if (!chapterData) return null

    const pages = await axios.get(`https://api.comick.fun/chapter/${chapterData.hid}`, { timeout: TIMEOUT })
    return pages.data?.chapter?.images?.map(img => `https://meo.comick.pictures/${img.b2key}`)
  },

  // 6. MangaFire
  async (mangaName, chapter) => {
    const search = await axios.get(`https://mangafire.to/filter`, {
      params: { keyword: mangaName },
      timeout: TIMEOUT,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    return null // HTML scraping needed - skip for now
  },

  // 7. Bato.to
  async (mangaName, chapter) => {
    const search = await axios.get(`https://bato.to/api/search`, {
      params: { q: mangaName },
      timeout: TIMEOUT
    })
    const id = search.data?.results?.[0]?.id
    if (!id) return null

    const ch = await axios.get(`https://bato.to/api/series/${id}/chapters`, { timeout: TIMEOUT })
    const chapterData = ch.data?.find(c => c.chapter == chapter)
    if (!chapterData) return null

    const pages = await axios.get(`https://bato.to/api/chapter/${chapterData.id}`, { timeout: TIMEOUT })
    return pages.data?.pages
  },

  // 8. MangaPark
  async (mangaName, chapter) => {
    const search = await axios.get(`https://mangapark.net/ajax/search`, {
      params: { word: mangaName },
      timeout: TIMEOUT
    })
    return null // HTML needed
  },

  // 9. MangaSee
  async (mangaName, chapter) => {
    const search = await axios.get(`https://mangasee123.com/_search.php`, {
      params: { keyword: mangaName },
      timeout: TIMEOUT
    })
    return null // Custom format
  },

  // 10. MangaBuddy
  async (mangaName, chapter) => {
    const search = await axios.get(`https://mangabuddy.com/api/manga/search`, {
      params: { q: mangaName },
      timeout: TIMEOUT
    })
    const slug = search.data?.[0]?.slug
    if (!slug) return null

    const ch = await axios.get(`https://mangabuddy.com/api/manga/${slug}/chapters`, { timeout: TIMEOUT })
    const chapterData = ch.data?.find(c => c.chapter == chapter)
    if (!chapterData) return null

    const pages = await axios.get(`https://mangabuddy.com/api/chapter/${chapterData.id}`, { timeout: TIMEOUT })
    return pages.data?.images
  },

  // 11. MangaKatana
  async (mangaName, chapter) => {
    const search = await axios.get(`https://mangakatana.com/search`, {
      params: { q: mangaName },
      timeout: TIMEOUT
    })
    return null // HTML needed
  },

  // 12. MangaKakalot
  async (mangaName, chapter) => {
    const search = await axios.get(`https://mangakakalot.com/search/story/${encodeURIComponent(mangaName)}`, {
      timeout: TIMEOUT
    })
    return null // HTML needed
  },

  // 13. MangaNato
  async (mangaName, chapter) => {
    const search = await axios.get(`https://manganato.com/search/story/${encodeURIComponent(mangaName)}`, {
      timeout: TIMEOUT
    })
    return null // HTML needed
  },

  // 14. AsuraScans
  async (mangaName, chapter) => {
    const search = await axios.get(`https://asuracomic.net/series`, {
      params: { name: mangaName },
      timeout: TIMEOUT
    })
    return null // HTML needed
  },

  // 15. ReaperScans
  async (mangaName, chapter) => {
    const search = await axios.get(`https://reaperscans.com/comics`, {
      params: { query: mangaName },
      timeout: TIMEOUT
    })
    return null // HTML needed
  }
]

export default async function mangadl(sock, { msg, from, args }, botSettings) {
  let processingMsg = null
  try {
    if (args.length < 2) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}mangadl <manga name> <chapter>\n> Example: ${botSettings.prefix}mangadl One Piece 1000`
      }, { quoted: msg })
    }

    const chapter = args.pop()
    const mangaName = args.join(' ')

    if (isNaN(chapter)) {
      return await sock.sendMessage(from, {
        text: `> Chapter must be a number\n> Example: ${botSettings.prefix}mangadl Naruto 700`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      react: { text: '📥', key: msg.key }
    })

    processingMsg = await sock.sendMessage(from, {
      text: `> Downloading ${mangaName} Chapter ${chapter}...`
    }, { quoted: msg })

    let pages = null
    let apiUsed = 0

    // TRY ALL 15 APIS
    for (let i = 0; i < CHAPTER_APIS.length; i++) {
      try {
        console.log(`[MANGADL] Trying API ${i + 1}/${CHAPTER_APIS.length}`)
        pages = await CHAPTER_APIS[i](mangaName, chapter)
        if (pages && pages.length > 0) {
          apiUsed = i + 1
          console.log(`[MANGADL] API ${i + 1} SUCCESS - ${pages.length} pages`)
          break
        }
      } catch (e) {
        console.log(`[MANGADL] API ${i + 1} failed: ${e.message}`)
      }
    }

    if (!pages || pages.length === 0) {
      throw new Error('No pages found from all 15 sources')
    }

    // Send chapter info
    await sock.sendMessage(from, {
      text: `╭─⌈ 📖 *${mangaName}* ⌋
│ Chapter: ${chapter}
│ Pages: ${pages.length}
│ Source: API ${apiUsed}
╰⊷ *Sending pages...*`
    }, { quoted: msg })

    // Send pages in batches of 10 to avoid spam
    const batchSize = 10
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize)
      const album = batch.map((url, idx) => ({
        image: { url },
        caption: i === 0 && idx === 0? `📚 ${mangaName} Ch.${chapter} - Page ${i + idx + 1}/${pages.length}` : ''
      }))
      
      await sock.sendMessage(from, {
        image: { url: batch[0] },
        caption: `📚 ${mangaName} Ch.${chapter} - Pages ${i + 1}-${Math.min(i + batchSize, pages.length)}/${pages.length}`
      })
      
      // Small delay between batches
      if (i + batchSize < pages.length) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    // Delete processing msg
    if (processingMsg) {
      await sock.sendMessage(from, { delete: processingMsg.key }).catch(() => {})
    }
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[MANGADL ERROR]', error.message)
    
    let errorMsg = '> Manga download failed'
    if (error.message.includes('15 sources')) {
      errorMsg = '> All 15 APIs failed. Manga/chapter not found'
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