// commands/downloader/instagram.js
import axios from 'axios'

export const name = 'instagram'
export const alias = ['ig', 'igdl', 'insta']
export const category = 'Downloader'
export const desc = 'Download Instagram Reels, Posts, Stories & IGTV in HD'

export default async function instagram(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract link from args, message text, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    const igRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(reel|p|tv|stories)\/[^\s]+)/gi
    let link = textAfterCmd.match(igRegex)?.[0] ||
               messageText.match(igRegex)?.[0] ||
               quotedText.match(igRegex)?.[0]

    if (!link) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}ig <link>\n> Reply to a message with Instagram link\n> Example: ${botSettings.prefix}ig https://www.instagram.com/reel/abc123`
      }, { quoted: msg })
    }

    // 2. React first - BUNNY BEAST MODE 🪎
    await sock.sendMessage(from, {
      react: { text: '🪎', key: msg.key }
    })

    const processingMsg = await sock.sendMessage(from, {
      text: `> Processing Instagram link...`
    }, { quoted: msg })

    let mediaData = null

    // 3. Primary API - SaveIG
    try {
      const res1 = await axios.get(`https://api.saveig.app/api/download`, {
        params: { url: link },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (res1.data?.data?.length > 0) {
        const media = res1.data.data[0]
        mediaData = {
          url: media.url,
          type: media.type, // video or image
          thumbnail: media.thumbnail,
          title: res1.data.caption || 'Instagram Media'
        }
      }
    } catch (e) {
      console.log('[IG] Primary API failed, trying fallback...')
    }

    // 4. Fallback API 1 - SnapInsta
    if (!mediaData) {
      try {
        const res2 = await axios.post('https://snapinsta.app/api/ajaxSearch',
          `q=${encodeURIComponent(link)}`, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        const jsonData = JSON.parse(res2.data)
        if (jsonData?.data) {
          const videoMatch = jsonData.data.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/)
          const imgMatch = jsonData.data.match(/href="(https:\/\/[^"]+\.(jpg|jpeg|png)[^"]*)"/)

          if (videoMatch) {
            mediaData = {
              url: videoMatch[1],
              type: 'video',
              thumbnail: null,
              title: 'Instagram Reel'
            }
          } else if (imgMatch) {
            mediaData = {
              url: imgMatch[1],
              type: 'image',
              thumbnail: null,
              title: 'Instagram Post'
            }
          }
        }
      } catch (e) {
        console.log('[IG] Fallback 1 failed, trying fallback 2...')
      }
    }

    // 5. Fallback API 2 - InstaDL
    if (!mediaData) {
      try {
        const res3 = await axios.get(`https://api.instadl.app/api/v1/media`, {
          params: { url: link },
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        if (res3.data?.data?.length > 0) {
          const media = res3.data.data[0]
          mediaData = {
            url: media.url,
            type: media.type,
            thumbnail: media.thumbnail,
            title: res3.data.caption || 'Instagram Media'
          }
        }
      } catch (e) {
        console.log('[IG] Fallback 2 failed')
      }
    }

    if (!mediaData?.url) {
      throw new Error('Media not found or private account')
    }

    // 6. Send info card - BUNNY STYLE
    const mediaType = mediaData.type === 'video'? 'Reel/Video' : 'Post/Image'
    const infoPayload = `╭─⌈ 🎬 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ Type: ${mediaType}
│ Caption: ${mediaData.title.slice(0, 50)}
│ Quality: HD Original
│ Source: Instagram
╰⊷ Downloading...`

    if (mediaData.thumbnail) {
      await sock.sendMessage(from, {
        image: { url: mediaData.thumbnail },
        caption: infoPayload
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        text: infoPayload
      }, { quoted: msg })
    }

    // 7. Send media - Video or Image
    if (mediaData.type === 'video') {
      await sock.sendMessage(from, {
        video: { url: mediaData.url },
        mimetype: 'video/mp4',
        caption: `> Done. Enjoy 🐰`,
        contextInfo: {
          externalAdReply: {
            title: 'Instagram Download',
            body: `${botSettings.botname} • IG Downloader`,
            thumbnailUrl: mediaData.thumbnail,
            mediaType: 2,
            renderLargerThumbnail: true,
            sourceUrl: link
          }
        }
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        image: { url: mediaData.url },
        caption: `> Done. Enjoy 🐰`,
        contextInfo: {
          externalAdReply: {
            title: 'Instagram Download',
            body: `${botSettings.botname} • IG Downloader`,
            thumbnailUrl: mediaData.url,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: link
          }
        }
      }, { quoted: msg })
    }

    // 8. Delete processing message and react done ✅
    await sock.sendMessage(from, { delete: processingMsg.key })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[IG ERROR]', error.message)

    let errorMsg = '> Failed to download Instagram media'
    if (error.message.includes('private')) {
      errorMsg = '> Account is private or media unavailable'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    } else if (error.message.includes('not found')) {
      errorMsg = '> Invalid Instagram link or post deleted'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}