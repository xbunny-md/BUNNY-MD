// commands/tools/shorturl.js
import axios from 'axios'

export const name = 'shorturl'
export const alias = ['short', 'shorten', 'tinyurl', 'surl']
export const category = 'Tools'
export const desc = 'Shorten long URLs with custom alias'

export default async function shorturl(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract URL and alias from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(new RegExp(`^\\${botSettings.prefix}short\\s*`, 'i'), '').replace(new RegExp(`^\\${botSettings.prefix}shorturl\\s*`, 'i'), '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}short <url> [alias]\n> Example: ${botSettings.prefix}short https://google.com\n> Example: ${botSettings.prefix}short https://youtube.com/watch?v=xyz bunny\n> Reply: ${botSettings.prefix}short myalias\n\n> Reply to a message with link or send link directly`
      }, { quoted: msg })
    }

    // 2. Parse URL and custom alias
    const parts = input.trim().split(/\s+/)
    let url = ''
    let customAlias = null

    // Check if first part is URL or alias
    const urlRegex = /https?:\/\/[^\s]+/i
    const firstPartIsUrl = urlRegex.test(parts[0])

    if (firstPartIsUrl) {
      url = parts[0]
      customAlias = parts[1] || null
    } else {
      // First part is alias, get URL from quoted message
      customAlias = parts[0]
      const urlMatch = quotedText.match(urlRegex)
      if (urlMatch) {
        url = urlMatch[0]
      }
    }

    // 3. Validate URL
    if (!url) {
      return await sock.sendMessage(from, {
        text: '> No URL found. Send a valid link or reply to a message with link'
      }, { quoted: msg })
    }

    try {
      new URL(url)
    } catch (e) {
      return await sock.sendMessage(from, {
        text: '> Invalid URL format. Use: https://example.com'
      }, { quoted: msg })
    }

    // 4. React first - BUNNY SHORTENER MODE 💥
    await sock.sendMessage(from, {
      react: { text: '💥', key: msg.key }
    })

    let shortUrl = null
    let usedService = null

    // 5. API Chain with fallbacks
    const apis = [
      // API 1: TinyURL - Supports custom alias
      {
        name: 'TinyURL',
        url: 'https://tinyurl.com/api-create.php',
        params: { url: url, alias: customAlias },
        method: 'get'
      },
      // API 2: is.gd - Simple and fast
      {
        name: 'is.gd',
        url: 'https://is.gd/create.php',
        params: { format: 'json', url: url, shorturl: customAlias },
        method: 'get'
      },
      // API 3: v.gd - Alternative
      {
        name: 'v.gd',
        url: 'https://v.gd/create.php',
        params: { format: 'json', url: url, shorturl: customAlias },
        method: 'get'
      },
      // API 4: tny.im - No alias support
      {
        name: 'tny.im',
        url: 'https://tny.im/api/short',
        params: { url: url },
        method: 'post'
      },
      // API 5: clck.ru - Russian service
      {
        name: 'clck.ru',
        url: 'https://clck.ru/--',
        params: { url: url },
        method: 'get'
      }
    ]

    // 6. Try each API
    for (const api of apis) {
      try {
        let response
        if (api.method === 'post') {
          response = await axios.post(api.url, api.params, {
            timeout: 15000,
            headers: { 'User-Agent': 'BunnyMD-Shortener/1.0' }
          })
        } else {
          response = await axios.get(api.url, {
            params: api.params,
            timeout: 15000,
            headers: { 'User-Agent': 'BunnyMD-Shortener/1.0' }
          })
        }

        if (response.data) {
          // Parse based on service
          if (api.name === 'TinyURL' && typeof response.data === 'string' && response.data.startsWith('http')) {
            shortUrl = response.data.trim()
            usedService = 'TinyURL'
            break
          }
          if ((api.name === 'is.gd' || api.name === 'v.gd') && response.data.shorturl) {
            shortUrl = response.data.shorturl
            usedService = api.name
            break
          }
          if (api.name === 'tny.im' && response.data.short) {
            shortUrl = response.data.short
            usedService = 'tny.im'
            break
          }
          if (api.name === 'clck.ru' && typeof response.data === 'string' && response.data.startsWith('http')) {
            shortUrl = response.data.trim()
            usedService = 'clck.ru'
            break
          }
        }
      } catch (e) {
        console.log(`[SHORT] ${api.name} failed:`, e.message)
        // Check if alias taken error
        if (e.response?.data?.includes('already exists') || e.response?.data?.includes('taken')) {
          await sock.sendMessage(from, {
            text: `> Alias "${customAlias}" already taken. Try another or remove alias for random`
          }, { quoted: msg })
          await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
          return
        }
        continue
      }
    }

    if (!shortUrl) {
      throw new Error('All shortener services failed')
    }

    // 7. Get domain for display
    const originalDomain = new URL(url).hostname.replace('www.', '')
    const shortDomain = new URL(shortUrl).hostname

    // 8. Build caption - CLEAN DESIGN
    let caption = `╭─⌈ 💥 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *URL Shortener Tool*
│
│ 🔗 *Original:* ${url.length > 60? url.slice(0, 57) + '...' : url}
│ 🌐 *Domain:* ${originalDomain}
│
│ ✨ *Shortened:* ${shortUrl}
│ 🏷️ *Service:* ${shortDomain}
│ 📡 *API:* ${usedService}`

    if (customAlias) {
      caption += `\n│ 🎯 *Alias:* ${customAlias}`
    }

    caption += `\n│\n│ ✅ *Status:* Shortened Successfully`
    caption += `\n│\n╰⊷ *Powered By Bunny Tech*`

    // 9. Send result
    await sock.sendMessage(from, {
      text: caption,
      contextInfo: {
        externalAdReply: {
          title: 'Short URL Ready',
          body: `${originalDomain} → ${shortDomain}`,
          thumbnailUrl: `https://logo.clearbit.com/${originalDomain}`,
          mediaType: 1,
          renderLargerThumbnail: false,
          sourceUrl: shortUrl
        }
      }
    }, { quoted: msg })

    // 10. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[SHORTURL ERROR]', error.message)

    let errorMsg = '> Failed to shorten URL'
    if (error.message.includes('All shortener services failed')) {
      errorMsg = '> All services failed. Try again later'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Link may be too long'
    } else if (error.message.includes('Invalid')) {
      errorMsg = '> Invalid URL format'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}