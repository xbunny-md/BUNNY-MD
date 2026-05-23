// commands/tools/qrreader.js
import axios from 'axios'

export const name = 'qrreader'
export const alias = ['qrread', 'scanqr', 'readqr', 'decodeqr']
export const category = 'Tools'
export const desc = 'Read QR code from image and extract data'

export default async function qrreader(sock, { msg, from }, botSettings) {
  try {
    // 1. Check for image in message or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const imageMessage = msg.message?.imageMessage || quoted?.imageMessage

    if (!imageMessage) {
      return await sock.sendMessage(from, {
        text: `> Usage: Reply to QR image with ${botSettings.prefix}qrread\n> Or send image with caption ${botSettings.prefix}qrread\n\n> Send or reply to a QR code image to scan`
      }, { quoted: msg })
    }

    // 2. React first - BUNNY QR READER MODE 🎃
    await sock.sendMessage(from, {
      react: { text: '🎃', key: msg.key }
    })

    // 3. Download image buffer
    const buffer = await sock.downloadMediaMessage(
      imageMessage? { message: { imageMessage } } : msg
    )

    if (!buffer) {
      throw new Error('Failed to download image')
    }

    let qrData = null
    let usedAPI = null

    // 4. API Chain - Multiple fallbacks
    const apis = [
      // API 1: GoQR - Best for QR reading
      {
        name: 'GoQR',
        url: 'https://api.qrserver.com/v1/read-qr-code/',
        method: 'post',
        formData: true
      },
      // API 2: QRCode Scan API
      {
        name: 'QRCodeScan',
        url: 'https://api.qr-code-generator.com/v1/scan',
        method: 'post',
        formData: true
      },
      // API 3: ZXing Decoder
      {
        name: 'ZXing',
        url: 'https://zxing.org/w/decode',
        method: 'post',
        formData: true
      }
    ]

    // 5. Try each API
    for (const api of apis) {
      try {
        const formData = new FormData()
        const blob = new Blob([buffer], { type: 'image/png' })
        formData.append('file', blob, 'qr.png')

        const response = await axios.post(api.url, formData, {
          timeout: 20000,
          headers: {
            'User-Agent': 'BunnyMD-QRReader/1.0'
          }
        })

        if (response.data) {
          // Parse based on API
          if (api.name === 'GoQR' && response.data[0]?.symbol[0]?.data) {
            qrData = response.data[0].symbol[0].data
            usedAPI = 'GoQR'
            break
          }
          if (api.name === 'QRCodeScan' && response.data.data) {
            qrData = response.data.data
            usedAPI = 'QRCodeScan'
            break
          }
          if (api.name === 'ZXing' && typeof response.data === 'string') {
            const match = response.data.match(/Raw text:\s*<pre>([^<]+)<\/pre>/i)
            if (match) {
              qrData = match[1].trim()
              usedAPI = 'ZXing'
              break
            }
          }
        }
      } catch (e) {
        console.log(`[QRREAD] ${api.name} failed:`, e.message)
        continue
      }
    }

    if (!qrData) {
      throw new Error('No QR code detected in image')
    }

    // 6. Detect if result is URL
    const isUrl = /^https?:\/\//i.test(qrData)
    const displayText = qrData.length > 100? qrData.slice(0, 97) + '...' : qrData

    // 7. Build caption - SIMPLE & CLEAN
    let caption = `╭─⌈ 🎃 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *QR Code Reader*
│
│ ${isUrl? '🔗' : '📝'} *Type:* ${isUrl? 'URL' : 'Text'}
│ 📊 *Content:* ${displayText}
│ 📡 *API:* ${usedAPI}
│
│ ✅ *Status:* Decoded Successfully
│
╰⊷ *Powered By Bunny Tech*`

    // 8. Send result
    await sock.sendMessage(from, {
      text: caption,
      contextInfo: {
        externalAdReply: {
          title: 'QR Code Decoded',
          body: isUrl? new URL(qrData).hostname : 'Text Data',
          thumbnailUrl: isUrl? `https://logo.clearbit.com/${new URL(qrData).hostname}` : null,
          mediaType: 1,
          renderLargerThumbnail: false,
          sourceUrl: isUrl? qrData : null
        }
      }
    }, { quoted: msg })

    // 9. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[QRREAD ERROR]', error.message)

    let errorMsg = '> Failed to read QR code'
    if (error.message.includes('No QR code detected')) {
      errorMsg = '> No QR code found in image. Make sure image is clear'
    } else if (error.message.includes('Failed to download')) {
      errorMsg = '> Could not download image. Try again'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}