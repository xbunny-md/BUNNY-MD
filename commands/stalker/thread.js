// commands/stalker/threadsstalk.js
import axios from 'axios'

export const name = 'threadsstalk'
export const alias = ['thstalk', 'threadstalk', 'threads', 'thread']
export const category = 'Stalker'
export const desc = 'Get Threads profile information'

export default async function threadsstalk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract username from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?thstalk\s*/i, '').replace(/^[!.]?threadsstalk\s*/i, '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}thstalk <username>\n> Example: ${botSettings.prefix}thstalk zuck\n> Example: ${botSettings.prefix}thstalk https://threads.net/@zuck`
      }, { quoted: msg })
    }

    // Clean input - extract username
    let identifier = input
.replace(/https?:\/\/(www\.)?threads\.net\//, '')
.replace(/https?:\/\/(www\.)?threads\.com\//, '')
.replace(/@/, '')
.split('/')[0]
.split('?')[0]
.trim()
.toLowerCase()

    // 2. React first - BUNNY STALKER MODE 🫧
    await sock.sendMessage(from, {
      react: { text: '🫧', key: msg.key }
    })

    let userData = null

    // 3. Primary API - Threads Web Scraper
    try {
      const res1 = await axios.get(`https://www.threads.net/@${identifier}`, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Sec-Fetch-Site': 'none'
        }
      })

      const html = res1.data
      const jsonMatch = html.match(/<script type="application\/json" data-sjs>(.*?)<\/script>/)

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1])
        const user = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[0]?.__bbox?.result?.data?.user

        if (user) {
          userData = {
            username: user.username || identifier,
            fullName: user.full_name || 'No Name',
            bio: user.biography || 'No bio',
            profilePicUrl: user.profile_pic_url || user.hd_profile_pic_url || null,
            followers: user.follower_count || 0,
            isVerified: user.is_verified || false,
            isPrivate: user.is_private || false,
            threadsCount: user.text_post_app_thread_count || 0,
            instagramUsername: user.instagram_user?.username || null,
            profileUrl: `https://threads.net/@${identifier}`
          }
        }
      }
    } catch (e) {
      console.log('[THSTALK] Primary scraper failed:', e.message)
    }

    // 4. Fallback API - Alternative Scraper
    if (!userData) {
      try {
        const res2 = await axios.get(`https://www.threads.net/@${identifier}`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
          }
        })

        const html = res2.data
        const titleMatch = html.match(/<title>([^<]+) \(@([^)]+)\) on Threads<\/title>/)
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)
        const followersMatch = html.match(/"follower_count":(\d+)/)

        if (titleMatch) {
          userData = {
            username: titleMatch[2] || identifier,
            fullName: titleMatch[1] || 'Unknown',
            bio: descMatch? descMatch[1] : 'No bio available',
            profilePicUrl: imageMatch? imageMatch[1] : null,
            followers: followersMatch? parseInt(followersMatch[1]) : 0,
            isVerified: html.includes('"is_verified":true'),
            isPrivate: html.includes('"is_private":true'),
            threadsCount: 0,
            instagramUsername: null,
            profileUrl: `https://threads.net/@${identifier}`
          }
        }
      } catch (e) {
        console.log('[THSTALK] Fallback API failed')
      }
    }

    // 5. Last Fallback - Basic check
    if (!userData) {
      try {
        const res3 = await axios.get(`https://threads.net/@${identifier}`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          validateStatus: (status) => status < 500
        })

        if (res3.status === 200) {
          userData = {
            username: identifier,
            fullName: 'Unknown',
            bio: 'Profile exists but limited data',
            profilePicUrl: null,
            followers: 0,
            isVerified: false,
            isPrivate: false,
            threadsCount: 0,
            instagramUsername: null,
            profileUrl: `https://threads.net/@${identifier}`
          }
        }
      } catch (e) {
        console.log('[THSTALK] Last fallback failed')
      }
    }

    if (!userData) {
      throw new Error('User not found or profile is private')
    }

    // 6. Format numbers nicely
    const formatNumber = (num) => {
      if (!num) return '0'
      if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
      return num.toString()
    }

    // 7. Determine status
    const verifyStatus = userData.isVerified? 'Verified ✅' : 'Not Verified'
    const privacyStatus = userData.isPrivate? 'Private 🔒' : 'Public 🌐'
    const accountEmoji = userData.isVerified? '⭐' : '🫧'

    // 8. Build info card - ENGLISH ONLY
    let infoCard = `╭─⌈ 🫧 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Threads Profile Stalker*
│
│ ${accountEmoji} *Name:* ${userData.fullName}
│ 🏷️ *Username:* @${userData.username}
│ 💬 *Bio:* ${userData.bio.slice(0, 120)}${userData.bio.length > 120? '...' : ''}
│
│ ${verifyStatus} | ${privacyStatus}
│
│ 📊 *Statistics:*
│ 👥 Followers: ${formatNumber(userData.followers)}
│ 🧵 Threads: ${formatNumber(userData.threadsCount)}
│`

    if (userData.instagramUsername) {
      infoCard += `│ 📸 *Instagram:* @${userData.instagramUsername}\n│`
    }

    infoCard += `\n│ 🔗 *Profile:* ${userData.profileUrl}`
    infoCard += `\n│\n╰⊷ *BUNNY MD STALKER MODE*`

    // 9. Send WITH REAL PROFILE PICTURE if available
    if (userData.profilePicUrl) {
      await sock.sendMessage(from, {
        image: { url: userData.profilePicUrl },
        caption: infoCard,
        contextInfo: {
          externalAdReply: {
            title: `@${userData.username}`,
            body: `${userData.fullName} • ${formatNumber(userData.followers)} Followers`,
            thumbnailUrl: userData.profilePicUrl,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: userData.profileUrl
          }
        }
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        text: infoCard + `\n\n> No profile picture available`
      }, { quoted: msg })
    }

    // 10. React done ✅ - NO DELETE, NO PROCESS MSG
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[THSTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch Threads profile'
    if (error.message.includes('not found') || error.response?.status === 404) {
      errorMsg = '> User not found. Check username'
    } else if (error.message.includes('private')) {
      errorMsg = '> Profile is private or does not exist'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}