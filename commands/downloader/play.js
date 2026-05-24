// commands/downloader/play.js
import axios from 'axios'
import yts from 'yt-search'

export const name = 'play'
export const alias = ['song', 'ytaudio', 'music']
export const category = 'Downloader'
export const desc = 'Search and download music from YouTube with thumbnail preview'

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

    // 2. Check duration - limit 10 mins to avoid big files
    const timeParts = video.timestamp.split(':').map(Number)
    let totalSeconds = 0
    if (timeParts.length === 3) {
      totalSeconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2] // H:M:S
    } else if (timeParts.length === 2) {
      totalSeconds = timeParts[0] * 60 + timeParts[1] // M:S
    }

    if (totalSeconds > 600) {
      throw new Error(`Song too long: ${video.timestamp}\nMax duration is 10:00 minutes`)
    }

    // 3. Send info card - NO IMAGE TO SAVE RAM
    const infoPayload =
`╭─⌈ 🎵 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ Title: ${video.title.slice(0, 40)}
│ Artist: ${video.author.name}
│ Duration: ${video.timestamp}
│ Views: ${video.views.toLocaleString()}
│ Quality: 128kbps MP3
╰⊷ Downloading audio...`

    await sock.sendMessage(from, {
      text: infoPayload
    }, { quoted: msg })

    let audioUrl = null

    // 4. API 1 - savetube.me - MP3 DOWNLOAD
    try {
      const res1 = await axios.get(`https://www.savetube.me/api/v1/info`, {
        params: { url: video.url },
        timeout: 7000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (res1.data?.data?.audio_formats) {
        const mp3 = res1.data.data.audio_formats.find(f => f.quality === '128kbps' || f.format === 'mp3')
        audioUrl = mp3?.url || res1.data.data.audio_formats[0]?.url
      }
    } catch (e) {
      console.log('[PLAY] API 1 savetube failed:', e.message)
    }

    // 5. API 2 - y2mate - MP3 FALLBACK
    if (!audioUrl) {
      try {
        const res2 = await axios.get(`https://www.y2mate.com/mates/analyzeV2/ajax`, {
          params: {
            k_query: video.url,
            k_page: 'home',
            q_auto: 0
          },
          timeout: 7000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        const mp3Links = res2.data.links?.mp3
        const mp3_128 = mp3Links?.['128'] || mp3Links?.['mp3128']
        audioUrl = mp3_128?.url
      } catch (e) {
        console.log('[PLAY] API 2 y2mate failed:', e.message)
      }
    }

    // 6. API 3 - cobalt.tools - MP3 FALLBACK
    if (!audioUrl) {
      try {
        const res3 = await axios.post('https://co.wuk.sh/api/json', {
          url: video.url,
          aFormat: 'mp3',
          isAudioOnly: true
        }, {
          timeout: 7000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })

        if (res3.data?.status === 'stream' || res3.data?.status === 'redirect') {
          audioUrl = res3.data.url
        }
      } catch (e) {
        console.log('[PLAY] API 3 cobalt failed:', e.message)
      }
    }

    if (!audioUrl) {
      throw new Error('Failed to get audio from all sources')
    }

    // 7. Send audio - STREAM URL DIRECTLY, NO DISK WRITE
    await sock.sendMessage(from, {
      audio: { url: audioUrl },
      mimetype: 'audio/mpeg',
      fileName: `${video.title.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 30)}.mp3`,
      contextInfo: {
        externalAdReply: {
          title: video.title.slice(0, 60),
          body: `${video.author.name} • ${video.timestamp}`,
          thumbnailUrl: video.thumbnail,
          mediaType: 1,
          renderLargerThumbnail: false, // ✅ RENDER SAFE
          sourceUrl: video.url
        }
      }
    }, { quoted: msg })

    // 8. Delete processing message and react done ✅
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
    } else if (error.message.includes('ENOTFOUND')) {
      errorMsg = '> All APIs down. Try again later'
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