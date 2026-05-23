// commands/tools/hashgen.js
import crypto from 'crypto'

export const name = 'hashgen'
export const alias = ['hash', 'md5', 'sha256', 'sha1', 'sha512']
export const category = 'Tools'
export const desc = 'Generate MD5, SHA1, SHA256, SHA512 hash'

export default async function hashgen(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract algorithm and text from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(new RegExp(`^\\${botSettings.prefix}hash\\s*`, 'i'), '').replace(new RegExp(`^\\${botSettings.prefix}md5\\s*`, 'i'), '').replace(new RegExp(`^\\${botSettings.prefix}sha256\\s*`, 'i'), '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}hash <type> <text>\n> Example: ${botSettings.prefix}hash md5 Hello World\n> Example: ${botSettings.prefix}hash sha256 password123\n> Reply: ${botSettings.prefix}hash md5\n\n> *Types:* md5, sha1, sha256, sha512\n> Reply to message or send text directly`
      }, { quoted: msg })
    }

    // 2. Parse algorithm and content
    const parts = input.trim().split(/\s+/)
    let algo = parts[0].toLowerCase()
    let content = parts.slice(1).join(' ')

    // Check if first word is algorithm or text
    const validAlgos = ['md5', 'sha1', 'sha256', 'sha512']
    if (!validAlgos.includes(algo)) {
      // First word is not algo, so hash everything as sha256 default
      content = input
      algo = 'sha256'
    }

    if (!content) {
      return await sock.sendMessage(from, {
        text: '> No text provided to hash'
      }, { quoted: msg })
    }

    // Validate algorithm
    if (!validAlgos.includes(algo)) {
      return await sock.sendMessage(from, {
        text: `> Invalid algorithm. Use: md5, sha1, sha256, sha512\n> Example: ${botSettings.prefix}hash sha256 Hello`
      }, { quoted: msg })
    }

    // 3. React first - BUNNY HASH MODE 🥽
    await sock.sendMessage(from, {
      react: { text: '🥽', key: msg.key }
    })

    // 4. Generate hash - No API needed, pure crypto
    let hash = null
    try {
      hash = crypto.createHash(algo).update(content, 'utf8').digest('hex')
    } catch (e) {
      throw new Error('Failed to generate hash')
    }

    // 5. Limit display length
    const displayInput = content.length > 80? content.slice(0, 77) + '...' : content

    // 6. Build caption - SIMPLE & CLEAN
    let caption = `╭─⌈ 🥽 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Hash Generator*
│
│ 🔧 *Algorithm:* ${algo.toUpperCase()}
│ 📥 *Input:* ${displayInput}
│
│ 📤 *Hash:*
│ ${hash}
│
│ ✅ *Status:* Generated Successfully
│
╰⊷ *Powered By Bunny Tech*`

    // 7. Send result
    await sock.sendMessage(from, {
      text: caption
    }, { quoted: msg })

    // 8. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[HASH ERROR]', error.message)

    let errorMsg = '> Failed to generate hash'
    if (error.message.includes('Invalid')) {
      errorMsg = '> Invalid algorithm. Use: md5, sha1, sha256, sha512'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}