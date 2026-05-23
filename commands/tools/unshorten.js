// commands/tools/unshorturl.js
import axios from 'axios'

export const name = 'unshorturl'
export const alias = ['unshort', 'expand', 'expandurl', 'reveal']
export const category = 'Tools'
export const desc = 'Expand shortened URLs to see real destination'

export default async function unshorturl(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract URL from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(new RegExp(`^\\${botSettings.prefix}unshort\\s*`, 'i'), '').replace(new RegExp(`^\\${botSettings.prefix}expand\\s*`, 'i'), '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}unshort <short-url>\n> Example: ${botSettings.prefix}unshort https://bit.ly/3xYz\n> Example: ${botSettings.prefix}unshort tinyurl.com/abc123\n> Reply: ${botSettings.prefix}unshort\n\n> Reply to a message with short link or send link directly`
      }, { quoted: msg })
    }

    // 2. Extract URL from input
    const urlRegex = /https?:\/\/[^\s]+/i
    const urlMatch = input.match(urlRegex)

    if (!urlMatch) {
      return await sock.sendMessage(from, {
        text: '> No URL found. Send a valid short link or reply to a message with link'
      }, { quoted: msg })
    }

    let shortUrl = urlMatch[0]

    // Add https if missing
    if (!shortUrl.startsWith('http')) {
      shortUrl = 'https://' + shortUrl
    }

    // 3. React first - BUNNY UNSHORTENER MODE 💧
    await sock.sendMessage(from, {
      react: { text: '💧', key: msg.key }
    })

    let finalUrl = null
    let redirectChain = []
    let usedMethod = null
    let isSafe = true
    let warnings = []

    // 4. Method 1: Direct HEAD request - Fastest
    try {
      const response = await axios.head(shortUrl, {
        maxRedirects: 10,
        timeout: 15000,
        validateStatus: (status) => status < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      finalUrl = response.request.res.responseUrl || response.request._redirectable._currentUrl || shortUrl
      usedMethod = 'HEAD Request'

      // Track redirects
      if (response.request._redirectable._redirectCount > 0) {
        redirectChain = response.request._redirectable._redirects.map(r => r.url)
      }
    } catch (e) {
      console.log('[UNSHORT] HEAD request failed:', e.message)
    }

    // 5. Method 2: GET request with manual redirect tracking
    if (!finalUrl || finalUrl === shortUrl) {
      try {
        const response = await axios.get(shortUrl, {
          maxRedirects: 10,
          timeout: 20000,
          validateStatus: (status) => status < 400,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        finalUrl = response.request.res.responseUrl || response.request._redirectable._currentUrl || shortUrl
        usedMethod = 'GET Request'

        if (response.request._redirectable._redirectCount > 0) {
          redirectChain = response.request._redirectable._redirects.map(r => r.url)
        }
      } catch (e) {
        console.log('[UNSHORT] GET request failed:', e.message)
      }
    }

    // 6. Method 3: Unshorten.me API
    if (!finalUrl || finalUrl === shortUrl) {
      try {
        const response = await axios.get('https://unshorten.me/json/' + encodeURIComponent(shortUrl), {
          timeout: 15000
        })

        if (response.data?.resolved_url) {
          finalUrl = response.data.resolved_url
          usedMethod = 'Unshorten.me API'
        }
      } catch (e) {
        console.log('[UNSHORT] Unshorten.me failed:', e.message)
      }
    }

    // 7. Method 4: LinkExpander API
    if (!finalUrl || finalUrl === shortUrl) {
      try {
        const response = await axios.get('https://api.linkexpander.com/v1/expand', {
          params: { url: shortUrl },
          timeout: 15000
        })

        if (response.data?.destination) {
          finalUrl = response.data.destination
          usedMethod = 'LinkExpander API'
        }
      } catch (e) {
        console.log('[UNSHORT] LinkExpander failed:', e.message)
      }
    }

    // 8. Method 5: CheckShortURL API
    if (!finalUrl || finalUrl === shortUrl) {
      try {
        const response = await axios.get('https://checkshorturl.com/expand.php', {
          params: { url: shortUrl },
          timeout: 15000
        })

        const match = response.data.match(/Long URL:\s*<a[^>]*>([^<]+)<\/a>/i)
        if (match) {
          finalUrl = match[1]
          usedMethod = 'CheckShortURL API'
        }
      } catch (e) {
        console.log('[UNSHORT] CheckShortURL failed:', e.message)
      }
    }

    if (!finalUrl || finalUrl === shortUrl) {
      throw new Error('Could not expand URL - all methods failed')
    }

    // 9. Safety checks
    const suspiciousDomains = ['bit.ly-warning', 'phishing', 'malware', 'scam']
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq']

    try {
      const finalDomain = new URL(finalUrl).hostname
      const finalTLD = finalDomain.substring(finalDomain.lastIndexOf('.'))

      if (suspiciousTLDs.some(tld => finalDomain.endsWith(tld))) {
        isSafe = false
        warnings.push('Suspicious TLD detected')
      }

      if (suspiciousDomains.some(d => finalDomain.includes(d))) {
        isSafe = false
        warnings.push('Suspicious domain detected')
      }

      if (finalUrl.length > 200) {
        warnings.push('Very long URL')
      }

      if (redirectChain.length > 5) {
        warnings.push(`Multiple redirects: ${redirectChain.length}`)
      }
    } catch (e) {
      console.log('[UNSHORT] Safety check failed')
    }

    // 10. Get domains for display
    const shortDomain = new URL(shortUrl).hostname.replace('www.', '')
    const finalDomain = new URL(finalUrl).hostname.replace('www.', '')

    // 11. Build caption - CLEAN DESIGN
    let caption = `╭─⌈ 💧 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *URL Expander Tool*
│
│ 🔗 *Short URL:* ${shortUrl}
│ 🏷️ *Service:* ${shortDomain}
│
│ ✨ *Real URL:* ${finalUrl.length > 80? finalUrl.slice(0, 77) + '...' : finalUrl}
│ 🌐 *Domain:* ${finalDomain}
│
│ 📡 *Method:* ${usedMethod}
│ 🔄 *Redirects:* ${redirectChain.length}`

    if (redirectChain.length > 0 && redirectChain.length <= 3) {
      caption += `\n│\n│ 📍 *Chain:*`
      redirectChain.slice(0, 3).forEach((url, i) => {
        const domain = new URL(url).hostname.replace('www.', '')
        caption += `\n│ ${i + 1}. ${domain}`
      })
    }

    caption += `\n│\n│ ${isSafe? '✅ *Safety:* Looks Safe' : '⚠️ *Safety:* Caution Advised'}`

    if (warnings.length > 0) {
      caption += `\n│ ⚠️ *Warnings:* ${warnings.join(', ')}`
    }

    caption += `\n│\n╰⊷ *Powered By Bunny Tech*`

    // 12. Send result
    await sock.sendMessage(from, {
      text: caption,
      contextInfo: {
        externalAdReply: {
          title: 'URL Expanded',
          body: `${shortDomain} → ${finalDomain}`,
          thumbnailUrl: `https://logo.clearbit.com/${finalDomain}`,
          mediaType: 1,
          renderLargerThumbnail: false,
          sourceUrl: finalUrl
        }
      }
    }, { quoted: msg })

    // 13. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[UNSHORTURL ERROR]', error.message)

    let errorMsg = '> Failed to expand URL'
    if (error.message.includes('Could not expand')) {
      errorMsg = '> Could not expand URL. Link may be invalid or service down'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    } else if (error.message.includes('ENOTFOUND')) {
      errorMsg = '> Short URL not found or invalid'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}