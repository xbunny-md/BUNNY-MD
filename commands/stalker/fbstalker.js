// commands/stalker/facebookstalk.js
import axios from 'axios'

export const name = 'facebookstalk'
export const alias = ['fbstalk', 'fbinfo', 'faceinfo']
export const category = 'Stalker'
export const desc = 'Get Facebook profile or page information'

export default async function facebookstalk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract username/url from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?fbstalk\s*/i, '') || quotedText
    
    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}fbstalk <username/url>\n> Example: ${botSettings.prefix}fbstalk zuck\n> Example: ${botSettings.prefix}fbstalk https://facebook.com/zuck\n> Works for profiles & pages`
      }, { quoted: msg })
    }

    // Clean input - extract username or ID
    let identifier = input
      .replace(/https?:\/\/(www\.|m\.)?facebook\.com\//, '')
      .replace(/profile\.php\?id=/, '')
      .split('/')[0]
      .split('?')[0]
      .trim()

    // 2. React first - BUNNY STALKER MODE 🫟
    await sock.sendMessage(from, {
      react: { text: '🫟', key: msg.key }
    })

    const processingMsg = await sock.sendMessage(from, {
      text: `> Searching Facebook: ${identifier}...`
    }, { quoted: msg })

    let userData = null

    // 3. Primary API - FB Scraper
    try {
      const res1 = await axios.get(`https://facebook-api-scraper.vercel.app/api/user`, {
        params: { username: identifier },
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (res1.data?.success && res1.data?.data) {
        const user = res1.data.data
        userData = {
          type: user.isPage ? 'Page' : 'Profile',
          id: user.id || identifier,
          username: user.username || user.vanity || identifier,
          name: user.name || 'No Name',
          avatar: user.profilePic || user.avatar,
          cover: user.coverPhoto || null,
          bio: user.bio || user.about || 'No bio',
          verified: user.isVerified || false,
          followers: user.followers || user.subscribers || 0,
          following: user.following || 0,
          likes: user.likes || user.fanCount || 0,
          category: user.category || user.pageType || 'Personal',
          location: user.location || user.hometown || 'Unknown',
          website: user.website || null,
          email: user.email || null,
          work: user.work || null,
          education: user.education || null,
          joined: user.createdTime || null
        }
      }
    } catch (e) {
      console.log('[FBSTALK] Primary API failed, trying fallback...')
    }

    // 4. Fallback API - FBDL Info
    if (!userData) {
      try {
        const res2 = await axios.get(`https://api.fbdownloader.online/api/info`, {
          params: { url: `https://facebook.com/${identifier}` },
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        if (res2.data?.data) {
          const user = res2.data.data
          userData = {
            type: user.type || 'Profile',
            id: user.id || identifier,
            username: user.username || identifier,
            name: user.name || 'No Name',
            avatar: user.avatar_hd || user.avatar,
            cover: user.cover || null,
            bio: user.about || user.description || 'No bio',
            verified: user.verified || false,
            followers: user.followers_count || 0,
            following: user.following_count || 0,
            likes: user.likes_count || 0,
            category: user.category || 'Personal',
            location: user.location || 'Unknown',
            website: user.website || null,
            email: user.email || null,
            work: user.work || null,
            education: null,
            joined: user.founded || null
          }
        }
      } catch (e) {
        console.log('[FBSTALK] Fallback failed')
      }
    }

    if (!userData) {
      throw new Error('User/Page not found or is private')
    }

    // 5. Format numbers nicely
    const formatNumber = (num) => {
      if (!num) return '0'
      if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
      return num.toString()
    }

    // 6. Determine display info
    const verifyStatus = userData.verified? 'Verified ✅' : 'Not Verified'
    const typeEmoji = userData.type === 'Page' ? '📄' : '👤'
    
    // 7. Build info card - BUNNY STYLE
    let infoCard = `╭─⌈ 🫟 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Facebook ${userData.type} Stalker*
│
│ ${typeEmoji} *Name:* ${userData.name}
│ 🏷️ *Username:* @${userData.username}
│ 💬 *Bio:* ${userData.bio.slice(0, 80)}${userData.bio.length > 80? '...' : ''}
│
│ ${verifyStatus} | ${userData.category}
│ 🌍 *Location:* ${userData.location}
│`

    if (userData.type === 'Page') {
      infoCard += `\n│ 📊 *Page Stats:*\n│ 👍 Likes: ${formatNumber(userData.likes)}\n│ 👥 Followers: ${formatNumber(userData.followers)}`
    } else {
      infoCard += `\n│ 📊 *Profile Stats:*\n│ 👥 Followers: ${formatNumber(userData.followers)}\n│ ➕ Following: ${formatNumber(userData.following)}`
    }

    if (userData.website) {
      infoCard += `\n│ 🔗 *Website:* ${userData.website}`
    }
    if (userData.email) {
      infoCard += `\n│ 📧 *Email:* ${userData.email}`
    }
    if (userData.work) {
      infoCard += `\n│ 💼 *Work:* ${userData.work}`
    }
    if (userData.joined) {
      infoCard += `\n│ 📅 *Joined:* ${userData.joined}`
    }

    infoCard += `\n│\n╰⊷ *Data retrieved successfully*`

    // 8. Send profile with avatar
    if (userData.avatar) {
      await sock.sendMessage(from, {
        image: { url: userData.avatar },
        caption: infoCard,
        contextInfo: {
          externalAdReply: {
            title: `${userData.name}`,
            body: `${userData.type} • ${formatNumber(userData.followers)} Followers • ${verifyStatus}`,
            thumbnailUrl: userData.avatar,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: `https://facebook.com/${userData.username}`
          }
        }
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        text: infoCard
      }, { quoted: msg })
    }

    // 9. Delete processing message and react done ✅
    await sock.sendMessage(from, { delete: processingMsg.key })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[FBSTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch Facebook profile'
    if (error.message.includes('not found')) {
      errorMsg = '> User/Page not found. Check username/URL'
    } else if (error.message.includes('private')) {
      errorMsg = '> Profile is private or restricted'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    } else if (error.message.includes('rate limit')) {
      errorMsg = '> Too many requests. Try later'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}