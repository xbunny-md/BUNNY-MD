// commands/tools/websitestatus.js
import axios from 'axios'

export const name = 'websitestatus'
export const alias = ['status', 'uptime', 'isup', 'checksite', 'down']
export const category = 'Tools'
export const desc = 'Check if website is up or down with response time'

export default async function websitestatus(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract URL from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(new RegExp(`^\\${botSettings.prefix}status\\s*`, 'i'), '').replace(new RegExp(`^\\${botSettings.prefix}uptime\\s*`, 'i'), '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}status <website>\n> Example: ${botSettings.prefix}status google.com\n> Example: ${botSettings.prefix}status https://github.com\n> Reply: ${botSettings.prefix}status\n\n> Reply to message with URL or send directly`
      }, { quoted: msg })
    }

    // 2. Extract and clean URL
    const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,})/i
    const urlMatch = input.match(urlRegex)

    if (!urlMatch) {
      return await sock.sendMessage(from, {
        text: '> No valid URL found. Send domain or full URL'
      }, { quoted: msg })
    }

    let siteUrl = urlMatch[0]

    // Add https if missing
    if (!siteUrl.startsWith('http')) {
      siteUrl = 'https://' + siteUrl
    }

    // 3. React first - BUNNY STATUS MODE 📶
    await sock.sendMessage(from, {
      react: { text: '📶', key: msg.key }
    })

    let isUp = false
    let statusCode = 0
    let responseTime = 0
    let serverHeader = 'Unknown'
    let contentType = 'Unknown'
    let ssl = false
    let errorMsg = null

    // 4. Check website status
    try {
      const startTime = Date.now()

      const response = await axios.get(siteUrl, {
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => true, // Accept all status codes
        headers: {
          'User-Agent': 'BunnyMD-StatusChecker/1.0'
        }
      })

      const endTime = Date.now()
      responseTime = endTime - startTime
      statusCode = response.status
      isUp = statusCode >= 200 && statusCode < 400

      // Get headers info
      serverHeader = response.headers['server'] || 'Unknown'
      contentType = response.headers['content-type']?.split(';')[0] || 'Unknown'
      ssl = siteUrl.startsWith('https')

    } catch (error) {
      isUp = false
      if (error.code === 'ENOTFOUND') {
        errorMsg = 'Domain not found'
      } else if (error.code === 'ECONNREFUSED') {
        errorMsg = 'Connection refused'
      } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        errorMsg = 'Connection timeout'
      } else {
        errorMsg = 'Site unreachable'
      }
    }

    // 5. Get domain info
    const domain = new URL(siteUrl).hostname.replace('www.', '')

    // 6. Determine status emoji and text
    let statusEmoji = '🔴'
    let statusText = 'DOWN'
    if (isUp) {
      if (responseTime < 500) {
        statusEmoji = '🟢'
        statusText = 'UP - Fast'
      } else if (responseTime < 1500) {
        statusEmoji = '🟡'
        statusText = 'UP - Slow'
      } else {
        statusEmoji = '🟠'
        statusText = 'UP - Very Slow'
      }
    }

    // 7. Build caption - SIMPLE & CLEAN
    let caption = `╭─⌈ 📶 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Website Status*
│
│ 🌐 *Domain:* ${domain}
│ 🔗 *URL:* ${siteUrl}
│
│ ${statusEmoji} *Status:* ${statusText}
│ 📊 *Code:* ${statusCode || 'N/A'}
│ ⚡ *Response:* ${responseTime}ms
│ 🔒 *SSL:* ${ssl? '✅ Enabled' : '❌ Disabled'}
│
│ 🖥️ *Server:* ${serverHeader}
│ 📄 *Type:* ${contentType}`

    if (errorMsg) {
      caption += `\n│ ⚠️ *Error:* ${errorMsg}`
    }

    caption += `\n│\n│ ✅ *Checked:* ${new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Nairobi' })}
│
╰⊷ *Powered By Bunny Tech*`

    // 8. Send result
    await sock.sendMessage(from, {
      text: caption,
      contextInfo: {
        externalAdReply: {
          title: `${statusEmoji} ${domain} - ${statusText}`,
          body: `Response: ${responseTime}ms | Code: ${statusCode || 'N/A'}`,
          thumbnailUrl: `https://logo.clearbit.com/${domain}`,
          mediaType: 1,
          renderLargerThumbnail: false,
          sourceUrl: siteUrl
        }
      }
    }, { quoted: msg })

    // 9. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[STATUS ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to check website status. Try again'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}