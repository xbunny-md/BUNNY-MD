// commands/stalker/tiktokstalk.js
import axios from 'axios'

export const name = 'tiktokstalk'
export const alias = ['ttstalk', 'ttinfo', 'tiktokinfo']
export const category = 'Stalker'
export const desc = 'Get TikTok user profile information'

export default async function tiktokstalk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract username from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let username = textAfterCmd || messageText.replace(/^[!.]?ttstalk\s*/i, '') || quotedText
    username = username.replace(/@/, '').replace(/https?:\/\/(www\.)?tiktok\.com\/@?/, '').split('/')[0].trim()

    if (!username) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}ttstalk <username>\n> Example: ${botSettings.prefix}ttstalk mrbeast\n> Example: ${botSettings.prefix}ttstalk @username`
      }, { quoted: msg })
    }

    // 2. React first - BUNNY STALKER MODE 👣
    await sock.sendMessage(from, {
      react: { text: '👣', key: msg.key }
    })

    const processingMsg = await sock.sendMessage(from, {
      text: `> Searching TikTok profile @${username}...`
    }, { quoted: msg })

    let userData = null

    // 3. Primary API - TikWM User Info
    try {
      const res1 = await axios.get(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (res1.data?.data?.user) {
        const user = res1.data.data.user
        const stats = res1.data.data.stats

        userData = {
          username: user.uniqueId,
          nickname: user.nickname,
          avatar: user.avatarLarger || user.avatarMedium,
          bio: user.signature || 'No bio',
          verified: user.verified,
          private: user.privateAccount,
          followers: stats.followerCount || 0,
          following: stats.followingCount || 0,
          likes: stats.heartCount || 0,
          videos: stats.videoCount || 0,
          region: user.region || 'Unknown',
          isCommerce: user.commerceUser || false,
          secUid: user.secUid
        }
      }
    } catch (e) {
      console.log('[TTSTALK] Primary API failed, trying fallback...')
    }

    // 4. Fallback API - TiktokAPI
    if (!userData) {
      try {
        const res2 = await axios.get(`https://api.tiktokapi.ga/v1/user/${encodeURIComponent(username)}`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        if (res2.data?.user) {
          const user = res2.data.user
          userData = {
            username: user.unique_id,
            nickname: user.nickname,
            avatar: user.avatar_larger?.url_list?.[0],
            bio: user.signature || 'No bio',
            verified: user.verified,
            private: user.secret,
            followers: user.follower_count || 0,
            following: user.following_count || 0,
            likes: user.total_favorited || 0,
            videos: user.aweme_count || 0,
            region: user.region || 'Unknown',
            isCommerce: user.is_star || false,
            secUid: user.sec_uid
          }
        }
      } catch (e) {
        console.log('[TTSTALK] Fallback failed')
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
    const accountType = userData.isCommerce? 'Business/Creator 💰' : 'Personal 👤'
    const verifyStatus = userData.verified? 'Verified ✅' : 'Not Verified'
    const privacyStatus = userData.private? 'Private 🔒' : 'Public 🌍'

    // 7. Build info card - BUNNY STYLE
    const infoCard = `╭─⌈ 👣 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *TikTok Profile Stalker*
│
│ 👤 *Username:* @${userData.username}
│ 📝 *Nickname:* ${userData.nickname}
│ 💬 *Bio:* ${userData.bio.slice(0, 80)}${userData.bio.length > 80? '...' : ''}
│
│ ${verifyStatus} | ${privacyStatus}
│ 🏷️ *Account:* ${accountType}
│ 🌍 *Region:* ${userData.region}
│
│ 📊 *Statistics:*
│ 👥 Followers: ${formatNumber(userData.followers)}
│ ➕ Following: ${formatNumber(userData.following)}
│ ❤️ Total Likes: ${formatNumber(userData.likes)}
│ 🎬 Videos: ${formatNumber(userData.videos)}
│
╰⊷ *Data retrieved successfully*`

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
            sourceUrl: `https://www.tiktok.com/@${userData.username}`
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
    console.error('[TTSTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch TikTok profile'
    if (error.message.includes('not found')) {
      errorMsg = '> User not found. Check username'
    } else if (error.message.includes('private')) {
      errorMsg = '> Profile is private or restricted'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}