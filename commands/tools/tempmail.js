// commands/tools/tempmail.js
import axios from 'axios'

export const name = 'tempmail'
export const alias = ['temp', 'mail', 'email', 'tmpmail', 'inbox']
export const category = 'Tools'
export const desc = 'Generate temporary email and check inbox'

export default async function tempmail(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Parse action from args
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ').toLowerCase()
    const action = textAfterCmd.split(' ')[0] || 'gen'

    // 2. React first - BUNNY TEMP MAIL MODE 🪢
    await sock.sendMessage(from, {
      react: { text: '🪢', key: msg.key }
    })

    // 3. ACTION: GENERATE NEW EMAIL
    if (action === 'gen' || action === 'new' || action === 'create' || action === '') {
      let email = null
      let token = null
      let usedAPI = null

      // API 1: 1secmail - Fast and reliable
      try {
        const response = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1', {
          timeout: 10000
        })

        if (response.data && response.data[0]) {
          email = response.data[0]
          const [login, domain] = email.split('@')
          token = `${login}:${domain}`
          usedAPI = '1SecMail'
        }
      } catch (e) {
        console.log('[TEMPMAIL] 1secmail failed:', e.message)
      }

      // API 2: Mail.tm Fallback
      if (!email) {
        try {
          const domainRes = await axios.get('https://api.mail.tm/domains', { timeout: 10000 })
          const domain = domainRes.data['hydra:member'][0]?.domain

          if (domain) {
            const username = `bunny${Date.now()}`
            email = `${username}@${domain}`
            token = email
            usedAPI = 'Mail.tm'
          }
        } catch (e) {
          console.log('[TEMPMAIL] Mail.tm failed:', e.message)
        }
      }

      // API 3: TempMail.lol Fallback
      if (!email) {
        try {
          const response = await axios.post('https://api.tempmail.lol/generate', {}, {
            timeout: 10000
          })

          if (response.data?.address) {
            email = response.data.address
            token = response.data.token
            usedAPI = 'TempMail.lol'
          }
        } catch (e) {
          console.log('[TEMPMAIL] TempMail.lol failed:', e.message)
        }
      }

      if (!email) {
        throw new Error('All email services failed')
      }

      // 4. Build caption - SIMPLE & CLEAN
      let caption = `╭─⌈ 🪢 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Temporary Email*
│
│ 📧 *Email:* ${email}
│ 🔑 *Token:* \`\`\`${token}\`\`\`
│ 📡 *API:* ${usedAPI}
│ ⏰ *Valid:* 10 minutes
│
│ 💡 *Usage:*
│ • Copy email and use it
│ • ${botSettings.prefix}tempmail check ${token}
│ • Check inbox anytime
│
│ ✅ *Status:* Generated Successfully
│
╰⊷ *Powered By Bunny Tech*`

      await sock.sendMessage(from, {
        text: caption,
        contextInfo: {
          externalAdReply: {
            title: 'Temp Email Ready',
            body: 'Tap to copy email',
            thumbnailUrl: 'https://i.imgur.com/7YQZx.png',
            mediaType: 1,
            renderLargerThumbnail: false
          }
        }
      }, { quoted: msg })

    }

    // 5. ACTION: CHECK INBOX
    else if (action === 'check' || action === 'inbox') {
      const token = textAfterCmd.split(' ')[1]

      if (!token) {
        return await sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}tempmail check <token>\n> Example: ${botSettings.prefix}tempmail check abc@1secmail.com\n\n> Token unapata baada ya generate email`
        }, { quoted: msg })
      }

      let messages = []
      let usedAPI = null

      // Check 1secmail format
      if (token.includes('@') && token.includes('1secmail')) {
        const [login, domain] = token.split('@')
        try {
          const response = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`, {
            timeout: 10000
          })

          if (response.data) {
            messages = response.data
            usedAPI = '1SecMail'
          }
        } catch (e) {
          console.log('[TEMPMAIL] 1secmail check failed:', e.message)
        }
      }
      // Check TempMail.lol format
      else {
        try {
          const response = await axios.get(`https://api.tempmail.lol/auth/${token}`, {
            timeout: 10000
          })

          if (response.data?.email) {
            messages = response.data.email
            usedAPI = 'TempMail.lol'
          }
        } catch (e) {
          console.log('[TEMPMAIL] TempMail.lol check failed:', e.message)
        }
      }

      // 6. Display inbox
      if (messages.length === 0) {
        await sock.sendMessage(from, {
          text: `╭─⌈ 🪢 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Inbox Empty*
│
│ 📭 *Messages:* 0
│ 🔑 *Token:* ${token}
│
│ 💡 *Tip:* Wait for emails to arrive
│ ⏰ *Note:* Emails auto-delete after 10 min
│
╰⊷ *Powered By Bunny Tech*`
        }, { quoted: msg })
      } else {
        let inboxText = `╭─⌈ 🪢 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Inbox Messages*
│
│ 📬 *Total:* ${messages.length}
│ 📡 *API:* ${usedAPI}
│\n`

        messages.slice(0, 5).forEach((mail, idx) => {
          const from = mail.from || mail.sender || 'Unknown'
          const subject = mail.subject || 'No Subject'
          const date = mail.date || mail.createdAt || 'Unknown'
          const id = mail.id || idx

          inboxText += `│ ${idx + 1}. *From:* ${from}\n│ *Subject:* ${subject}\n│ *Date:* ${date}\n│ *ID:* ${id}\n│\n`
        })

        inboxText += `│ 💡 *Read:* ${botSettings.prefix}tempmail read ${token} <id>
│
╰⊷ *Powered By Bunny Tech*`

        await sock.sendMessage(from, { text: inboxText }, { quoted: msg })
      }
    }

    // 7. ACTION: READ EMAIL
    else if (action === 'read') {
      const parts = textAfterCmd.split(' ')
      const token = parts[1]
      const mailId = parts[2]

      if (!token ||!mailId) {
        return await sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}tempmail read <token> <id>\n> Example: ${botSettings.prefix}tempmail read abc@1secmail.com 12345`
        }, { quoted: msg })
      }

      let mailContent = null

      // Read from 1secmail
      if (token.includes('@') && token.includes('1secmail')) {
        const [login, domain] = token.split('@')
        try {
          const response = await axios.get(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${mailId}`, {
            timeout: 10000
          })

          if (response.data) {
            mailContent = {
              from: response.data.from,
              subject: response.data.subject,
              date: response.data.date,
              body: response.data.textBody || response.data.htmlBody
            }
          }
        } catch (e) {
          console.log('[TEMPMAIL] Read failed:', e.message)
        }
      }

      if (!mailContent) {
        throw new Error('Email not found')
      }

      const bodyPreview = mailContent.body.length > 500? mailContent.body.slice(0, 497) + '...' : mailContent.body

      await sock.sendMessage(from, {
        text: `╭─⌈ 🪢 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Email Content*
│
│ 📧 *From:* ${mailContent.from}
│ 📝 *Subject:* ${mailContent.subject}
│ 📅 *Date:* ${mailContent.date}
│
│ 📄 *Body:*
${bodyPreview}
│
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    else {
      await sock.sendMessage(from, {
        text: `> Usage:\n> ${botSettings.prefix}tempmail gen - Generate email\n> ${botSettings.prefix}tempmail check <token> - Check inbox\n> ${botSettings.prefix}tempmail read <token> <id> - Read email`
      }, { quoted: msg })
    }

    // 8. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[TEMPMAIL ERROR]', error.message)

    let errorMsg = '> Failed to process temp mail'
    if (error.message.includes('All email services failed')) {
      errorMsg = '> All services failed. Try again later'
    } else if (error.message.includes('Email not found')) {
      errorMsg = '> Email not found or expired'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}