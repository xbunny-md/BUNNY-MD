// commands/tools/base64.js
export const name = 'base64'
export const alias = ['b64', 'base64', 'encode', 'decode']
export const category = 'Tools'
export const desc = 'Encode or decode base64 text'

export default async function base64(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract action and text from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(new RegExp(`^\\${botSettings.prefix}base64\\s*`, 'i'), '').replace(new RegExp(`^\\${botSettings.prefix}b64\\s*`, 'i'), '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}b64 <encode/decode> <text>\n> Example: ${botSettings.prefix}b64 encode Hello World\n> Example: ${botSettings.prefix}b64 decode SGVsbG8gV29ybGQ=\n> Reply: ${botSettings.prefix}b64 encode\n\n> Reply to message or send text directly`
      }, { quoted: msg })
    }

    // 2. Parse action and content
    const parts = input.trim().split(/\s+/)
    let action = parts[0].toLowerCase()
    let content = parts.slice(1).join(' ')

    // Auto detect if no action specified
    if (action!== 'encode' && action!== 'decode') {
      // Check if it looks like base64
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      if (base64Regex.test(input.replace(/\s/g, '')) && input.length % 4 === 0) {
        action = 'decode'
        content = input
      } else {
        action = 'encode'
        content = input
      }
    }

    if (!content) {
      return await sock.sendMessage(from, {
        text: '> No text provided to encode/decode'
      }, { quoted: msg })
    }

    // 3. React first - BUNNY BASE64 MODE 🔐
    await sock.sendMessage(from, {
      react: { text: '🔐', key: msg.key }
    })

    let result = null
    let errorMsg = null

    // 4. ACTION: ENCODE
    if (action === 'encode') {
      try {
        result = Buffer.from(content, 'utf8').toString('base64')
      } catch (e) {
        errorMsg = 'Failed to encode text'
      }
    }

    // 5. ACTION: DECODE
    if (action === 'decode') {
      try {
        // Clean base64 string
        const cleanBase64 = content.replace(/\s/g, '')
        result = Buffer.from(cleanBase64, 'base64').toString('utf8')

        // Check if result is valid UTF-8
        if (result.includes('�')) {
          errorMsg = 'Invalid base64 or binary data'
        }
      } catch (e) {
        errorMsg = 'Invalid base64 string'
      }
    }

    if (errorMsg ||!result) {
      throw new Error(errorMsg || 'Processing failed')
    }

    // 6. Limit output length for display
    const displayInput = content.length > 100? content.slice(0, 97) + '...' : content
    const displayOutput = result.length > 100? result.slice(0, 97) + '...' : result

    // 7. Build caption - SIMPLE & CLEAN
    let caption = `╭─⌈ 🔐 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Base64 Tool*
│
│ 🔧 *Action:* ${action.charAt(0).toUpperCase() + action.slice(1)}
│ 📥 *Input:* ${displayInput}
│
│ 📤 *Output:*
│ ${displayOutput}
│
│ ✅ *Status:* ${action === 'encode'? 'Encoded' : 'Decoded'} Successfully
│
╰⊷ *Powered By Bunny Tech*`

    // 8. Send result - if output is long, send as file
    if (result.length > 500) {
      const fileName = `${action}_base64.txt`
      await sock.sendMessage(from, {
        document: Buffer.from(result, 'utf8'),
        mimetype: 'text/plain',
        fileName: fileName,
        caption: caption
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        text: caption
      }, { quoted: msg })
    }

    // 9. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[BASE64 ERROR]', error.message)

    let errorMsg = '> Failed to process base64'
    if (error.message.includes('Invalid base64')) {
      errorMsg = '> Invalid base64 string. Check your input'
    } else if (error.message.includes('binary data')) {
      errorMsg = '> Decoded data is binary, cannot display as text'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}