// commands/stalker/snapchatstalk.js
import axios from 'axios'

export const name = 'snapchatstalk'
export const alias = ['snapstalk', 'snapinfo', 'snapchat']
export const category = 'Stalker'
export const desc = 'Get Snapchat profile information'

export default async function snapchatstalk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract username from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?snapstalk\s*/i, '').replace(/^[!.]?snapchatstalk\s*/i, '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}snapstalk <username>\n> Example: ${botSettings.prefix}snapstalk johndoe\n> Example: ${botSettings.prefix}snapstalk https://snapchat.com/add/johndoe`
      }, { quoted: msg })
    }

    // Clean input - extract username
    let identifier = input
.replace(/https?:\/\/(www\.)?snapchat\.com\/add\//, '')
.replace(/@/, '')
.split('/')[0]
.split('?')[0]
.trim()
.toLowerCase()

    // 2. React first - BUNNY STALKER MODE 🫂
    await sock.sendMessage(from, {
      react: { text: '🫂', key: msg.key }
    })

    let userData = null

    // 3. Primary API - Snapchat Web Scraper
    try {
      const res1 = await axios.get(`https://www.snapchat.com/add/${identifier}`, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        }
      })

      const html = res1.data
      const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/)

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1])
        const user = data?.props?.pageProps?.userProfile?.userInfo

        if (user) {
          userData = {
            username: user.username || identifier,
            displayName: user.displayName || 'No Name',
            bio: user.bio || 'No bio',
            bitmojiUrl: user.bitmoji?.avatar?.url || user.snapcodeImageUrl || null,
            snapcodeUrl: user.snapcodeImageUrl || null,
            profileUrl: `https://snapchat.com/add/${identifier}`,
            isVerified: user.isVerified || false,
            subscriberCount: user.subscriberCount || 0,
            countryCode: user.countryCode || 'Unknown'
          }
        }
      }
    } catch (e) {
      console.log('[SNAPSTALK] Primary scraper failed:', e.message)
    }

    // 4. Fallback API - Alternative Scraper
    if (!userData) {
      try {
        const res2 = await axios.get(`https://story.snapchat.com/@${identifier}`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'BunnyMD-Stalker'
          }
        })

        const html = res2.data
        const titleMatch = html.match(/<title>([^<]+) \(@([^)]+)\) on Snapchat<\/title>/)
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)

        if (titleMatch) {
          userData = {
            username: titleMatch[2] || identifier,
            displayName: titleMatch[1] || 'Unknown',
            bio: descMatch? descMatch[1] : 'No bio available',
            bitmojiUrl: imageMatch? imageMatch[1] : null,
            snapcodeUrl: null,
            profileUrl: `https://snapchat.com/add/${identifier}`,
            isVerified: false,
            subscriberCount: 0,
            countryCode: 'Unknown'
          }
        }
      } catch (e) {
        console.log('[SNAPSTALK] Fallback API failed')
      }
    }

    // 5. Last Fallback - Basic check
    if (!userData) {
      try {
        const res3 = await axios.get(`https://www.snapchat.com/add/${identifier}`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          validateStatus: (status) => status < 500
        })

        if (res3.status === 200) {
          userData = {
            username: identifier,
            displayName: 'Unknown',
            bio: 'Profile exists but limited data',
            bitmojiUrl: null,
            snapcodeUrl: `https://app.snapchat.com/web/deeplink/snapcode?username=${identifier}&type=SVG`,
            profileUrl: `https://snapchat.com/add/${identifier}`,
            isVerified: false,
            subscriberCount: 0,
            countryCode: 'Unknown'
          }
        }
      } catch (e) {
        console.log('[SNAPSTALK] Last fallback failed')
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
    const accountEmoji = userData.subscriberCount > 0? '⭐' : '👻'

    // 8. Build info card - ENGLISH ONLY
    let infoCard = `╭─⌈ 🫂 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Snapchat Profile Stalker*
│
│ ${accountEmoji} *Name:* ${userData.displayName}
│ 🏷️ *Username:* @${userData.username}
│ 💬 *Bio:* ${userData.bio.slice(0, 120)}${userData.bio.length > 120? '...' : ''}
│
│ ${verifyStatus}
│ 🌍 *Country:* ${userData.countryCode}
│
│ 📊 *Statistics:*
│ 👥 Subscribers: ${formatNumber(userData.subscriberCount)}
│`

    if (userData.snapcodeUrl) {
      infoCard += `│ 📱 *Snapcode:* Available\n│`
    }

    infoCard += `\n│ 🔗 *Profile:* ${userData.profileUrl}`
    infoCard += `\n│\n╰⊷ *BUNNY MD STALKER MODE*`

    // 9. Send WITH REAL BITMOJI/SNAPCODE if available
    if (userData.bitmojiUrl || userData.snapcodeUrl) {
      await sock.sendMessage(from, {
        image: { url: userData.bitmojiUrl || userData.snapcodeUrl },
        caption: infoCard,
        contextInfo: {
          externalAdReply: {
            title: `@${userData.username}`,
            body: `${userData.displayName} • ${formatNumber(userData.subscriberCount)} Subscribers`,
            thumbnailUrl: userData.bitmojiUrl || userData.snapcodeUrl,
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
    console.error('[SNAPSTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch Snapchat profile'
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