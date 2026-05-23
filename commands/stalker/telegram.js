// commands/stalker/telegramstalk.js
import axios from 'axios'

export const name = 'telegramstalk'
export const alias = ['tgstalk', 'tginfo', 'telegraminfo', 'tgchannel']
export const category = 'Stalker'
export const desc = 'Get Telegram channel, group, or user information'

export default async function telegramstalk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract username/link from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?tgstalk\s*/i, '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}tgstalk <username/link>\n> Example: ${botSettings.prefix}tgstalk @durov\n> Example: ${botSettings.prefix}tgstalk durov\n> Example: ${botSettings.prefix}tgstalk https://t.me/durov\n> Works for channels, groups & users`
      }, { quoted: msg })
    }

    // Clean input - extract username
    let identifier = input
    .replace(/https?:\/\/(t\.me|telegram\.me)\//, '')
    .replace(/@/, '')
    .split('/')[0]
    .split('?')[0]
    .trim()

    // 2. React first - BUNNY STALKER MODE 🥷
    await sock.sendMessage(from, {
      react: { text: '🥷', key: msg.key }
    })

    const processingMsg = await sock.sendMessage(from, {
      text: `> Searching Telegram: @${identifier}...`
    }, { quoted: msg })

    let channelData = null

    // 3. Primary API - TGStat
    try {
      const res1 = await axios.get(`https://api.tgstat.com/channels/get`, {
        params: {
          token: 'free',
          username: identifier
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (res1.data?.response?.channel) {
        const ch = res1.data.response.channel
        channelData = {
          type: ch.type || 'channel',
          username: ch.username || identifier,
          title: ch.title || 'No Title',
          description: ch.description || 'No description',
          avatar: ch.avatar || null,
          members: ch.participants_count || 0,
          posts: ch.posts_count || 0,
          verified: ch.verified || false,
          scam: ch.scam || false,
          category: ch.category || 'Unknown',
          language: ch.language || 'Unknown',
          created: ch.created_at || null,
          link: `https://t.me/${identifier}`
        }
      }
    } catch (e) {
      console.log('[TGSTALK] Primary API failed, trying fallback...')
    }

    // 4. Fallback API - Telegram Preview
    if (!channelData) {
      try {
        const res2 = await axios.get(`https://t.me/${identifier}`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        const html = res2.data
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
        const membersMatch = html.match(/(\d+(?:,\d+)*)\s+members/)
        const subsMatch = html.match(/(\d+(?:,\d+)*)\s+subscribers/)

        if (titleMatch) {
          const members = membersMatch? parseInt(membersMatch[1].replace(/,/g, '')) : 0
          const subs = subsMatch? parseInt(subsMatch[1].replace(/,/g, '')) : 0

          channelData = {
            type: members > 0? 'group' : 'channel',
            username: identifier,
            title: titleMatch[1],
            description: descMatch? descMatch[1] : 'No description',
            avatar: imageMatch? imageMatch[1] : null,
            members: members || subs || 0,
            posts: 0,
            verified: html.includes('verified') || html.includes('✓'),
            scam: html.includes('scam'),
            category: 'Unknown',
            language: 'Unknown',
            created: null,
            link: `https://t.me/${identifier}`
          }
        }
      } catch (e) {
        console.log('[TGSTALK] Fallback failed')
      }
    }

    // 5. Last Fallback - Telegram Widget API
    if (!channelData) {
      try {
        const res3 = await axios.get(`https://api.telegram.org/bot/getChat`, {
          params: { chat_id: `@${identifier}` },
          timeout: 15000
        }).catch(() => null)

        if (res3?.data?.result) {
          const ch = res3.data.result
          channelData = {
            type: ch.type || 'channel',
            username: ch.username || identifier,
            title: ch.title || ch.first_name || 'No Title',
            description: ch.description || ch.bio || 'No description',
            avatar: null,
            members: ch.members_count || 0,
            posts: 0,
            verified: false,
            scam: false,
            category: 'Unknown',
            language: 'Unknown',
            created: null,
            link: `https://t.me/${identifier}`
          }
        }
      } catch (e) {
        console.log('[TGSTALK] Widget API failed')
      }
    }

    if (!channelData) {
      throw new Error('Channel/User not found or is private')
    }

    // 6. Format numbers nicely
    const formatNumber = (num) => {
      if (!num) return '0'
      if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B'
      if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
      return num.toString()
    }

    // 7. Format date
    const formatDate = (dateString) => {
      if (!dateString) return 'Unknown'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    // 8. Determine status & type
    const verifyStatus = channelData.verified? 'Verified ✅' : 'Not Verified'
    const scamStatus = channelData.scam? 'SCAM ⚠️' : 'Safe ✅'
    const typeEmoji = channelData.type === 'group'? '👥' : channelData.type === 'channel'? '📢' : '👤'
    const typeName = channelData.type === 'group'? 'Group' : channelData.type === 'channel'? 'Channel' : 'User'

    // 9. Build info card - BUNNY STYLE
    let infoCard = `╭─⌈ 🥷 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Telegram ${typeName} Stalker*
│
│ ${typeEmoji} *Name:* ${channelData.title}
│ 🏷️ *Username:* @${channelData.username}
│ 💬 *Description:* ${channelData.description.slice(0, 100)}${channelData.description.length > 100? '...' : ''}
│
│ ${verifyStatus} | ${scamStatus}
│ 📂 *Category:* ${channelData.category}
│ 🌍 *Language:* ${channelData.language}
│`

    if (channelData.created) {
      infoCard += `\n│ 📅 *Created:* ${formatDate(channelData.created)}`
    }

    infoCard += `\n│\n│ 📊 *Statistics:*`

    if (channelData.type === 'group') {
      infoCard += `\n│ 👥 Members: ${formatNumber(channelData.members)}`
    } else if (channelData.type === 'channel') {
      infoCard += `\n│ 👥 Subscribers: ${formatNumber(channelData.members)}`
      if (channelData.posts > 0) {
        infoCard += `\n│ 📝 Posts: ${formatNumber(channelData.posts)}`
      }
    }

    infoCard += `\n│\n╰⊷ *Data retrieved successfully*`

    // 10. Send channel with avatar
    if (channelData.avatar) {
      await sock.sendMessage(from, {
        image: { url: channelData.avatar },
        caption: infoCard,
        contextInfo: {
          externalAdReply: {
            title: `${channelData.title}`,
            body: `${typeName} • ${formatNumber(channelData.members)} Members • ${verifyStatus}`,
            thumbnailUrl: channelData.avatar,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: channelData.link
          }
        }
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        text: infoCard + `\n\n> Link: ${channelData.link}`
      }, { quoted: msg })
    }

    // 11. Delete processing message and react done ✅
    await sock.sendMessage(from, { delete: processingMsg.key })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[TGSTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch Telegram info'
    if (error.message.includes('not found')) {
      errorMsg = '> Channel/User not found. Check username'
    } else if (error.message.includes('private')) {
      errorMsg = '> Channel/Group is private'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}