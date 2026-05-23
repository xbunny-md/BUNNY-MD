// commands/stalker/pintereststalk.js
import axios from 'axios'

export const name = 'pintereststalk'
export const alias = ['pinstalk', 'pininfo', 'pinterest']
export const category = 'Stalker'
export const desc = 'Get Pinterest profile information'

export default async function pintereststalk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract username from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?pinstalk\s*/i, '').replace(/^[!.]?pintereststalk\s*/i, '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}pinstalk <username>\n> Example: ${botSettings.prefix}pinstalk johndoe\n> Example: ${botSettings.prefix}pinstalk https://pinterest.com/johndoe`
      }, { quoted: msg })
    }

    // Clean input - extract username
    let identifier = input
  .replace(/https?:\/\/(www\.)?pinterest\.com\//, '')
  .replace(/@/, '')
  .split('/')[0]
  .split('?')[0]
  .trim()

    // 2. React first - BUNNY STALKER MODE 💩
    await sock.sendMessage(from, {
      react: { text: '💩', key: msg.key }
    })

    let userData = null

    // 3. Primary API - Pinterest Scraper
    try {
      const res1 = await axios.get(`https://www.pinterest.com/${identifier}/`, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        }
      })

      const html = res1.data
      const jsonMatch = html.match(/<script id="__PWS_DATA__" type="application\/json">(.*?)<\/script>/)

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1])
        const user = data?.props?.initialReduxState?.users?.[Object.keys(data?.props?.initialReduxState?.users)[0]]

        if (user) {
          userData = {
            username: user.username || identifier,
            fullName: user.full_name || 'No Name',
            bio: user.about || 'No bio',
            imageUrl: user.image_large_url || user.image_medium_url || null,
            website: user.website_url || null,
            country: user.country || 'Unknown',
            followers: user.follower_count || 0,
            following: user.following_count || 0,
            pins: user.pin_count || 0,
            boards: user.board_count || 0,
            monthlyViews: user.profile_views || 0,
            verified: user.is_verified || false,
            accountType: user.account_type || 'personal'
          }
        }
      }
    } catch (e) {
      console.log('[PINSTALK] Primary scraper failed:', e.message)
    }

    // 4. Fallback API - Alternative
    if (!userData) {
      try {
        const res2 = await axios.get(`https://api.pinterest.com/v3/users/${identifier}/`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'BunnyMD-Stalker'
          }
        })

        if (res2.data?.data) {
          const user = res2.data.data
          userData = {
            username: user.username || identifier,
            fullName: user.full_name || 'No Name',
            bio: user.bio || 'No bio',
            imageUrl: user.image_xlarge_url || user.image_large_url || null,
            website: user.website_url || null,
            country: user.country || 'Unknown',
            followers: user.follower_count || 0,
            following: user.following_count || 0,
            pins: user.pin_count || 0,
            boards: user.board_count || 0,
            monthlyViews: 0,
            verified: user.is_verified_merchant || false,
            accountType: user.account_type || 'personal'
          }
        }
      } catch (e) {
        console.log('[PINSTALK] Fallback API failed')
      }
    }

    if (!userData) {
      throw new Error('User not found or profile is private')
    }

    // 5. Format numbers nicely
    const formatNumber = (num) => {
      if (!num) return '0'
      if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
      return num.toString()
    }

    // 6. Determine status
    const verifyStatus = userData.verified? 'Verified ✅' : 'Not Verified'
    const accountEmoji = userData.accountType === 'business'? '💼' : '👤'
    const accountType = userData.accountType === 'business'? 'Business' : 'Personal'

    // 7. Build info card - ENGLISH ONLY
    let infoCard = `╭─⌈ 💩 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Pinterest Profile Stalker*
│
│ ${accountEmoji} *Name:* ${userData.fullName}
│ 🏷️ *Username:* @${userData.username}
│ 💬 *Bio:* ${userData.bio.slice(0, 120)}${userData.bio.length > 120? '...' : ''}
│
│ ${verifyStatus} | ${accountType}
│ 🌍 *Country:* ${userData.country}
│
│ 📊 *Statistics:*
│ 📌 Pins: ${formatNumber(userData.pins)}
│ 📋 Boards: ${formatNumber(userData.boards)}
│ 👥 Followers: ${formatNumber(userData.followers)}
│ ➕ Following: ${formatNumber(userData.following)}
│ 👁️ Monthly Views: ${formatNumber(userData.monthlyViews)}
│`

    if (userData.website) {
      infoCard += `\n│ 🔗 *Website:* ${userData.website}`
    }

    infoCard += `\n│\n│ 🔗 *Profile:* https://pinterest.com/${userData.username}`
    infoCard += `\n│\n╰⊷ *BUNNY MD STALKER MODE*`

    // 8. Send WITH REAL PROFILE PICTURE if available
    if (userData.imageUrl) {
      await sock.sendMessage(from, {
        image: { url: userData.imageUrl },
        caption: infoCard,
        contextInfo: {
          externalAdReply: {
            title: `@${userData.username}`,
            body: `${formatNumber(userData.followers)} Followers • ${formatNumber(userData.pins)} Pins`,
            thumbnailUrl: userData.imageUrl,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: `https://pinterest.com/${userData.username}`
          }
        }
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        text: infoCard + `\n\n> No profile picture available`
      }, { quoted: msg })
    }

    // 9. React done ✅ - NO DELETE, NO PROCESS MSG
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PINSTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch Pinterest profile'
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