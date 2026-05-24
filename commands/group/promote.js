// commands/group/promote.js
export const name = 'promote'
export const alias = ['admin', 'up', 'p']
export const category = 'Group'
export const desc = 'Promote members to admin - multiple ways'

export default async function promote(sock, { msg, from, args, isAdmin, isBotAdmin, isGroup }, botSettings) {
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
        text: '> I need to be admin to promote members 🍊'
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

    // 5. WAY 1: MENU -.promote help/menu
    if (args[0]?.toLowerCase() === 'help' || args[0]?.toLowerCase() === 'menu') {
      const menuText = `╭─⌈ 🍊 *PROMOTE MENU* ⌋
│
│ *4 Ways to promote:*
│
│ 1️⃣ *BY MENTION*
│ ${botSettings.prefix}promote @user
│ ${botSettings.prefix}promote @john @mary
│
│ 2️⃣ *BY REPLY*
│ Reply to a message + ${botSettings.prefix}promote
│
│ 3️⃣ *BY NUMBER*
│ ${botSettings.prefix}promote 255712345678
│ ${botSettings.prefix}promote 0712345678 0755432198
│
│ 4️⃣ *PROMOTE ALL* ⚠️
│ ${botSettings.prefix}promote all
│ *Promotes all members to admin*
│
│ *Rules:*
│ • You cannot promote yourself
│ • Cannot promote existing admin
│ • Bot must be admin
│ • Max 10 at once
│
╰⊷ BUNNY MD 🐰`

      return await sock.sendMessage(from, { text: menuText }, { quoted: msg })
    }

    // 6. WAY 2: PROMOTE ALL -.promote all
    if (args[0]?.toLowerCase() === 'all') {
      targets = groupMetadata.participants
     .filter(p =>!p.admin && p.id!== botJid && p.id!== senderJid)
     .map(p => p.id)

      if (!targets.length) {
        return await sock.sendMessage(from, {
          text: '> Everyone is already admin or no members to promote 🍊'
        }, { quoted: msg })
      }

      const confirmMsg = await sock.sendMessage(from, {
        text: `> Promoting ${targets.length} members to admin...\n> This is dangerous ⚠️`
      }, { quoted: msg })

      // Promote in batches of 5
      for (let i = 0; i < targets.length; i += 5) {
        const batch = targets.slice(i, i + 5)
        await sock.groupParticipantsUpdate(from, batch, 'promote').catch(() => {})
        await new Promise(r => setTimeout(r, 1500))
      }

      await sock.sendMessage(from, { delete: confirmMsg.key }).catch(() => {})
      await sock.sendMessage(from, {
        text: `> Promoted ${targets.length} members\n> Group now has ${groupAdmins.length + targets.length} admins 🐰`
      }, { quoted: msg })
      return await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    }

    // 7. WAY 3: REPLY MESSAGE
    if (quotedParticipant) {
      if (quotedParticipant === senderJid) {
        return await sock.sendMessage(from, {
          text: '> You cannot promote yourself 🍊'
        }, { quoted: msg })
      }
      if (groupAdmins.includes(quotedParticipant)) {
        return await sock.sendMessage(from, {
          text: '> User is already an admin 🍊'
        }, { quoted: msg })
      }
      if (quotedParticipant === botJid) {
        return await sock.sendMessage(from, {
          text: '> I am already admin 🍊'
        }, { quoted: msg })
      }
      targets.push(quotedParticipant)
    }

    // 8. WAY 4: MENTION
    else if (mentionedJid.length > 0) {
      for (const jid of mentionedJid) {
        if (jid === senderJid) continue
        if (groupAdmins.includes(jid)) continue
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
          if (groupAdmins.includes(jid)) continue
          if (jid === botJid) continue

          // Check if user is in group
          const isInGroup = groupMetadata.participants.some(p => p.id === jid)
          if (isInGroup) targets.push(jid)
        }
      }
    }

    // 10. Remove duplicates
    targets = [...new Set(targets)]

    if (!targets.length) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}promote @user\n> Reply: ${botSettings.prefix}promote\n> Number: ${botSettings.prefix}promote 2557xxx\n> Menu: ${botSettings.prefix}promote help\n> All: ${botSettings.prefix}promote all`
      }, { quoted: msg })
    }

    if (targets.length > 10) {
      return await sock.sendMessage(from, {
        text: '> Max 10 users at once to avoid spam 🍊'
      }, { quoted: msg })
    }

    // 11. Execute promote
    const processingMsg = await sock.sendMessage(from, {
      text: `> Promoting ${targets.length} member${targets.length > 1? 's' : ''}...`
    }, { quoted: msg })

    const result = await sock.groupParticipantsUpdate(from, targets, 'promote')

    // 12. Process results
    let promoted = []
    let failed = []

    for (const res of result) {
      const number = res.jid.split('@')[0]
      if (res.status === 200) {
        promoted.push(number)
      } else {
        failed.push(number)
      }
    }

    // 13. Build report
    let report = `╭─⌈ 🍊 *PROMOTE RESULT* ⌋\n`

    if (promoted.length) {
      report += `│ ✅ Promoted: ${promoted.length}\n`
      promoted.forEach(n => report += `│ • ${n}\n`)
    }

    if (failed.length) {
      report += `│ ❌ Failed: ${failed.length}\n`
      failed.forEach(n => report += `│ • ${n}\n`)
      report += `│ *Reason: Already admin or not in group*\n`
    }

    report += `╰⊷ Done 🐰`

    await sock.sendMessage(from, { delete: processingMsg.key }).catch(() => {})
    await sock.sendMessage(from, { text: report }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PROMOTE ERROR]', error.message)

    let errorMsg = '> Failed to promote members'
    if (error.message.includes('forbidden')) {
      errorMsg = '> I don\'t have permission to promote'
    } else if (error.message.includes('not-authorized')) {
      errorMsg = '> Bot is not admin in this group'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}