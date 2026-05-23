// commands/tools/emailverify.js
import axios from 'axios'
import dns from 'dns/promises'

export const name = 'emailverify'
export const alias = ['email', 'verify', 'checkemail', 'validmail']
export const category = 'Tools'
export const desc = 'Verify if email address is valid, deliverable, and check if disposable'

export default async function emailverify(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract email from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(new RegExp(`^\\${botSettings.prefix}email\\s*`, 'i'), '').replace(new RegExp(`^\\${botSettings.prefix}verify\\s*`, 'i'), '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}email <email>\n> Example: ${botSettings.prefix}email test@gmail.com\n> Example: ${botSettings.prefix}email user@tempmail.com\n> Reply: ${botSettings.prefix}email\n\n> Reply to message with email or send directly`
      }, { quoted: msg })
    }

    // 2. Extract email using regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i
    const emailMatch = input.match(emailRegex)

    if (!emailMatch) {
      return await sock.sendMessage(from, {
        text: '> No valid email found. Send proper email format'
      }, { quoted: msg })
    }

    const email = emailMatch[0].toLowerCase()

    // 3. React first - BUNNY EMAIL VERIFY MODE 📧
    await sock.sendMessage(from, {
      react: { text: '📧', key: msg.key }
    })

    let isValidFormat = false
    let hasMX = false
    let isDisposable = false
    let isDeliverable = false
    let score = 0
    let domain = ''
    let usedAPI = null
    let errorMsg = null

    // 4. BASIC VALIDATION: Format check
    const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    isValidFormat = basicRegex.test(email)

    if (!isValidFormat) {
      throw new Error('Invalid email format')
    }

    domain = email.split('@')[1]
    score += 20

    // 5. DNS CHECK: MX Record
    try {
      const mxRecords = await dns.resolveMx(domain)
      hasMX = mxRecords && mxRecords.length > 0
      if (hasMX) score += 30
    } catch (e) {
      hasMX = false
    }

    // 6. API CHECK: Multiple services with fallback
    const verifyAPIs = [
      // API 1: EmailValidation.io - Free
      {
        name: 'EmailValidation',
        url: `https://api.emailvalidation.io/v1/info?apikey=free&email=${encodeURIComponent(email)}`,
        parser: (data) => ({
          valid: data.format_valid,
          deliverable: data.state === 'deliverable',
          disposable: data.disposable,
          score: data.score
        })
      },
      // API 2: AbstractAPI - Free tier
      {
        name: 'AbstractAPI',
        url: `https://emailvalidation.abstractapi.com/v1/?api_key=free&email=${encodeURIComponent(email)}`,
        parser: (data) => ({
          valid: data.is_valid_format?.value,
          deliverable: data.deliverability === 'DELIVERABLE',
          disposable: data.is_disposable_email?.value,
          score: data.quality_score
        })
      },
      // API 3: Kickbox - Free
      {
        name: 'Kickbox',
        url: `https://open.kickbox.com/v1/disposable/${encodeURIComponent(email)}`,
        parser: (data) => ({
          valid: true,
          deliverable:!data.disposable,
          disposable: data.disposable,
          score: data.disposable? 0 : 80
        })
      }
    ]

    for (const api of verifyAPIs) {
      try {
        const response = await axios.get(api.url, { timeout: 8000 })
        const parsed = api.parser(response.data)

        if (parsed.valid!== undefined) {
          isDeliverable = parsed.deliverable
          isDisposable = parsed.disposable
          if (parsed.score) score = Math.max(score, parsed.score * 100)
          usedAPI = api.name
          break
        }
      } catch (e) {
        console.log(`[EMAIL] ${api.name} failed:`, e.message)
        continue
      }
    }

    // 7. FALLBACK: Manual disposable check
    if (!usedAPI) {
      const disposableDomains = [
        'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
        'yopmail.com', 'throwaway.email', 'getnada.com', '1secmail.com',
        'maildrop.cc', 'temp-mail.org', 'sharklasers.com', 'guerrillamail.info'
      ]

      isDisposable = disposableDomains.some(d => domain.includes(d))
      isDeliverable = hasMX &&!isDisposable
      usedAPI = 'DNS + Manual'
    }

    // 8. Calculate final score and grade
    if (isDeliverable &&!isDisposable) score = Math.max(score, 70)
    if (!hasMX) score = Math.min(score, 30)
    if (isDisposable) score = Math.min(score, 20)

    let grade = 'Poor'
    let gradeEmoji = '🔴'
    if (score >= 80) {
      grade = 'Excellent'
      gradeEmoji = '🟢'
    } else if (score >= 60) {
      grade = 'Good'
      gradeEmoji = '🟡'
    } else if (score >= 40) {
      grade = 'Fair'
      gradeEmoji = '🟠'
    }

    // 9. Determine final status
    let statusEmoji = '❌'
    let statusText = 'INVALID'
    if (isValidFormat && hasMX && isDeliverable &&!isDisposable) {
      statusEmoji = '✅'
      statusText = 'VALID & DELIVERABLE'
    } else if (isValidFormat && hasMX) {
      statusEmoji = '⚠️'
      statusText = 'VALID BUT RISKY'
    }

    // 10. Build caption - SIMPLE & CLEAN
    let caption = `╭─⌈ 📧 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Email Verification*
│
│ 📧 *Email:* ${email}
│ 🌐 *Domain:* ${domain}
│
│ ${statusEmoji} *Status:* ${statusText}
│ ${gradeEmoji} *Grade:* ${grade} (${score}%)
│
│ ✓ *Format:* ${isValidFormat? '✅ Valid' : '❌ Invalid'}
│ 📡 *MX Record:* ${hasMX? '✅ Found' : '❌ Missing'}
│ 📬 *Deliverable:* ${isDeliverable? '✅ Yes' : '❌ No'}
│ 🗑️ *Disposable:* ${isDisposable? '⚠️ Yes' : '✅ No'}
│
│ 🔍 *API:* ${usedAPI}`

    if (errorMsg) {
      caption += `\n│ ⚠️ *Note:* ${errorMsg}`
    }

    caption += `\n│\n│ ✅ *Checked:* ${new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Nairobi' })}
│
╰⊷ *Powered By Bunny Tech*`

    // 11. Send result
    await sock.sendMessage(from, {
      text: caption
    }, { quoted: msg })

    // 12. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[EMAIL ERROR]', error.message)

    let errorMsg = '> Failed to verify email'
    if (error.message.includes('Invalid email format')) {
      errorMsg = '> Invalid email format. Use: user@domain.com'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}