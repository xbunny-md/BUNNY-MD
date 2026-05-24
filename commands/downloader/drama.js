// commands/downloader/drama.js
import axios from 'axios'
import yts from 'yt-search'

export const name = 'drama'
export const alias = ['kdrama', 'series', 'ep']
export const category = 'Downloader'
export const desc = 'Search and download drama episodes from YouTube'

export default async function drama(sock, { msg, from, args }, botSettings) {
  let processingMsg = null
  try {
    // 1. Extract query from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let query = textAfterCmd || messageText.replace(/^[!.]?drama\s*/i, '') || quotedText

    if (!query) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}drama <name> ep<number>\n> Example: ${botSettings.prefix}drama Queen of Tears ep10\n> Example: ${botSettings.prefix}drama Vincenzo ep5 sub`
      }, { quoted: msg })
    }

    // 2. React first - BUNNY BEAST MODE 🧚‍♂️
    await sock.sendMessage(from, {
      react: { text: '🧚‍♂️', key: msg.key }
    })

    processingMsg = await sock.sendMessage(from, {
      text: `> Searching episode...`
    }, { quoted: msg })

    // 3. Smart YouTube search - add keywords for better results
    const searchQuery = `${query} full episode eng sub`
    const searchResult = await yts(searchQuery)

    if (!searchResult.videos.length) {
      throw new Error(`No results found for "${query}"`)
    }

    // 4. Filter best match - prefer longer videos with "episode" in title
    let video = searchResult.videos.find(v =>
      v.title.toLowerCase().includes('ep') &&
      v.seconds > 1200 // over 20 mins
    ) || searchResult.videos[0]

    const videoInfo = {
      url: video.url,
      videoId: video.videoId,
      title: video.title,
      author: video.author.name,
      duration: video.seconds,
      thumbnail: video.thumbnail,
      views: video.views
    }

    // 5. Check duration - limit 2 hours for dramas
    if (videoInfo.duration > 7200) {
      throw new Error(`Episode too long: ${Math.floor(videoInfo.duration / 60)} minutes\nMax duration is 2 hours`)
    }

    // 6. Format duration
    const formatDuration = (seconds) => {
      const hrs = Math.floor(seconds / 3600)
      const min = Math.floor((seconds % 3600) / 60)
      const sec = seconds % 60
      return hrs > 0
       ? `${hrs}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
        : `${min}:${sec.toString().padStart(2, '0')}`
    }

    // 7. Send info card - NO IMAGE TO SAVE RAM
    const infoPayload = `╭─⌈ 🧚‍♂️ *${botSettings.botname || 'BUNNY MD'}* ⌋
│ Drama: ${videoInfo.title.slice(0, 45)}
│ Channel: ${videoInfo.author}
│ Duration: ${formatDuration(videoInfo.duration)}
│ Quality: HD 720p
│ Source: YouTube
╰⊷ Preparing download...`

    await sock.sendMessage(from, {
      text: infoPayload
    }, { quoted: msg })

    let downloadUrl = null

    // 8. API 1 - savetube.me - PRIMARY
    try {
      const res1 = await axios.get(`https://www.savetube.me/api/v1/info`, {
        params: { url: videoInfo.url },
        timeout: 7000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (res1.data?.data?.video_formats) {
        const formats = res1.data.data.video_formats
        const hd720 = formats.find(f => f.quality === '720p' || f.quality === '720')
        const sd480 = formats.find(f => f.quality === '480p' || f.quality === '480')
        const sd360 = formats.find(f => f.quality === '360p' || f.quality === '360')
        downloadUrl = hd720?.url || sd480?.url || sd360?.url || formats[0]?.url
      }
    } catch (e) {
      console.log('[DRAMA] API 1 savetube failed:', e.message)
    }

    // 9. API 2 - y2mate - FALLBACK
    if (!downloadUrl) {
      try {
        const res2 = await axios.get(`https://www.y2mate.com/mates/analyzeV2/ajax`, {
          params: {
            k_query: videoInfo.url,
            k_page: 'home',
            q_auto: 0
          },
          timeout: 7000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        const links = res2.data.links?.mp4
        const hd720 = links?.['22'] || links?.['720'] || links?.['18'] || links?.['360']
        downloadUrl = hd720?.url
      } catch (e) {
        console.log('[DRAMA] API 2 y2mate failed:', e.message)
      }
    }

    // 10. API 3 - cobalt.tools - FALLBACK
    if (!downloadUrl) {
      try {
        const res3 = await axios.post('https://co.wuk.sh/api/json', {
          url: videoInfo.url,
          vQuality: '720',
          vCodec: 'h264',
          vFormat: 'mp4'
        }, {
          timeout: 7000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })

        if (res3.data?.status === 'stream' || res3.data?.status === 'redirect') {
          downloadUrl = res3.data.url
        }
      } catch (e) {
        console.log('[DRAMA] API 3 cobalt failed:', e.message)
      }
    }

    if (!downloadUrl) {
      throw new Error('Failed to retrieve episode')
    }

    // 11. Send video - STREAM URL DIRECTLY, NO DISK WRITE
    await sock.sendMessage(from, {
      video: { url: downloadUrl },
      mimetype: 'video/mp4',
      fileName: `${query.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 40)}.mp4`,
      caption: `> ${query}\n> Done. Enjoy 🐰`,
      contextInfo: {
        externalAdReply: {
          title: videoInfo.title.slice(0, 60),
          body: `${videoInfo.author} • ${formatDuration(videoInfo.duration)}`,
          thumbnailUrl: videoInfo.thumbnail,
          mediaType: 2,
          renderLargerThumbnail: false, // ✅ RENDER SAFE
          sourceUrl: videoInfo.url
        }
      }
    }, { quoted: msg })

    // 12. Delete processing message and react done ✅
    if (processingMsg) {
      await sock.sendMessage(from, { delete: processingMsg.key }).catch(() => {})
    }
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[DRAMA ERROR]', error.message)

    let errorMsg = '> Failed to get drama episode'
    if (error.message.includes('No results')) {
      errorMsg = `> Episode not found on YouTube\n> Try: ${botSettings.prefix}drama Queen of Tears ep10`
    } else if (error.message.includes('too long')) {
      errorMsg = `> ${error.message}`
    } else if (error.message.includes('unavailable')) {
      errorMsg = '> Episode is unavailable or restricted'
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