// commands/stalker/spotifystalk.js
import axios from 'axios'

export const name = 'spotifystalk'
export const alias = ['spstalk', 'spotify', 'spotifyinfo']
export const category = 'Stalker'
export const desc = 'Get Spotify profile information'

export default async function spotifystalk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract username/user ID from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?spstalk\s*/i, '').replace(/^[!.]?spotifystalk\s*/i, '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}spstalk <username>\n> Example: ${botSettings.prefix}spstalk 12123456789\n> Example: ${botSettings.prefix}spstalk https://open.spotify.com/user/12123456789`
      }, { quoted: msg })
    }

    // Clean input - extract user ID
    let identifier = input
 .replace(/https?:\/\/open\.spotify\.com\/user\//, '')
 .replace(/https?:\/\/spotify\.com\/user\//, '')
 .replace(/@/, '')
 .split('/')[0]
 .split('?')[0]
 .trim()

    // 2. React first - BUNNY STALKER MODE 🫀
    await sock.sendMessage(from, {
      react: { text: '🫀', key: msg.key }
    })

    let userData = null

    // 3. Primary API - Spotify Scraper
    try {
      const res1 = await axios.get(`https://open.spotify.com/user/${identifier}`, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        }
      })

      const html = res1.data
      const jsonMatch = html.match(/<script id="initial-state" type="text\/plain">(.*?)<\/script>/)

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1])
        const user = data?.entities?.users?.[identifier]

        if (user) {
          userData = {
            userId: identifier,
            displayName: user.name || 'No Name',
            bio: user.bio || 'No bio',
            imageUrl: user.images?.[0]?.url || null,
            followers: user.followers?.total || 0,
            following: user.following?.total || 0,
            playlists: user.playlists?.total || 0,
            product: user.product || 'free',
            country: user.country || 'Unknown',
            isVerified: user.is_verified || false,
            profileUrl: `https://open.spotify.com/user/${identifier}`
          }
        }
      }
    } catch (e) {
      console.log('[SPSTALK] Primary scraper failed:', e.message)
    }

    // 4. Fallback API - Alternative Scraper
    if (!userData) {
      try {
        const res2 = await axios.get(`https://api.spotify.com/v1/users/${identifier}`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'BunnyMD-Stalker',
            'Authorization': 'Bearer BQC' // Public endpoints sometimes work without token
          }
        })

        if (res2.data) {
          const user = res2.data
          userData = {
            userId: user.id || identifier,
            displayName: user.display_name || 'No Name',
            bio: 'No bio available',
            imageUrl: user.images?.[0]?.url || null,
            followers: user.followers?.total || 0,
            following: 0,
            playlists: 0,
            product: user.product || 'free',
            country: user.country || 'Unknown',
            isVerified: false,
            profileUrl: user.external_urls?.spotify || `https://open.spotify.com/user/${identifier}`
          }
        }
      } catch (e) {
        console.log('[SPSTALK] Fallback API failed')
      }
    }

    // 5. Last Fallback - Basic profile check
    if (!userData) {
      try {
        const res3 = await axios.get(`https://open.spotify.com/user/${identifier}`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        const html = res3.data
        const titleMatch = html.match(/<title>([^<]+) - Spotify<\/title>/)
        const imageMatch = html.match(/"image":"([^"]+)"/)
        const followersMatch = html.match(/"followers":{"total":(\d+)}/)

        if (titleMatch) {
          userData = {
            userId: identifier,
            displayName: titleMatch[1] || 'Unknown',
            bio: 'Profile found but limited data',
            imageUrl: imageMatch? imageMatch[1] : null,
            followers: followersMatch? parseInt(followersMatch[1]) : 0,
            following: 0,
            playlists: 0,
            product: 'free',
            country: 'Unknown',
            isVerified: false,
            profileUrl: `https://open.spotify.com/user/${identifier}`
          }
        }
      } catch (e) {
        console.log('[SPSTALK] Last fallback failed')
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
    const verifyStatus = userData.isVerified? 'Verified Artist ✅' : 'Not Verified'
    const accountType = userData.product === 'premium'? 'Premium 💎' : 'Free 🆓'
    const accountEmoji = userData.product === 'premium'? '💎' : '🎵'

    // 8. Build info card - ENGLISH ONLY
    let infoCard = `╭─⌈ 🫀 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Spotify Profile Stalker*
│
│ ${accountEmoji} *Name:* ${userData.displayName}
│ 🆔 *User ID:* ${userData.userId}
│ 💬 *Bio:* ${userData.bio.slice(0, 120)}${userData.bio.length > 120? '...' : ''}
│
│ ${verifyStatus} | ${accountType}
│ 🌍 *Country:* ${userData.country}
│
│ 📊 *Statistics:*
│ 👥 Followers: ${formatNumber(userData.followers)}
│ ➕ Following: ${formatNumber(userData.following)}
│ 📋 Public Playlists: ${formatNumber(userData.playlists)}
│`

    infoCard += `\n│\n│ 🔗 *Profile:* ${userData.profileUrl}`
    infoCard += `\n│\n╰⊷ *BUNNY MD STALKER MODE*`

    // 9. Send WITH REAL PROFILE PICTURE if available
    if (userData.imageUrl) {
      await sock.sendMessage(from, {
        image: { url: userData.imageUrl },
        caption: infoCard,
        contextInfo: {
          externalAdReply: {
            title: `${userData.displayName}`,
            body: `${formatNumber(userData.followers)} Followers • ${accountType}`,
            thumbnailUrl: userData.imageUrl,
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
    console.error('[SPSTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch Spotify profile'
    if (error.message.includes('not found') || error.response?.status === 404) {
      errorMsg = '> User not found. Check user ID'
    } else if (error.message.includes('private')) {
      errorMsg = '> Profile is private or does not exist'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}