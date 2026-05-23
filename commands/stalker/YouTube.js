// commands/stalker/youtubestalk.js
import axios from 'axios'

export const name = 'youtubestalk'
export const alias = ['ytstalk', 'ytinfo', 'youtubeinfo', 'ytchannel']
export const category = 'Stalker'
export const desc = 'Get YouTube channel information'

export default async function youtubestalk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract channel identifier from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?ytstalk\s*/i, '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}ytstalk <channel>\n> Example: ${botSettings.prefix}ytstalk @MrBeast\n> Example: ${botSettings.prefix}ytstalk MrBeast\n> Example: ${botSettings.prefix}ytstalk https://youtube.com/@MrBeast`
      }, { quoted: msg })
    }

    // Clean input - extract username/handle/ID
    let identifier = input
     .replace(/https?:\/\/(www\.)?youtube\.com\//, '')
     .replace(/@/, '')
     .replace(/channel\//, '')
     .replace(/c\//, '')
     .replace(/user\//, '')
     .split('/')[0]
     .split('?')[0]
     .trim()

    // 2. React first - BUNNY STALKER MODE 🎯
    await sock.sendMessage(from, {
      react: { text: '🎯', key: msg.key }
    })

    const processingMsg = await sock.sendMessage(from, {
      text: `> Searching YouTube channel: ${identifier}...`
    }, { quoted: msg })

    let channelData = null

    // 3. Primary API - YouTube Search via noembed
    try {
      // First get channel ID from handle
      const searchRes = await axios.get(`https://www.youtube.com/@${identifier}`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      // Extract channel data from HTML
      const html = searchRes.data
      const channelIdMatch = html.match(/"channelId":"(UC[\w-]+)"/)
      const channelId = channelIdMatch? channelIdMatch[1] : null

      if (channelId) {
        // Get detailed info via YouTube API alternative
        const res1 = await axios.get(`https://yt.lemnoslife.com/channels`, {
          params: { part: 'snippet,statistics,brandingSettings', id: channelId },
          timeout: 15000
        })

        if (res1.data?.items?.[0]) {
          const channel = res1.data.items[0]
          const stats = channel.statistics
          const snippet = channel.snippet
          const branding = channel.brandingSettings

          channelData = {
            id: channel.id,
            username: snippet.customUrl || identifier,
            title: snippet.title,
            avatar: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
            banner: branding?.image?.bannerExternalUrl || null,
            description: snippet.description || 'No description',
            subscribers: stats.subscriberCount || 0,
            views: stats.viewCount || 0,
            videos: stats.videoCount || 0,
            country: snippet.country || 'Unknown',
            verified: channel.status?.isLinked || false,
            created: snippet.publishedAt || null,
            keywords: branding?.channel?.keywords || null
          }
        }
      }
    } catch (e) {
      console.log('[YTSTALK] Primary API failed, trying fallback...')
    }

    // 4. Fallback API - Social Blade Scraper
    if (!channelData) {
      try {
        const res2 = await axios.get(`https://api.socialcounts.org/youtube-live-subscriber-count/search/${encodeURIComponent(identifier)}`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        if (res2.data?.items?.[0]) {
          const channel = res2.data.items[0]
          channelData = {
            id: channel.channelid,
            username: channel.username,
            title: channel.title,
            avatar: channel.thumbnail,
            banner: null,
            description: 'No description available',
            subscribers: channel.est_sub || 0,
            views: channel.est_view || 0,
            videos: 0,
            country: 'Unknown',
            verified: false,
            created: null,
            keywords: null
          }
        }
      } catch (e) {
        console.log('[YTSTALK] Fallback failed')
      }
    }

    // 5. Last Fallback - YouTube Data via oEmbed
    if (!channelData) {
      try {
        const res3 = await axios.get(`https://www.youtube.com/oembed`, {
          params: {
            url: `https://www.youtube.com/@${identifier}`,
            format: 'json'
          },
          timeout: 15000
        })

        if (res3.data) {
          channelData = {
            id: identifier,
            username: identifier,
            title: res3.data.author_name,
            avatar: res3.data.thumbnail_url,
            banner: null,
            description: 'Channel found but limited data',
            subscribers: 0,
            views: 0,
            videos: 0,
            country: 'Unknown',
            verified: false,
            created: null,
            keywords: null
          }
        }
      } catch (e) {
        console.log('[YTSTALK] oEmbed failed')
      }
    }

    if (!channelData) {
      throw new Error('Channel not found')
    }

    // 6. Format numbers nicely
    const formatNumber = (num) => {
      if (!num) return '0'
      num = parseInt(num)
      if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B'
      if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
      return num.toString()
    }

    // 7. Format date
    const formatDate = (dateString) => {
      if (!dateString) return 'Unknown'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    // 8. Determine status
    const verifyStatus = channelData.verified? 'Verified ✅' : 'Not Verified'
    const subCount = channelData.subscribers > 0? formatNumber(channelData.subscribers) : 'Hidden'

    // 9. Build info card - BUNNY STYLE
    let infoCard = `╭─⌈ 🎯 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *YouTube Channel Stalker*
│
│ 📺 *Channel:* ${channelData.title}
│ 🏷️ *Handle:* @${channelData.username}
│ 📝 *Description:* ${channelData.description.slice(0, 100)}${channelData.description.length > 100? '...' : ''}
│
│ ${verifyStatus} | 🌍 ${channelData.country}
│ 📅 *Created:* ${formatDate(channelData.created)}
│
│ 📊 *Statistics:*
│ 👥 Subscribers: ${subCount}
│ 👁️ Total Views: ${formatNumber(channelData.views)}
│ 🎬 Videos: ${formatNumber(channelData.videos)}
│`

    if (channelData.keywords) {
      const keywords = channelData.keywords.split(',').slice(0, 3).join(', ')
      infoCard += `\n│ 🏷️ *Tags:* ${keywords}`
    }

    infoCard += `\n│\n╰⊷ *Data retrieved successfully*`

    // 10. Send channel with avatar
    if (channelData.avatar) {
      await sock.sendMessage(from, {
        image: { url: channelData.avatar },
        caption: infoCard,
        contextInfo: {
          externalAdReply: {
            title: `${channelData.title}`,
            body: `${subCount} Subscribers • ${formatNumber(channelData.views)} Views • ${verifyStatus}`,
            thumbnailUrl: channelData.avatar,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: `https://youtube.com/@${channelData.username}`
          }
        }
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        text: infoCard
      }, { quoted: msg })
    }

    // 11. Delete processing message and react done ✅
    await sock.sendMessage(from, { delete: processingMsg.key })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[YTSTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch YouTube channel'
    if (error.message.includes('not found')) {
      errorMsg = '> Channel not found. Check username/handle'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    } else if (error.message.includes('rate limit')) {
      errorMsg = '> Too many requests. Try later'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}