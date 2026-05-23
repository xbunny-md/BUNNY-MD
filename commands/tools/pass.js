// commands/tools/passgen.js
import crypto from 'crypto'

export const name = 'passgen'
export const alias = ['password', 'genpass', 'pass', 'pwd']
export const category = 'Tools'
export const desc = 'Generate strong random passwords with custom options'

export default async function passgen(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Parse options from args
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(new RegExp(`^\\${botSettings.prefix}passgen\\s*`, 'i'), '').replace(new RegExp(`^\\${botSettings.prefix}password\\s*`, 'i'), '')

    // 2. Default options
    let length = 16
    let useUpper = true
    let useLower = true
    let useNumbers = true
    let useSymbols = true
    let count = 1

    // 3. Parse user options
    if (input) {
      const parts = input.toLowerCase().split(/\s+/)

      // Parse length
      const lenMatch = input.match(/(\d+)/)
      if (lenMatch) {
        length = parseInt(lenMatch[1])
        if (length < 4) length = 4
        if (length > 128) length = 128
      }

      // Parse count - how many passwords
      const countMatch = input.match(/x(\d+)/)
      if (countMatch) {
        count = parseInt(countMatch[1])
        if (count < 1) count = 1
        if (count > 10) count = 10
      }

      // Parse flags
      if (parts.includes('noupper') || parts.includes('nolower') || parts.includes('nonumber') || parts.includes('nosymbol')) {
        if (parts.includes('noupper')) useUpper = false
        if (parts.includes('nolower')) useLower = false
        if (parts.includes('nonumber')) useNumbers = false
        if (parts.includes('nosymbol')) useSymbols = false
      }

      // If only specific types requested
      if (parts.includes('upper') || parts.includes('lower') || parts.includes('number') || parts.includes('symbol')) {
        useUpper = parts.includes('upper')
        useLower = parts.includes('lower')
        useNumbers = parts.includes('number') || parts.includes('num')
        useSymbols = parts.includes('symbol') || parts.includes('sym')
      }

      // Ensure at least one type is enabled
      if (!useUpper &&!useLower &&!useNumbers &&!useSymbols) {
        useLower = true
        useNumbers = true
      }
    }

    // 4. React first - BUNNY PASSWORD MODE 🔑
    await sock.sendMessage(from, {
      react: { text: '🔑', key: msg.key }
    })

    // 5. Send confirmation message first
    const confirmMsg = `╭─⌈ 🔑 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Password Generator*
│
│ ⚙️ *Settings:*
│ 📏 Length: ${length} chars
│ 🔤 Upper: ${useUpper? '✅' : '❌'}
│ 🔡 Lower: ${useLower? '✅' : '❌'}
│ 🔢 Numbers: ${useNumbers? '✅' : '❌'}
│ #️⃣ Symbols: ${useSymbols? '✅' : '❌'}
│ 🔁 Count: ${count}
│
│ ⏳ *Generating...*
│
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, { text: confirmMsg }, { quoted: msg })

    // 6. Build character sets
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'

    let charset = ''
    if (useUpper) charset += upper
    if (useLower) charset += lower
    if (useNumbers) charset += numbers
    if (useSymbols) charset += symbols

    // 7. Generate passwords - Crypto secure
    const passwords = []
    for (let i = 0; i < count; i++) {
      let password = ''
      const bytes = crypto.randomBytes(length)

      for (let j = 0; j < length; j++) {
        password += charset[bytes[j] % charset.length]
      }

      // Ensure password contains at least one of each selected type
      let hasRequired = true
      if (useUpper &&!/[A-Z]/.test(password)) hasRequired = false
      if (useLower &&!/[a-z]/.test(password)) hasRequired = false
      if (useNumbers &&!/[0-9]/.test(password)) hasRequired = false
      if (useSymbols &&!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) hasRequired = false

      // Regenerate if doesn't meet requirements
      if (!hasRequired && length >= 4) {
        i-- // retry
        continue
      }

      passwords.push(password)
    }

    // 8. Build output - Easy to copy format
    let output = ''
    if (count === 1) {
      output = passwords[0]
    } else {
      output = passwords.map((pwd, idx) => `${idx + 1}. ${pwd}`).join('\n')
    }

    // 9. Send password as separate message for easy copy
    await sock.sendMessage(from, {
      text: `*Generated Password${count > 1? 's' : ''}:*\n\n\`\`\`${output}\`\`\`\n\n> Tap to copy`
    }, { quoted: msg })

    // 10. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PASSGEN ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to generate password. Try again'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}