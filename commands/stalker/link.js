// commands/stalker/linkedinstallk.js
import axios from 'axios'

export const name = 'linkedinstallk'
export const alias = ['linstalk', 'liinfo', 'linkedin', 'linkedininfo']
export const category = 'Stalker'
export const desc = 'Get LinkedIn profile information'

export default async function linkedinstallk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract username from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?linstalk\s*/i, '').replace(/^[!.]?linkedinstallk\s*/i, '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}linstalk <username>\n> Example: ${botSettings.prefix}linstalk williamhgates\n> Example: ${botSettings.prefix}linstalk https://linkedin.com/in/williamhgates`
      }, { quoted: msg })
    }

    // Clean input - extract username
    let identifier = input
  .replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, '')
  .replace(/@/, '')
  .split('/')[0]
  .split('?')[0]
  .trim()

    // 2. React first - BUNNY STALKER MODE 💣
    await sock.sendMessage(from, {
      react: { text: '💣', key: msg.key }
    })

    let userData = null

    // 3. Primary API - LinkedIn Scraper
    try {
      const res1 = await axios.get(`https://api.scrapingant.com/v2/linkedin`, {
        params: {
          url: `https://www.linkedin.com/in/${identifier}`,
          format: 'json'
        },
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (res1.data?.data) {
        const user = res1.data.data
        userData = {
          username: identifier,
          name: user.name || 'No Name',
          headline: user.headline || 'No headline',
          about: user.about || 'No about section',
          location: user.location || 'Unknown',
          company: user.company || null,
          position: user.position || null,
          followers: user.followers || 0,
          connections: user.connections || '500+',
          experience: user.experience || [],
          education: user.education || [],
          skills: user.skills || [],
          website: user.website || null,
          verified: user.verified || false
        }
      }
    } catch (e) {
      console.log('[LINSTALK] Primary API failed, trying fallback...')
    }

    // 4. Fallback API - Alternative Scraper
    if (!userData) {
      try {
        const res2 = await axios.get(`https://nubela.co/proxycurl/api/v2/linkedin`, {
          params: {
            url: `https://linkedin.com/in/${identifier}`,
            fallback_to_cache: 'on-error'
          },
          timeout: 20000,
          headers: {
            'Authorization': 'Bearer demo',
            'User-Agent': 'BunnyMD-Stalker'
          }
        })

        if (res2.data) {
          const user = res2.data
          userData = {
            username: identifier,
            name: user.full_name || (user.first_name + ' ' + user.last_name) || 'No Name',
            headline: user.occupation || user.headline || 'No headline',
            about: user.summary || 'No about section',
            location: user.country_full_name || user.city || 'Unknown',
            company: user.experiences?.[0]?.company || null,
            position: user.experiences?.[0]?.title || null,
            followers: user.follower_count || 0,
            connections: user.connections || '500+',
            experience: user.experiences?.slice(0, 3) || [],
            education: user.education?.slice(0, 2) || [],
            skills: user.skills?.slice(0, 5) || [],
            website: null,
            verified: false
          }
        }
      } catch (e) {
        console.log('[LINSTALK] Fallback failed')
      }
    }

    // 5. Last Fallback - Basic Scrape
    if (!userData) {
      try {
        const res3 = await axios.get(`https://www.linkedin.com/in/${identifier}`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        const html = res3.data
        const nameMatch = html.match(/<title>([^<]+) | LinkedIn<\/title>/)
        const headlineMatch = html.match(/"headline":"([^"]+)"/)

        if (nameMatch) {
          userData = {
            username: identifier,
            name: nameMatch[1] || 'Unknown',
            headline: headlineMatch? headlineMatch[1] : 'No headline',
            about: 'Profile found but limited data',
            location: 'Unknown',
            company: null,
            position: null,
            followers: 0,
            connections: 'Unknown',
            experience: [],
            education: [],
            skills: [],
            website: null,
            verified: false
          }
        }
      } catch (e) {
        console.log('[LINSTALK] Last fallback failed')
      }
    }

    if (!userData) {
      throw new Error('Profile not found or is private')
    }

    // 6. Format numbers nicely
    const formatNumber = (num) => {
      if (!num) return '0'
      if (typeof num === 'string') return num
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
      return num.toString()
    }

    // 7. Format experience
    const formatExperience = (exp) => {
      if (!exp || exp.length === 0) return 'None listed'
      return exp.map(e => {
        const title = e.title || e.position || 'Unknown'
        const company = e.company || e.company_name || 'Unknown'
        return `${title} at ${company}`
      }).join('\n│ • ')
    }

    // 8. Format education
    const formatEducation = (edu) => {
      if (!edu || edu.length === 0) return 'None listed'
      return edu.map(e => {
        const school = e.school || e.school_name || 'Unknown'
        const degree = e.degree_name || e.degree || ''
        return degree? `${degree} - ${school}` : school
      }).join('\n│ • ')
    }

    // 9. Determine status
    const verifyStatus = userData.verified? 'Verified ✅' : 'Not Verified'
    const connectionCount = typeof userData.connections === 'number'? formatNumber(userData.connections) : userData.connections

    // 10. Build info card - ENGLISH ONLY
    let infoCard = `╭─⌈ 💣 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *LinkedIn Profile Stalker*
│
│ 👤 *Name:* ${userData.name}
│ 🏷️ *Username:* ${userData.username}
│ 💼 *Headline:* ${userData.headline.slice(0, 100)}${userData.headline.length > 100? '...' : ''}
│
│ ${verifyStatus} | 🌍 ${userData.location}
│`

    if (userData.company && userData.position) {
      infoCard += `│ 💼 *Current:* ${userData.position} at ${userData.company}\n│`
    }

    infoCard += `\n│ 📊 *Statistics:*`
    infoCard += `\n│ 👥 Followers: ${formatNumber(userData.followers)}`
    infoCard += `\n│ 🤝 Connections: ${connectionCount}`

    if (userData.about && userData.about!== 'No about section') {
      infoCard += `\n│\n│ 📝 *About:*\n│ ${userData.about.slice(0, 150)}${userData.about.length > 150? '...' : ''}`
    }

    if (userData.experience.length > 0) {
      infoCard += `\n│\n│ 💼 *Experience:*\n│ • ${formatExperience(userData.experience)}`
    }

    if (userData.education.length > 0) {
      infoCard += `\n│\n│ 🎓 *Education:*\n│ • ${formatEducation(userData.education)}`
    }

    if (userData.skills.length > 0) {
      const skillsList = userData.skills.slice(0, 5).join(', ')
      infoCard += `\n│\n│ 🛠️ *Top Skills:* ${skillsList}`
    }

    if (userData.website) {
      infoCard += `\n│\n│ 🔗 *Website:* ${userData.website}`
    }

    infoCard += `\n│\n│ 🔗 *Profile:* https://linkedin.com/in/${userData.username}`
    infoCard += `\n│\n╰⊷ *BUNNY MD CLEAN MODE*`

    // 11. Send text only - NO AVATAR
    await sock.sendMessage(from, {
      text: infoCard,
      contextInfo: {
        externalAdReply: {
          title: `${userData.name}`,
          body: `${userData.headline.slice(0, 50)} • ${connectionCount} Connections`,
          mediaType: 1,
          renderLargerThumbnail: false,
          sourceUrl: `https://linkedin.com/in/${userData.username}`
        }
      }
    }, { quoted: msg })

    // 12. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[LINSTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch LinkedIn profile'
    if (error.message.includes('not found') || error.response?.status === 404) {
      errorMsg = '> Profile not found or private'
    } else if (error.message.includes('rate limit') || error.response?.status === 429) {
      errorMsg = '> Rate limit exceeded. Try again later'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}