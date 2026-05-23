// commands/tools/qrgenerator.js
import axios from 'axios'

export const name = 'qrgenerator'
export const alias = ['qr', 'qrcode', 'qrgen', 'makeqr']
export const category = 'Tools'
export const desc = 'Generate QR code from text or URL'

export default async function qrgenerator(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract text from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(new RegExp(`^\\${botSettings.prefix}qr\\s*`, 'i'), '').replace(new RegExp(`^\\${botSettings.prefix}qrcode\\s*`, 'i'), '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}qr <text/url>\n> Example: ${botSettings.prefix}qr https://google.com\n> Example: ${botSettings.prefix}qr Hello World\n> Reply: ${botSettings.prefix}qr\n\n> Reply to a message or send text/link directly`
      }, { quoted: msg })
    }

    // 2. Clean input - remove extra spaces
    const qrData = input.trim()

    if (qrData.length > 2000) {
      return await sock.sendMessage(from, {
        text: '> Text too long. Max 2000 characters'
      }, { quoted: msg })
    }

    // 3. React first - BUNNY QR MODE 🌬️
    await sock.sendMessage(from, {
      react: { text: '🌬️', key: msg.key }
    })

    let qrBuffer = null
    let usedAPI = null

    // 4. API Chain - Multiple fallbacks
    const apis = [
      // API 1: QR Server - Best quality
      {
        name: 'QRServer',
        url: 'https://api.qrserver.com/v1/create-qr-code/',
        params: {
          size: '500x500',
          data: qrData,
          format: 'png',
          margin: 10
        }
      },
      // API 2: GoQR - Alternative
      {
        name: 'GoQR',
        url: 'https://api.goqr.me/v1/qr',
        params: {
          size: '500x500',
          data: qrData,
          format: 'png'
        }
      },
      // API 3: QuickChart - Fast
      {
        name: 'QuickChart',
        url: 'https://quickchart.io/qr',
        params: {
          text: qrData,
          size: 500,
          margin: 2
        }
      },
      // API 4: QRCode Monkey - Custom
      {
        name: 'QRCodeMonkey',
        url: 'https://api.qrcode-monkey.com/qr/custom',
        params: {
          data: qrData,
          size: 500,
          file: 'png'
        }
      }
    ]

    // 5. Try each API
    for (const api of apis) {
      try {
        const response = await axios.get(api.url, {
          params: api.params,
          responseType: 'arraybuffer',
          timeout: 20000,
          headers: {
            'User-Agent': 'BunnyMD-QRGen/1.0'
          }
        })

        if (response.data && response.status === 200) {
          qrBuffer = Buffer.from(response.data)
          usedAPI = api.name
          break
        }
      } catch (e) {
        console.log(`[QR] ${api.name} failed:`, e.message)
        continue
      }
    }

    if (!qrBuffer) {
      throw new Error('All QR services failed')
    }

    // 6. Detect if input is URL
    const isUrl = /^https?:\/\//i.test(qrData)
    const displayText = qrData.length > 60? qrData.slice(0, 57) + '...' : qrData

    // 7. Build caption - SIMPLE & CLEAN
    let caption = `╭─⌈ 🌬️ *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *QR Code Generator*
│
│ ${isUrl? '🔗' : '📝'} *Type:* ${isUrl? 'URL' : 'Text'}
│ 📊 *Content:* ${displayText}
│ 📡 *API:* ${usedAPI}
│
│ ✅ *Status:* Generated Successfully
│
╰⊷ *Powered By Bunny Tech*`

    // 8. Send QR image
    await sock.sendMessage(from, {
      image: qrBuffer,
      caption: caption,
      mimetype: 'image/png',
      contextInfo: {
        externalAdReply: {
          title: 'QR Code Ready',
          body: isUrl? new URL(qrData).hostname : 'Text QR Code',
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
    console.error('[QR ERROR]', error.message)

    let errorMsg = '> Failed to generate QR code'
    if (error.message.includes('All QR services failed')) {
      errorMsg = '> All services failed. Try again later'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    } else if (error.message.includes('too long')) {
      errorMsg = '> Text too long for QR code'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}