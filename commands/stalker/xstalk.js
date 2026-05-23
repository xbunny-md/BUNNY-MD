// commands/stalker/twitterstalk.js
import axios from 'axios'

export const name = 'twitterstalk'
export const alias = ['xstalk', 'xinfo', 'twitterinfo', 'twtstalk']
export const category = 'Stalker'
export const desc = 'Get Twitter/X profile information'

export default async function twitterstalk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract username from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?xstalk\s*/i, '').replace(/^[!.]?twitterstalk\s*/i, '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}xstalk <username>\n> Example: ${botSettings.prefix}xstalk elonmusk\n> Example: ${botSettings.prefix}xstalk @elonmusk\n> Example: ${botSettings.prefix}xstalk https://x.com/elonmusk`
      }, { quoted: msg })
    }

    // Clean input - extract username
    let identifier = input
    .replace(/https?:\/\/(www\.)?(x\.com|twitter\.com)\//, '')
    .replace(/@/, '')
    .split('/')[0]
    .split('?')[0]
    .trim()

    // 2. React first - BUNNY STALKER MODE 🛞
    await sock.sendMessage(from, {
      react: { text: '🛞', key: msg.key }
    })

    let userData = null

    // 3. Primary API - Twitter Scraper
    try {
      const res1 = await axios.get(`https://api.twitterapi.io/twitter/user/info`, {
        params: { userName: identifier },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'X-API-Key': 'free'
        }
      })

      if (res1.data?.data) {
        const user = res1.data.data
        userData = {
          id: user.id,
          username: user.userName || identifier,
          displayName: user.name || 'No Name',
          avatar: user.profilePicture || user.avatar,
          banner: user.coverPicture || null,
          bio: user.description || 'No bio',
          verified: user.isBlueVerified || user.verified || false,
          followers: user.followers || 0,
          following: user.following || 0,
          tweets: user.statusesCount || 0,
          likes: user.favouritesCount || 0,
          location: user.location || 'Unknown',
          website: user.website || null,
          created: user.createdAt || null,
          isPrivate: user.isProtected || false,
          isBusiness: user.isBusinessAccount || false
        }
      }
    } catch (e) {
      console.log('[XSTALK] Primary API failed, trying fallback...')
    }

    // 4. Fallback API - Nitter Instance
    if (!userData) {
      try {
        const res2 = await axios.get(`https://nitter.net/${identifier}/rss`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        // Parse basic data from RSS
        const titleMatch = res2.data.match(/<title>([^<]+) \/@/)
        const descMatch = res2.data.match(/<description>([^<]+)<\/description>/)

        if (titleMatch) {
          userData = {
            id: identifier,
            username: identifier,
            displayName: titleMatch[1] || 'Unknown',
            avatar: null,
            banner: null,
            bio: descMatch? descMatch[1] : 'No bio available',
            verified: false,
            followers: 0,
            following: 0,
            tweets: 0,
            likes: 0,
            location: 'Unknown',
            website: null,
            created: null,
            isPrivate: false,
            isBusiness: false
          }
        }
      } catch (e) {
        console.log('[XSTALK] Fallback failed')
      }
    }

    // 5. Last Fallback - Alternative Scraper
    if (!userData) {
      try {
        const res3 = await axios.get(`https://api.vxtwitter.com/${identifier}`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        if (res3.data?.user_name) {
          userData = {
            id: identifier,
            username: identifier,
            displayName: res3.data.user_name,
            avatar: res3.data.user_profile_image_url,
            banner: null,
            bio: res3.data.user_description || 'No bio',
            verified: res3.data.user_verified || false,
            followers: res3.data.user_followers || 0,
            following: res3.data.user_following || 0,
            tweets: 0,
            likes: 0,
            location: 'Unknown',
            website: null,
            created: null,
            isPrivate: false,
            isBusiness: false
          }
        }
      } catch (e) {
        console.log('[XSTALK] Last fallback failed')
      }
    }

    if (!userData) {
      throw new Error('User not found or account is suspended')
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
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    }

    // 8. Determine status
    const verifyStatus = userData.verified? 'Verified ✅' : 'Not Verified'
    const privacyStatus = userData.isPrivate? 'Private 🔒' : 'Public 🌍'
    const accountType = userData.isBusiness? 'Business 💼' : 'Personal 👤'

    // 9. Build info card - BUNNY STYLE CLEAN
    let infoCard = `╭─⌈ 🛞 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Twitter/X Profile Stalker*
│
│ 👤 *Name:* ${userData.displayName}
│ 🏷️ *Username:* @${userData.username}
│ 💬 *Bio:* ${userData.bio.slice(0, 100)}${userData.bio.length > 100? '...' : ''}
│
│ ${verifyStatus} | ${privacyStatus}
│ 🏷️ *Account:* ${accountType}
│ 🌍 *Location:* ${userData.location}
│`

    if (userData.created) {
      infoCard += `│ 📅 *Joined:* ${formatDate(userData.created)}\n│`
    }

    infoCard += `\n│ 📊 *Statistics:*`
    infoCard += `\n│ 👥 Followers: ${formatNumber(userData.followers)}`
    infoCard += `\n│ ➕ Following: ${formatNumber(userData.following)}`

    if (userData.tweets > 0) {
      infoCard += `\n│ 🐦 Tweets: ${formatNumber(userData.tweets)}`
    }
    if (userData.likes > 0) {
      infoCard += `\n│ ❤️ Likes: ${formatNumber(userData.likes)}`
    }

    if (userData.website) {
      infoCard += `\n│ 🔗 *Website:* ${userData.website}`
    }

    infoCard += `\n│\n╰⊷ *BUNNY MD*`

    // 10. Send profile with avatar - CLEAN NO PROCESS MSG
    if (userData.avatar) {
      await sock.sendMessage(from, {
        image: { url: userData.avatar },
        caption: infoCard,
        contextInfo: {
          externalAdReply: {
            title: `@${userData.username}`,
            body: `${formatNumber(userData.followers)} Followers • ${verifyStatus}`,
            thumbnailUrl: userData.avatar,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: `https://x.com/${userData.username}`
          }
        }
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        text: infoCard
      }, { quoted: msg })
    }

    // 11. React done ✅ - HAKUNA DELETE, USAFI TU
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[XSTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch Twitter profile'
    if (error.message.includes('not found')) {
      errorMsg = '> User not found or suspended'
    } else if (error.message.includes('private')) {
      errorMsg = '> Account is private or protected'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}