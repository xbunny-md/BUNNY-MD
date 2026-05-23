// commands/tools/screenshot.js
import axios from 'axios'

export const name = 'screenshot'
export const alias = ['ss', 'sshot', 'screenshoot', 'webshot']
export const category = 'Tools'
export const desc = 'Take website screenshot with custom delay'

export default async function screenshot(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract URL and delay from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?ss\s*/i, '').replace(/^[!.]?screenshot\s*/i, '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}ss <url> [delay]\n> Example: ${botSettings.prefix}ss google.com\n> Example: ${botSettings.prefix}ss google.com 6\n> Example: ${botSettings.prefix}ss https://youtube.com 10\n\n> Default delay: 5s if not specified\n> Format: PC or Mobile auto-detected`
      }, { quoted: msg })
    }

    // 2. Parse URL and delay
    const parts = input.trim().split(/\s+/)
    let url = parts[0]
    let delay = parseInt(parts[1]) || 5 // Default 5s

    // Validate delay
    if (delay < 0 || delay > 60) {
      delay = 5 // Max 60s, min 0s
    }

    // Clean URL - add https if missing
    if (!url.startsWith('http://') &&!url.startsWith('https://')) {
      url = 'https://' + url
    }

    // Validate URL format
    try {
      new URL(url)
    } catch (e) {
      return await sock.sendMessage(from, {
        text: '> Invalid URL format. Use: google.com or https://google.com'
      }, { quoted: msg })
    }

    // 3. React first - BUNNY SCREENSHOT MODE 🎩
    await sock.sendMessage(from, {
      react: { text: '🎩', key: msg.key }
    })

    // 4. Screenshot APIs with fallback chain
    const apis = [
      // API 1: Screenshot Machine - PC
      {
        name: 'ScreenshotMachine-PC',
        url: `https://api.screenshotmachine.com`,
        params: {
          key: 'demo',
          url: url,
          dimension: '1920x1080',
          format: 'png',
          delay: delay * 1000
        },
        proxy: null
      },
      // API 2: Screenshot Machine - Mobile
      {
        name: 'ScreenshotMachine-Mobile',
        url: `https://api.screenshotmachine.com`,
        params: {
          key: 'demo',
          url: url,
          dimension: '375x667',
          format: 'png',
          delay: delay * 1000
        },
        proxy: null
      },
      // API 3: HTMLCSSToImage - US Server
      {
        name: 'HTMLCSS-US',
        url: `https://htmlcsstoimage.com/demo_run`,
        params: {
          url: url,
          viewport_width: 1920,
          viewport_height: 1080,
          delay: delay
        },
        proxy: null
      },
      // API 4: Thum.io - Germany Server
      {
        name: 'Thum-Germany',
        url: `https://image.thum.io/get/fullpage/viewportWidth/1920/png/noanimate`,
        params: {
          url: url,
          wait: delay
        },
        proxy: 'http://de.proxy:8080'
      },
      // API 5: ScreenshotAPI - Singapore
      {
        name: 'ScreenshotAPI-SG',
        url: `https://shot.screenshotapi.net/screenshot`,
        params: {
          token: 'demo',
          url: url,
          width: 1920,
          height: 1080,
          delay: delay,
          full_page: false
        },
        proxy: 'http://sg.proxy:8080'
      },
      // API 6: APIFlash - UK Server
      {
        name: 'APIFlash-UK',
        url: `https://api.apiflash.com/v1/urltoimage`,
        params: {
          access_key: 'demo',
          url: url,
          width: 1920,
          height: 1080,
          delay: delay,
          format: 'png'
        },
        proxy: 'http://uk.proxy:8080'
      }
    ]

    let screenshotBuffer = null
    let usedAPI = null
    let deviceType = 'PC'

    // 5. Try each API with proxy fallback
    for (const api of apis) {
      try {
        const config = {
          params: api.params,
          responseType: 'arraybuffer',
          timeout: 45000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }

        // Add proxy if available
        if (api.proxy) {
          const [host, port] = api.proxy.replace('http://', '').split(':')
          config.proxy = { host, port: parseInt(port) }
        }

        const response = await axios.get(api.url, config)

        if (response.data && response.status === 200) {
          screenshotBuffer = Buffer.from(response.data)
          usedAPI = api.name
          deviceType = api.name.includes('Mobile')? 'Mobile' : 'PC'
          break
        }
      } catch (e) {
        console.log(`[SS] ${api.name} failed:`, e.message)
        continue
      }
    }

    if (!screenshotBuffer) {
      throw new Error('All screenshot servers failed')
    }

    // 6. Get domain name for caption
    const domain = new URL(url).hostname.replace('www.', '')

    // 7. Build caption - CLEAN DESIGN
    let caption = `╭─⌈ 🎩 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Website Screenshot Tool*
│
│ 🌐 *URL:* ${url}
│ 📱 *Device:* ${deviceType}
│ ⏱️ *Delay:* ${delay}s
│ 🖥️ *Server:* ${usedAPI}
│ 📏 *Resolution:* ${deviceType === 'PC'? '1920x1080' : '375x667'}
│
│ ✅ *Status:* Captured Successfully
│
╰⊷ *Powered By Bunny Tech*`

    // 8. Send screenshot image
    await sock.sendMessage(from, {
      image: screenshotBuffer,
      caption: caption,
      mimetype: 'image/png',
      contextInfo: {
        externalAdReply: {
          title: domain,
          body: `${deviceType} • ${delay}s delay • ${usedAPI}`,
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: url
        }
      }
    }, { quoted: msg })

    // 9. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[SCREENSHOT ERROR]', error.message)

    let errorMsg = '> Failed to capture screenshot'
    if (error.message.includes('All screenshot servers failed')) {
      errorMsg = '> All servers failed. Website may block screenshots or be offline'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Website took too long to load'
    } else if (error.message.includes('Invalid URL')) {
      errorMsg = '> Invalid URL format'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}