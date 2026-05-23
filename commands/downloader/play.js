// commands/downloader/play.js
import fs from 'fs'
import path from 'path'
import os from 'os'
import yts from 'yt-search'
import ytdl from '@distube/ytdl-core'

export const name = 'play'
export const alias = ['song', 'ytaudio', 'music']
export const category = 'Downloader'
export const desc = 'Search and download music from YouTube with thumbnail preview'

export default async function play(sock, { msg, from, args }, botSettings) {
  const tempFilePath = path.join(os.tmpdir(), `bunny_${Date.now()}.mp3`)

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

    // 1. Search YouTube
    const searchResult = await yts(query)
    if (!searchResult.videos.length) {
      return await sock.sendMessage(from, {
        text: `> No results found for "${query}"`
      }, { quoted: msg })
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
      return await sock.sendMessage(from, {
        text: `> Song too long: ${video.timestamp}\n> Max duration is 10:00 minutes`
      }, { quoted: msg })
    }

    // 3. Send info card
    const infoPayload =
`╭─⌈ 🎵 *${botSettings.botname || 'BUNNY MD'}* ⌋
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

    // 4. Download MP3 Direct - HAKUNA FFMPEG
    await new Promise((resolve, reject) => {
      const stream = ytdl(video.url, {
        filter: 'audioonly',
        quality: 'lowestaudio', // 128kbps direct
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      })

      const writeStream = fs.createWriteStream(tempFilePath)
      stream.pipe(writeStream)

      stream.on('error', (err) => {
        writeStream.close()
        reject(new Error(`YouTube error: ${err.message}`))
      })

      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })

    // 5. Check file size - WhatsApp limit 100MB
    const stats = fs.statSync(tempFilePath)
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2)
    if (stats.size > 95 * 1024 * 1024) {
      fs.unlinkSync(tempFilePath)
      return await sock.sendMessage(from, {
        text: `> File too large: ${fileSizeMB}MB\n> WhatsApp limit is 100MB`
      }, { quoted: msg })
    }

    // 6. Send audio
    await sock.sendMessage(from, {
      audio: { url: tempFilePath },
      mimetype: 'audio/mpeg',
      fileName: `${video.title.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 30)}.mp3`,
      contextInfo: {
        externalAdReply: {
          title: video.title.slice(0, 60),
          body: `${video.author.name} • ${video.timestamp}`,
          thumbnailUrl: video.thumbnail,
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: video.url
        }
      }
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (commandException) {
    console.error(`[PLAY ERROR]`, commandException.message)

    let errorMsg = '> Audio download failed.'
    if (commandException.message.includes('Status code: 410')) {
      errorMsg = '> YouTube blocked this video. Try another song.'
    } else if (commandException.message.includes('unavailable')) {
      errorMsg = '> Video is unavailable or age-restricted.'
    } else if (commandException.message.includes('private')) {
      errorMsg = '> Video is private.'
    } else if (commandException.message.includes('Sign in')) {
      errorMsg = '> YouTube wants login for this video. Try another.'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })

  } finally {
    // Cleanup temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
      console.log(`[PLAY] Cleaned temp file`)
    }
  }
}