// commands/stalker/githubstalk.js
import axios from 'axios'

export const name = 'githubstalk'
export const alias = ['ghstalk', 'ghinfo', 'gitinfo', 'github']
export const category = 'Stalker'
export const desc = 'Get GitHub profile information'

export default async function githubstalk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract username from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?ghstalk\s*/i, '').replace(/^[!.]?githubstalk\s*/i, '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}ghstalk <username>\n> Example: ${botSettings.prefix}ghstalk torvalds\n> Example: ${botSettings.prefix}ghstalk https://github.com/torvalds`
      }, { quoted: msg })
    }

    // Clean input - extract username
    let identifier = input
   .replace(/https?:\/\/(www\.)?github\.com\//, '')
   .replace(/@/, '')
   .split('/')[0]
   .split('?')[0]
   .trim()

    // 2. React first - BUNNY STALKER MODE 💻
    await sock.sendMessage(from, {
      react: { text: '💻', key: msg.key }
    })

    let userData = null

    // 3. GitHub Official API - No key needed for public data
    try {
      const res1 = await axios.get(`https://api.github.com/users/${identifier}`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'BunnyMD-Stalker',
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (res1.data) {
        const user = res1.data
        userData = {
          id: user.id,
          username: user.login,
          name: user.name || 'No Name',
          bio: user.bio || 'No bio',
          company: user.company || null,
          blog: user.blog || null,
          location: user.location || 'Unknown',
          email: user.email || null,
          twitter: user.twitter_username || null,
          repos: user.public_repos || 0,
          gists: user.public_gists || 0,
          followers: user.followers || 0,
          following: user.following || 0,
          created: user.created_at || null,
          updated: user.updated_at || null,
          type: user.type || 'User',
          siteAdmin: user.site_admin || false,
          hireable: user.hireable || false
        }
      }
    } catch (e) {
      console.log('[GHSTALK] GitHub API failed:', e.response?.status)
    }

    if (!userData) {
      throw new Error('User not found')
    }

    // 4. Get additional repo stats - top languages
    let topLang = 'Unknown'
    let stars = 0
    try {
      const reposRes = await axios.get(`https://api.github.com/users/${identifier}/repos`, {
        params: { per_page: 100, sort: 'updated' },
        timeout: 15000,
        headers: {
          'User-Agent': 'BunnyMD-Stalker',
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (reposRes.data?.length > 0) {
        const languages = {}
        reposRes.data.forEach(repo => {
          if (repo.language) {
            languages[repo.language] = (languages[repo.language] || 0) + 1
          }
          stars += repo.stargazers_count || 0
        })
        topLang = Object.keys(languages).sort((a, b) => languages[b] - languages[a])[0] || 'Unknown'
      }
    } catch (e) {
      console.log('[GHSTALK] Repos fetch failed')
    }

    // 5. Format numbers nicely
    const formatNumber = (num) => {
      if (!num) return '0'
      if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
      return num.toString()
    }

    // 6. Format date
    const formatDate = (dateString) => {
      if (!dateString) return 'Unknown'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    // 7. Determine status
    const adminStatus = userData.siteAdmin? 'GitHub Staff ⭐' : 'Regular User'
    const hireableStatus = userData.hireable? 'Available for hire 💼' : 'Not hireable'
    const typeEmoji = userData.type === 'Organization'? '🏢' : '👤'

    // 8. Build info card - ENGLISH ONLY
    let infoCard = `╭─⌈ 💻 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *GitHub Profile Stalker*
│
│ ${typeEmoji} *Name:* ${userData.name}
│ 🏷️ *Username:* @${userData.username}
│ 💬 *Bio:* ${userData.bio.slice(0, 120)}${userData.bio.length > 120? '...' : ''}
│
│ ${adminStatus} | ${hireableStatus}
│ 🏢 *Company:* ${userData.company || 'None'}
│ 🌍 *Location:* ${userData.location}
│ 📅 *Joined:* ${formatDate(userData.created)}
│
│ 📊 *Statistics:*
│ 📦 Repositories: ${formatNumber(userData.repos)}
│ ⭐ Total Stars: ${formatNumber(stars)}
│ 📝 Gists: ${formatNumber(userData.gists)}
│ 👥 Followers: ${formatNumber(userData.followers)}
│ ➕ Following: ${formatNumber(userData.following)}
│ 💻 *Top Language:* ${topLang}
│`

    if (userData.blog) {
      infoCard += `\n│ 🔗 *Website:* ${userData.blog}`
    }
    if (userData.twitter) {
      infoCard += `\n│ 🐦 *Twitter:* @${userData.twitter}`
    }
    if (userData.email) {
      infoCard += `\n│ 📧 *Email:* ${userData.email}`
    }

    infoCard += `\n│\n│ 🔗 *Profile:* https://github.com/${userData.username}`
    infoCard += `\n│\n╰⊷ *BUNNY MD STALKER MODE*`

    // 9. Send text only - NO AVATAR
    await sock.sendMessage(from, {
      text: infoCard,
      contextInfo: {
        externalAdReply: {
          title: `@${userData.username}`,
          body: `${formatNumber(userData.repos)} Repos • ${formatNumber(userData.followers)} Followers • ${topLang}`,
          mediaType: 1,
          renderLargerThumbnail: false,
          sourceUrl: `https://github.com/${userData.username}`
        }
      }
    }, { quoted: msg })

    // 10. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[GHSTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch GitHub profile'
    if (error.message.includes('not found') || error.response?.status === 404) {
      errorMsg = '> User not found. Check username'
    } else if (error.message.includes('rate limit') || error.response?.status === 403) {
      errorMsg = '> API rate limit. Try again later'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}