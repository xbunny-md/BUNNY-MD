// commands/group/add.js
export const name = 'add'
export const alias = ['invite', 'addmem']
export const category = 'Group'
export const desc = 'Add member to group using phone number'

export default async function add(sock, { msg, from, args, isAdmin, isBotAdmin, isGroup }, botSettings) {
  try {
    // 1. Check if command is used in group
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups 🐰'
      }, { quoted: msg })
    }

    // 2. Check if sender is admin
    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: '> Admin only command 🔒'
      }, { quoted: msg })
    }

    // 3. Check if bot is admin
    if (!isBotAdmin) {
      return await sock.sendMessage(from, {
        text: '> I need to be admin to add members 🍊'
      }, { quoted: msg })
    }

    // 4. Extract numbers from args or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const textInput = args.join(' ') || quotedText

    if (!textInput) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}add 2557xxxxxxx\n> Multiple: ${botSettings.prefix}add 2557xxx 2556xxx\n> Reply number with ${botSettings.prefix}add`
      }, { quoted: msg })
    }

    // 5. React first - BUNNY STYLE 🍊🍊
    await sock.sendMessage(from, {
      react: { text: '🍊', key: msg.key }
    })

    // 6. Extract all phone numbers from text
    const numberRegex = /(\+?\d{10,15})/g
    const numbers = textInput.match(numberRegex)

    if (!numbers || !numbers.length) {
      return await sock.sendMessage(from, {
        text: '> No valid phone numbers found\n> Example: 255712345678'
      }, { quoted: msg })
    }

    // 7. Format numbers to WhatsApp JID
    const participants = numbers.map(num => {
      let cleanNum = num.replace(/\D/g, '') // Remove non-digits
      if (cleanNum.startsWith('0')) cleanNum = '255' + cleanNum.slice(1) // TZ format
      if (!cleanNum.startsWith('255') && cleanNum.length === 9) cleanNum = '255' + cleanNum
      return cleanNum + '@s.whatsapp.net'
    })

    // 8. Remove duplicates
    const uniqueParticipants = [...new Set(participants)]

    if (uniqueParticipants.length > 5) {
      return await sock.sendMessage(from, {
        text: '> Max 5 numbers at once to avoid spam 🍊'
      }, { quoted: msg })
    }

    const processingMsg = await sock.sendMessage(from, {
      text: `> Adding ${uniqueParticipants.length} member${uniqueParticipants.length > 1 ? 's' : ''}...`
    }, { quoted: msg })

    // 9. Add participants - SILENT, NO SPAM
    const result = await sock.groupParticipantsUpdate(from, uniqueParticipants, 'add')

    // 10. Process results
    let added = []
    let failed = []
    let alreadyIn = []

    for (const res of result) {
      const number = res.jid.split('@')[0]
      if (res.status === 200) {
        added.push(number)
      } else if (res.status === 409) {
        alreadyIn.push(number)
      } else {
        failed.push(number)
      }
    }

    // 11. Build report message - CLEAN, NO TECH TALK
    let report = `╭─⌈ 🍊 *ADD RESULT* ⌋\n`
    
    if (added.length) {
      report += `│ ✅ Added: ${added.length}\n`
      added.forEach(n => report += `│   • ${n}\n`)
    }
    
    if (alreadyIn.length) {
      report += `│ ⚠️ Already in group: ${alreadyIn.length}\n`
      alreadyIn.forEach(n => report += `│   • ${n}\n`)
    }
    
    if (failed.length) {
      report += `│ ❌ Failed: ${failed.length}\n`
      failed.forEach(n => report += `│   • ${n}\n`)
      report += `│ *Reason: Number privacy or not on WhatsApp*\n`
    }
    
    report += `╰⊷ Done 🐰`

    // 12. Delete processing message and send report
    await sock.sendMessage(from, { delete: processingMsg.key }).catch(() => {})
    await sock.sendMessage(from, { text: report }, { quoted: msg })

    // 13. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[ADD ERROR]', error.message)

    let errorMsg = '> Failed to add members'
    if (error.message.includes('forbidden')) {
      errorMsg = '> I don\'t have permission to add members'
    } else if (error.message.includes('not-authorized')) {
      errorMsg = '> Bot is not admin in this group'
    } else if (error.message.includes('temporarily-unavailable')) {
      errorMsg = '> WhatsApp blocked adds. Try again later'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}