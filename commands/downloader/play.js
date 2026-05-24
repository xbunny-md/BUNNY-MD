// commands/downloader/play.js
import axios from 'axios'
import yts from 'yt-search'

export const name = 'play'
export const alias = ['song', 'ytaudio', 'music']
export const category = 'Downloader'
export const desc = 'Search and download music from YouTube with 15+ API fallbacks'

const TIMEOUT = 30000 // 30s per API

// 15+ APIs - MP3 DOWNLOAD
const APIS = [
  // 1. SaveTube
  async (url) => {
    const res = await axios.get(`https://www.savetube.me/api/v1/info`, {
      params: { url },
      timeout: TIMEOUT,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const mp3 = res.data?.data?.audio_formats?.find(f => f.quality === '128kbps' || f.format === 'mp3')
    return mp3?.url || res.data?.data?.audio_formats?.[0]?.url
  },
  
  // 2. Y2Mate
  async (url) => {
    const res = await axios.get(`https://www.y2mate.com/mates/analyzeV2/ajax`, {
      params: { k_query: url, k_page: 'home', q_auto: 0 },
      timeout: TIMEOUT,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    return res.data?.links?.mp3?.['128']?.url || res.data?.links?.mp3?.['mp3128']?.url
  },

  // 3. Cobalt
  async (url) => {
    const res = await axios.post('https://co.wuk.sh/api/json', {
      url, aFormat: 'mp3', isAudioOnly: true
    }, {
      timeout: TIMEOUT,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    })
    if (res.data?.status === 'stream' || res.data?.status === 'redirect') return res.data.url
  },

  // 4. Loader.to
  async (url) => {
    const res = await axios.get(`https://loader.to/ajax/download.php`, {
      params: { format: 'mp3', url },
      timeout: TIMEOUT
    })
    return res.data?.download_url || res.data?.link
  },

  // 5. 9Convert
  async (url) => {
    const res = await axios.get(`https://9convert.com/api/ajaxSearch/index`, {
      params: { query: url, vt: 'mp3' },
      timeout: TIMEOUT
    })
    const mp3 = res.data?.links?.mp3?.find(l => l.q === '128kbps')
    return mp3?.url
  },

  // 6. YT1s
  async (url) => {
    const res = await axios.get(`https://yt1s.com/api/ajaxSearch/index`, {
      params: { q: url, vt: 'mp3' },
      timeout: TIMEOUT
    })
    return res.data?.links?.mp3?.['128']?.url
  },

  // 7. KeepVid
  async (url) => {
    const res = await axios.get(`https://keepv.id/api/v1/youtube`, {
      params: { url, format: 'mp3' },
      timeout: TIMEOUT
    })
    return res.data?.link
  },

  // 8. MP3Convert
  async (url) => {
    const res = await axios.post('https://www.mp3convert.org/api/convert', {
      url, format: 'mp3'
    }, { timeout: TIMEOUT })
    return res.data?.url
  },

  // 9. YTMp3
  async (url) => {
    const res = await axios.get(`https://ytmp3.cc/api/download/`, {
      params: { url, format: 'mp3' },
      timeout: TIMEOUT
    })
    return res.data?.link
  },

  // 10. OnlineVideoConverter
  async (url) => {
    const res = await axios.get(`https://onlinevideoconverter.com/api/convert`, {
      params: { url, format: 'mp3' },
      timeout: TIMEOUT
    })
    return res.data?.download_url
  },

  // 11. YoutubetoMp3
  async (url) => {
    const res = await axios.get(`https://youtubetomp3.biz/api/convert`, {
      params: { url },
      timeout: TIMEOUT
    })
    return res.data?.mp3
  },

  // 12. Listentoyoutube
  async (url) => {
    const res = await axios.get(`https://listentoyoutube.com/api/convert`, {
      params: { url, format: 'mp3' },
      timeout: TIMEOUT
    })
    return res.data?.link
  },

  // 13. Yt5s
  async (url) => {
    const res = await axios.get(`https://yt5s.io/api/ajaxSearch`, {
      params: { q: url, vt: 'mp3' },
      timeout: TIMEOUT
    })
    return res.data?.links?.mp3?.['128']?.url
  },

  // 14. Mp3YouTube
  async (url) => {
    const res = await axios.get(`https://mp3-youtube.download/api`, {
      params: { url, format: 'mp3' },
      timeout: TIMEOUT
    })
    return res.data?.download
  },

  // 15. Ytmp3hub
  async (url) => {
    const res = await axios.get(`https://ytmp3hub.com/api/convert`, {
      params: { url },
      timeout: TIMEOUT
    })
    return res.data?.mp3_url
  },

  // 16. VidToMp3 - BONUS
  async (url) => {
    const res = await axios.get(`https://vidtomp3.com/api/convert`, {
      params: { url },
      timeout: TIMEOUT
    })
    return res.data?.url
  }
]

export default async function play(sock, { msg, from, args }, botSettings) {
  let processingMsg = null
  try {
    const query = args.join(' ')
    if (!query) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}play <song name>\n> Example: ${botSettings.prefix}play Burna Boy Last Last`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      react: { text: '🎵', key: msg.key }
    })

    processingMsg = await sock.sendMessage(from, {
      text: `> Searching for "${query}"...`
    }, { quoted: msg })

    // 1. Search YouTube
    const searchResult = await yts(query)
    if (!searchResult.videos.length) {
      throw new Error('No results found')
    }

    const video = searchResult.videos[0]

    // 2. Check duration - limit 10 mins
    const timeParts = video.timestamp.split(':').map(Number)
    let totalSeconds = 0
    if (timeParts.length === 3) {
      totalSeconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2]
    } else if (timeParts.length === 2) {
      totalSeconds = timeParts[0] * 60 + timeParts[1]
    }

    if (totalSeconds > 600) {
      throw new Error(`Song too long: ${video.timestamp}\nMax duration is 10:00 minutes`)
    }

    // 3. Send info card WITH THUMBNAIL
    const infoPayload = `╭─⌈ 🎵 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ Title: ${video.title.slice(0, 40)}
│ Artist: ${video.author.name}
│ Duration: ${video.timestamp}
│ Views: ${video.views.toLocaleString()}
│ Quality: 128kbps MP3
╰⊷ Downloading audio...`

    await sock.sendMessage(from, {
      image: { url: video.thumbnail },
      caption: infoPayload
    }, { quoted: msg })

    let audioUrl = null
    let apiUsed = 0

    // 4. TRY ALL 15+ APIs
    for (let i = 0; i < APIS.length; i++) {
      try {
        console.log(`[PLAY] Trying API ${i + 1}/${APIS.length}`)
        audioUrl = await APIS[i](video.url)
        if (audioUrl) {
          apiUsed = i + 1
          console.log(`[PLAY] API ${i + 1} SUCCESS`)
          break
        }
      } catch (e) {
        console.log(`[PLAY] API ${i + 1} failed: ${e.message}`)
      }
    }

    if (!audioUrl) {
      throw new Error('Failed to get audio from all 16 sources')
    }

    // 5. Send audio - STREAM URL DIRECTLY
    await sock.sendMessage(from, {
      audio: { url: audioUrl },
      mimetype: 'audio/mpeg',
      fileName: `${video.title.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 30)}.mp3`,
      contextInfo: {
        externalAdReply: {
          title: video.title.slice(0, 60),
          body: `${video.author.name} • ${video.timestamp} • API ${apiUsed}`,
          thumbnailUrl: video.thumbnail,
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: video.url
        }
      }
    }, { quoted: msg })

    // 6. Delete processing message and react done ✅
    if (processingMsg) {
      await sock.sendMessage(from, { delete: processingMsg.key }).catch(() => {})
    }
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PLAY ERROR]', error.message)

    let errorMsg = '> Audio download failed'
    if (error.message.includes('No results')) {
      errorMsg = `> No results found for "${args.join(' ')}"`
    } else if (error.message.includes('too long')) {
      errorMsg = `> ${error.message}`
    } else if (error.message.includes('unavailable')) {
      errorMsg = '> Video is unavailable or age-restricted'
    } else if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
      errorMsg = '> Server timeout. Try again'
    } else if (error.message.includes('16 sources')) {
      errorMsg = '> All 16 APIs down. Try again later'
    } else if (error.message.includes('ENOTFOUND')) {
      errorMsg = '> Network error. Check connection'
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