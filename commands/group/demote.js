// commands/group/demote.js
export const name = 'demote'
export const alias = ['unadmin', 'down', 'd']
export const category = 'Group'
export const desc = 'Demote admins to member - multiple ways'

export default async function demote(sock, { msg, from, args, isAdmin, isBotAdmin, isGroup }, botSettings) {
  try {
    // 1. Group check
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups 🐰'
      }, { quoted: msg })
    }

    // 2. Admin check
    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: '> Admin only command 🔒'
      }, { quoted: msg })
    }

    // 3. Bot admin check
    if (!isBotAdmin) {
      return await sock.sendMessage(from, {
        text: '> I need to be admin to demote members 🍊'
      }, { quoted: msg })
    }

    // 4. React 🍊
    await sock.sendMessage(from, {
      react: { text: '🍊', key: msg.key }
    })

    const groupMetadata = await sock.groupMetadata(from)
    const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id)
    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net'
    const senderJid = msg.key.participant || msg.key.remoteJid

    let targets = []
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant

    // 5. WAY 1: MENU -.demote help/menu
    if (args[0]?.toLowerCase() === 'help' || args[0]?.toLowerCase() === 'menu') {
      const menuText = `╭─⌈ 🍊 *DEMOTE MENU* ⌋
│
│ *4 Ways to demote:*
│
│ 1️⃣ *BY MENTION*
│ ${botSettings.prefix}demote @admin
│ ${botSettings.prefix}demote @john @mary
│
│ 2️⃣ *BY REPLY*
│ Reply to an admin message + ${botSettings.prefix}demote
│
│ 3️⃣ *BY NUMBER*
│ ${botSettings.prefix}demote 255712345678
│ ${botSettings.prefix}demote 0712345678 0755432198
│
│ 4️⃣ *DEMOTE ALL* ⚠️
│ ${botSettings.prefix}demote all
│ *Demotes all admins except you and bot*
│
│ *Rules:*
│ • You cannot demote yourself
│ • Cannot demote the bot
│ • Bot must be admin
│ • Max 10 at once
│
╰⊷ BUNNY MD 🐰`

      return await sock.sendMessage(from, { text: menuText }, { quoted: msg })
    }

    // 6. WAY 2: DEMOTE ALL -.demote all
    if (args[0]?.toLowerCase() === 'all') {
      targets = groupAdmins.filter(id => id!== botJid && id!== senderJid)

      if (!targets.length) {
        return await sock.sendMessage(from, {
          text: '> No admins to demote. Only you and bot remain 🍊'
        }, { quoted: msg })
      }

      const confirmMsg = await sock.sendMessage(from, {
        text: `> Demoting ${targets.length} admins to member...\n> This is dangerous ⚠️`
      }, { quoted: msg })

      // Demote in batches of 5
      for (let i = 0; i < targets.length; i += 5) {
        const batch = targets.slice(i, i + 5)
        await sock.groupParticipantsUpdate(from, batch, 'demote').catch(() => {})
        await new Promise(r => setTimeout(r, 1500))
      }

      await sock.sendMessage(from, { delete: confirmMsg.key }).catch(() => {})
      await sock.sendMessage(from, {
        text: `> Demoted ${targets.length} admins\n> Only you and bot remain as admin 🐰`
      }, { quoted: msg })
      return await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    }

    // 7. WAY 3: REPLY MESSAGE
    if (quotedParticipant) {
      if (quotedParticipant === senderJid) {
        return await sock.sendMessage(from, {
          text: '> You cannot demote yourself 🍊'
        }, { quoted: msg })
      }
      if (!groupAdmins.includes(quotedParticipant)) {
        return await sock.sendMessage(from, {
          text: '> User is not an admin 🍊'
        }, { quoted: msg })
      }
      if (quotedParticipant === botJid) {
        return await sock.sendMessage(from, {
          text: '> I cannot demote myself 🍊'
        }, { quoted: msg })
      }
      targets.push(quotedParticipant)
    }

    // 8. WAY 4: MENTION
    else if (mentionedJid.length > 0) {
      for (const jid of mentionedJid) {
        if (jid === senderJid) continue
        if (!groupAdmins.includes(jid)) continue
        if (jid === botJid) continue
        targets.push(jid)
      }
    }

    // 9. WAY 5: NUMBERS
    else if (args.length > 0) {
      const numberRegex = /(\+?\d{10,15})/g
      const textInput = args.join(' ')
      const numbers = textInput.match(numberRegex)

      if (numbers && numbers.length) {
        for (const num of numbers) {
          let cleanNum = num.replace(/\D/g, '')
          if (cleanNum.startsWith('0')) cleanNum = '255' + cleanNum.slice(1)
          if (!cleanNum.startsWith('255') && cleanNum.length === 9) cleanNum = '255' + cleanNum
          const jid = cleanNum + '@s.whatsapp.net'

          if (jid === senderJid) continue
          if (!groupAdmins.includes(jid)) continue
          if (jid === botJid) continue
          targets.push(jid)
        }
      }
    }

    // 10. Remove duplicates
    targets = [...new Set(targets)]

    if (!targets.length) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}demote @admin\n> Reply: ${botSettings.prefix}demote\n> Number: ${botSettings.prefix}demote 2557xxx\n> Menu: ${botSettings.prefix}demote help\n> All: ${botSettings.prefix}demote all`
      }, { quoted: msg })
    }

    if (targets.length > 10) {
      return await sock.sendMessage(from, {
        text: '> Max 10 users at once to avoid spam 🍊'
      }, { quoted: msg })
    }

    // 11. Execute demote
    const processingMsg = await sock.sendMessage(from, {
      text: `> Demoting ${targets.length} admin${targets.length > 1? 's' : ''}...`
    }, { quoted: msg })

    const result = await sock.groupParticipantsUpdate(from, targets, 'demote')

    // 12. Process results
    let demoted = []
    let failed = []

    for (const res of result) {
      const number = res.jid.split('@')[0]
      if (res.status === 200) {
        demoted.push(number)
      } else {
        failed.push(number)
      }
    }

    // 13. Build report
    let report = `╭─⌈ 🍊 *DEMOTE RESULT* ⌋\n`

    if (demoted.length) {
      report += `│ ✅ Demoted: ${demoted.length}\n`
      demoted.forEach(n => report += `│ • ${n}\n`)
    }

    if (failed.length) {
      report += `│ ❌ Failed: ${failed.length}\n`
      failed.forEach(n => report += `│ • ${n}\n`)
      report += `│ *Reason: Not admin or not in group*\n`
    }

    report += `╰⊷ Done 🐰`

    await sock.sendMessage(from, { delete: processingMsg.key }).catch(() => {})
    await sock.sendMessage(from, { text: report }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[DEMOTE ERROR]', error.message)

    let errorMsg = '> Failed to demote admins'
    if (error.message.includes('forbidden')) {
      errorMsg = '> I don\'t have permission to demote'
    } else if (error.message.includes('not-authorized')) {
      errorMsg = '> Bot is not admin in this group'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}