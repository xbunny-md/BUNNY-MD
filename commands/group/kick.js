// commands/group/kick.js
export const name = 'kick'
export const alias = ['remove', 'ban', 'out']
export const category = 'Group'
export const desc = 'Remove members from group - supports all ways'

export default async function kick(sock, { msg, from, args, isAdmin, isBotAdmin, isGroup, participants }, botSettings) {
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
        text: '> I need to be admin to kick members 🍊'
      }, { quoted: msg })
    }

    // 4. React first - BUNNY STYLE 🍊
    await sock.sendMessage(from, {
      react: { text: '🍊', key: msg.key }
    })

    const groupMetadata = await sock.groupMetadata(from)
    const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id)
    
    // FIX 1: Bot JID detection - support LID format
    const botJid = sock.user.id
    const botLid = sock.user.lid || botJid
    const senderJid = msg.key.participant || msg.key.remoteJid

    let targets = []
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant

    // 5. WAY 1: KICK ALL -.kick all
    if (args[0]?.toLowerCase() === 'all') {
      targets = groupMetadata.participants
      .filter(p =>!groupAdmins.includes(p.id) && p.id!== botJid && p.id!== botLid)
      .map(p => p.id)

      if (!targets.length) {
        return await sock.sendMessage(from, {
          text: '> No members to kick. Only admins remain 🍊'
        }, { quoted: msg })
      }

      const confirmMsg = await sock.sendMessage(from, {
        text: `> Kicking ${targets.length} members...\n> Admins are safe ✅`
      }, { quoted: msg })

      await sock.sendPresenceUpdate('paused', from) // Avoid rate limit
      
      // Kick in batches of 5 to avoid rate limit
      for (let i = 0; i < targets.length; i += 5) {
        const batch = targets.slice(i, i + 5)
        await sock.groupParticipantsUpdate(from, batch, 'remove').catch(() => {})
        await new Promise(r => setTimeout(r, 1500)) // 1.5s delay between batches
      }

      await sock.sendMessage(from, { delete: confirmMsg.key }).catch(() => {})
      await sock.sendMessage(from, {
        text: `> Removed ${targets.length} members\n> Group cleaned 🐰`
      }, { quoted: msg })
      return await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    }

    // 6. WAY 2: REPLY MESSAGE -.kick
    if (quotedParticipant) {
      if (quotedParticipant === senderJid) {
        return await sock.sendMessage(from, {
          text: '> You cannot kick yourself 🍊'
        }, { quoted: msg })
      }
      if (groupAdmins.includes(quotedParticipant)) {
        return await sock.sendMessage(from, {
          text: '> Cannot kick an admin 🍊'
        }, { quoted: msg })
      }
      if (quotedParticipant === botJid || quotedParticipant === botLid) {
        return await sock.sendMessage(from, {
          text: '> I cannot kick myself 🍊'
        }, { quoted: msg })
      }
      targets.push(quotedParticipant)
    }

    // 7. WAY 3: MENTION -.kick @user @user2
    else if (mentionedJid.length > 0) {
      for (const jid of mentionedJid) {
        if (jid === senderJid) continue
        if (groupAdmins.includes(jid)) continue
        if (jid === botJid || jid === botLid) continue
        targets.push(jid)
      }
    }

    // 8. WAY 4: NUMBERS -.kick 2557xxx 0712345678
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
          if (jid === botJid || jid === botLid) continue

          // Check if user is actually in group
          const isInGroup = groupMetadata.participants.some(p => p.id === jid)
          if (isInGroup) targets.push(jid)
        }
      }
    }

    // 9. Remove duplicates + final filter
    targets = [...new Set(targets)]
    // FIX 2: Filter only users still in group
    const currentParticipants = groupMetadata.participants.map(p => p.id)
    targets = targets.filter(jid => currentParticipants.includes(jid))

    if (!targets.length) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}kick @user\n> Reply message: ${botSettings.prefix}kick\n> Number: ${botSettings.prefix}kick 2557xxx\n> All: ${botSettings.prefix}kick all`
      }, { quoted: msg })
    }

    if (targets.length > 10) {
      return await sock.sendMessage(from, {
        text: '> Max 10 users at once to avoid spam 🍊'
      }, { quoted: msg })
    }

    // 10. Execute kick
    const processingMsg = await sock.sendMessage(from, {
      text: `> Removing ${targets.length} member${targets.length > 1? 's' : ''}...`
    }, { quoted: msg })

    const result = await sock.groupParticipantsUpdate(from, targets, 'remove')

    // 11. Process results - FIX 3: Accept 409 as success
    let removed = []
    let failed = []

    for (const res of result) {
      const number = res.jid.split('@')[0]
      // 200 = success, 409 = conflict (already removed) = also success
      if (res.status === 200 || res.status === 409) {
        removed.push(number)
      } else if (res.status === 403) {
        failed.push(`${number} - Not admin`)
      } else if (res.status === 404) {
        failed.push(`${number} - Not in group`)
      } else {
        failed.push(`${number} - Error ${res.status}`)
      }
    }

    // 12. Build report - CLEAN
    let report = `╭─⌈ 🍊 *KICK RESULT* ⌋\n`

    if (removed.length) {
      report += `│ ✅ Removed: ${removed.length}\n`
      removed.forEach(n => report += `│ • ${n}\n`)
    }

    if (failed.length) {
      report += `│ ❌ Failed: ${failed.length}\n`
      failed.forEach(n => report += `│ • ${n}\n`)
    }

    report += `╰⊷ Done 🐰`

    await sock.sendMessage(from, { delete: processingMsg.key }).catch(() => {})
    await sock.sendMessage(from, { text: report }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[KICK ERROR]', error.message)

    let errorMsg = '> Failed to kick members'
    if (error.message.includes('forbidden')) {
      errorMsg = '> I don\'t have permission to remove members'
    } else if (error.message.includes('not-authorized')) {
      errorMsg = '> Bot is not admin in this group'
    } else if (error.message.includes('bad-request')) {
      errorMsg = '> User not found in group'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}