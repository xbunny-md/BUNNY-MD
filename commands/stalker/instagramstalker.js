// commands/stalker/instagramstalk.js
import axios from 'axios'

export const name = 'instagramstalk'
export const alias = ['igstalk', 'iginfo', 'instainfo']
export const category = 'Stalker'
export const desc = 'Get Instagram user profile information'

export default async function instagramstalk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract username from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let username = textAfterCmd || messageText.replace(/^[!.]?igstalk\s*/i, '') || quotedText
    username = username.replace(/@/, '').replace(/https?:\/\/(www\.)?instagram\.com\//, '').split('/')[0].split('?')[0].trim()

    if (!username) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}igstalk <username>\n> Example: ${botSettings.prefix}igstalk cristiano\n> Example: ${botSettings.prefix}igstalk @username`
      }, { quoted: msg })
    }

    // 2. React first - BUNNY STALKER MODE 👣
    await sock.sendMessage(from, {
      react: { text: '👣', key: msg.key }
    })

    const processingMsg = await sock.sendMessage(from, {
      text: `> Searching Instagram profile @${username}...`
    }, { quoted: msg })

    let userData = null

    // 3. Primary API - SaveIG User Info
    try {
      const res1 = await axios.get(`https://api.saveig.app/api/userinfo`, {
        params: { username: username },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (res1.data?.data?.user) {
        const user = res1.data.data.user
        userData = {
          username: user.username,
          fullName: user.full_name || 'No Name',
          avatar: user.profile_pic_url_hd || user.profile_pic_url,
          bio: user.biography || 'No bio',
          verified: user.is_verified,
          private: user.is_private,
          followers: user.edge_followed_by?.count || 0,
          following: user.edge_follow?.count || 0,
          posts: user.edge_owner_to_timeline_media?.count || 0,
          isBusiness: user.is_business_account || false,
          category: user.category_name || 'Personal',
          externalUrl: user.external_url || null,
          businessEmail: user.business_email || null
        }
      }
    } catch (e) {
      console.log('[IGSTALK] Primary API failed, trying fallback...')
    }

    // 4. Fallback API - Instagram120
    if (!userData) {
      try {
        const res2 = await axios.get(`https://api.instagram120.com/api/user`, {
          params: { username: username },
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        if (res2.data?.user) {
          const user = res2.data.user
          userData = {
            username: user.username,
            fullName: user.full_name || 'No Name',
            avatar: user.profile_pic_url_hd,
            bio: user.biography || 'No bio',
            verified: user.is_verified,
            private: user.is_private,
            followers: user.follower_count || 0,
            following: user.following_count || 0,
            posts: user.media_count || 0,
            isBusiness: user.is_business || false,
            category: user.category || 'Personal',
            externalUrl: user.external_url || null,
            businessEmail: user.public_email || null
          }
        }
      } catch (e) {
        console.log('[IGSTALK] Fallback failed')
      }
    }

    if (!userData) {
      throw new Error('User not found or profile is private')
    }

    // 5. Format numbers nicely
    const formatNumber = (num) => {
      if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
      return num.toString()
    }

    // 6. Determine account type
    const accountType = userData.isBusiness? `Business 💼 - ${userData.category}` : 'Personal 👤'
    const verifyStatus = userData.verified? 'Verified ✅' : 'Not Verified'
    const privacyStatus = userData.private? 'Private 🔒' : 'Public 🌍'

    // 7. Build info card - BUNNY STYLE
    let infoCard = `╭─⌈ 👣 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Instagram Profile Stalker*
│
│ 👤 *Username:* @${userData.username}
│ 📝 *Full Name:* ${userData.fullName}
│ 💬 *Bio:* ${userData.bio.slice(0, 80)}${userData.bio.length > 80? '...' : ''}
│
│ ${verifyStatus} | ${privacyStatus}
│ 🏷️ *Account:* ${accountType}
│
│ 📊 *Statistics:*
│ 👥 Followers: ${formatNumber(userData.followers)}
│ ➕ Following: ${formatNumber(userData.following)}
│ 📸 Posts: ${formatNumber(userData.posts)}
│`

    if (userData.externalUrl) {
      infoCard += `\n│ 🔗 *Website:* ${userData.externalUrl}`
    }
    if (userData.businessEmail) {
      infoCard += `\n│ 📧 *Email:* ${userData.businessEmail}`
    }

    infoCard += `\n│\n╰⊷ *Data retrieved successfully*`

    // 8. Send profile with avatar
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
            sourceUrl: `https://www.instagram.com/${userData.username}`
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
    console.error('[IGSTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch Instagram profile'
    if (error.message.includes('not found')) {
      errorMsg = '> User not found. Check username'
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