// commands/downloader/drama.js
import axios from 'axios'
import yts from 'yt-search'
import ytdl from '@distube/ytdl-core'
import fs from 'fs'
import path from 'path'
import os from 'os'

export const name = 'drama'
export const alias = ['kdrama', 'series', 'ep']
export const category = 'Downloader'
export const desc = 'Search and download drama episodes from YouTube'

export default async function drama(sock, { msg, from, args }, botSettings) {
  const tempFilePath = path.join(os.tmpdir(), `bunny_drama_${Date.now()}.mp4`)

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

    const processingMsg = await sock.sendMessage(from, {
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

    // 7. Send info card - PRO LOOK ONLY, NO TECH SECRETS
    const infoPayload = `╭─⌈ 🧚‍♂️ *${botSettings.botname || 'BUNNY MD'}* ⌋
│ Drama: ${videoInfo.title.slice(0, 45)}
│ Channel: ${videoInfo.author}
│ Duration: ${formatDuration(videoInfo.duration)}
│ Quality: HD 720p
│ Source: YouTube
╰⊷ Preparing download...`

    await sock.sendMessage(from, {
      image: { url: videoInfo.thumbnail },
      caption: infoPayload
    }, { quoted: msg })

    // 8. Download with smart chunking - IDM STYLE but silent
    let downloadSuccess = false

    // Primary: @distube/ytdl-core with highWaterMark for speed
    try {
      await new Promise((resolve, reject) => {
        const stream = ytdl(videoInfo.url, {
          filter: 'videoandaudio',
          quality: 'highest',
          highWaterMark: 1 << 25, // 32MB buffer = faster download
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        })

        const writeStream = fs.createWriteStream(tempFilePath)
        stream.pipe(writeStream)

        stream.on('error', reject)
        writeStream.on('finish', () => {
          downloadSuccess = true
          resolve()
        })
        writeStream.on('error', reject)
      })
    } catch (e) {
      console.log('[DRAMA] Primary download failed, trying fallback...')
    }

    // Fallback: y2mate API
    if (!downloadSuccess) {
      try {
        const videoId = ytdl.getVideoID(videoInfo.url)
        const res = await axios.get(`https://www.y2mate.com/mates/analyzeV2/ajax`, {
          params: {
            k_query: `https://www.youtube.com/watch?v=${videoId}`,
            k_page: 'home',
            hl: 'en',
            q_auto: 0
          },
          timeout: 25000
        })

        const links = res.data.links?.mp4
        const hd720 = links?.['22'] || links?.['720'] || links?.['18'] || links?.['360']

        if (hd720?.url) {
          const videoRes = await axios.get(hd720.url, {
            responseType: 'stream',
            timeout: 120000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          })
          const writeStream = fs.createWriteStream(tempFilePath)
          videoRes.data.pipe(writeStream)

          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve)
            writeStream.on('error', reject)
          })
          downloadSuccess = true
        }
      } catch (e) {
        console.log('[DRAMA] Fallback failed')
      }
    }

    if (!downloadSuccess ||!fs.existsSync(tempFilePath)) {
      throw new Error('Failed to retrieve episode')
    }

    // 9. Check file size - WhatsApp limit 100MB
    const stats = fs.statSync(tempFilePath)
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2)
    if (stats.size > 95 * 1024 * 1024) {
      fs.unlinkSync(tempFilePath)
      throw new Error(`Episode too large: ${fileSizeMB}MB\nWhatsApp limit is 100MB. Try shorter episodes.`)
    }

    // 10. Send video - CLEAN MESSAGE, NO TECH TALK
    await sock.sendMessage(from, {
      video: { url: tempFilePath },
      mimetype: 'video/mp4',
      fileName: `${query.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 40)}.mp4`,
      caption: `> ${query}\n> Done. Enjoy 🐰`,
      contextInfo: {
        externalAdReply: {
          title: videoInfo.title.slice(0, 60),
          body: `${videoInfo.author} • ${formatDuration(videoInfo.duration)}`,
          thumbnailUrl: videoInfo.thumbnail,
          mediaType: 2,
          renderLargerThumbnail: true,
          sourceUrl: videoInfo.url
        }
      }
    }, { quoted: msg })

    // 11. Delete processing message and react done ✅
    await sock.sendMessage(from, { delete: processingMsg.key })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[DRAMA ERROR]', error.message)

    let errorMsg = '> Failed to get drama episode'
    if (error.message.includes('No results')) {
      errorMsg = `> Episode not found on YouTube\n> Try: ${botSettings.prefix}drama Queen of Tears ep10`
    } else if (error.message.includes('too long')) {
      errorMsg = `> ${error.message}`
    } else if (error.message.includes('too large')) {
      errorMsg = `> ${error.message}`
    } else if (error.message.includes('unavailable')) {
      errorMsg = '> Episode is unavailable or restricted'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })

  } finally {
    // Silent cleanup - no one knows
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
  }
}