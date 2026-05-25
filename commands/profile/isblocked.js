// commands/info/ppblock.js
export const name = 'ppblock'
export const alias = ['isblocked', 'didblockme', 'blockcheck', 'checkblock']
export const category = 'Info'
export const desc = 'Checks block status - supports multiple users, privacy check, last seen check'

export default async function ppblock(sock, { msg, from, args }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. REACT FIRST
    await sock.sendMessage(from, {
      react: { text: '🚫', key: msg.key }
    })

    // 2. EXTRACT ALL TARGETS - MULTIPLE SUPPORT
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    const mentioned = quoted?.mentionedJid || []
    const replied = quoted?.participant
    const textNumbers = args.filter(a => /^[0-9+]+$/.test(a))

    let targets = []

    // Way 1: Multiple mentioned users
    if (mentioned.length > 0) {
      targets.push(...mentioned)
    }
    // Way 2: Replied user
    else if (replied) {
      targets.push(replied)
    }
    // Way 3: Multiple numbers in args
    else if (textNumbers.length > 0) {
      for (const num of textNumbers) {
        const cleanNum = num.replace(/[^0-9]/g, '')
        if (cleanNum.length >= 7 && cleanNum.length <= 15) {
          targets.push(cleanNum + '@s.whatsapp.net')
        }
      }
    }
    // Way 4: Error - must specify
    else {
      throw new Error('NO_TARGET')
    }

    if (targets.length === 0) throw new Error('NO_TARGET')

    // 3. LIMIT TO 5 TARGETS
    if (targets.length > 5) {
      await sock.sendMessage(from, {
        text: `╭─⌈ ⚠️ *Limit Reached* ⌋
│ Max 5 users at once
│ Checking first 5 only
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
      targets = targets.slice(0, 5)
    }

    // 4. GET YOUR BLOCKLIST ONCE
    const blocklist = await sock.fetchBlocklist()
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'

    // 5. CHECK EACH TARGET
    let results = []
    for (let i = 0; i < targets.length; i++) {
      const targetJid = targets[i]

      try {
        // Check if number exists and get correct JID
        const [result] = await sock.onWhatsApp(targetJid)
        if (!result?.exists) {
          results.push({
            number: targetJid.split('@')[0],
            status: 'NOT_REGISTERED',
            emoji: '❌'
          })
          continue
        }

        const correctJid = result.jid
        const targetNumber = correctJid.split('@')[0]

        // Check if YOU blocked them
        const youBlockedThem = blocklist.includes(correctJid)

        // Check if THEY blocked you - try fetch PP
        let theyBlockedYou = false
        let ppStatus = 'UNKNOWN'
        try {
          await sock.profilePictureUrl(correctJid, 'preview')
          ppStatus = 'VISIBLE'
        } catch (error) {
          if (error.output?.statusCode === 401) {
            theyBlockedYou = true
            ppStatus = 'BLOCKED'
          } else if (error.output?.statusCode === 404) {
            ppStatus = 'NO_PICTURE'
          } else if (error.output?.statusCode === 403) {
            ppStatus = 'PRIVATE'
          }
        }

        // Check last seen privacy - NEW FEATURE
        let lastSeenStatus = 'UNKNOWN'
        try {
          const status = await sock.fetchStatus(correctJid)
          lastSeenStatus = status?.status? 'VISIBLE' : 'HIDDEN'
        } catch {
          lastSeenStatus = 'HIDDEN'
        }

        // Check if in contacts - NEW FEATURE
        const isContact = sock.contacts?.[correctJid]? true : false

        // Build status
        let blockStatus = ''
        let emoji = '✅'

        if (youBlockedThem && theyBlockedYou) {
          blockStatus = 'MUTUAL_BLOCK'
          emoji = '🚫'
        } else if (youBlockedThem) {
          blockStatus = 'YOU_BLOCKED'
          emoji = '🔒'
        } else if (theyBlockedYou) {
          blockStatus = 'THEY_BLOCKED'
          emoji = '🔴'
        } else {
          blockStatus = 'NOT_BLOCKED'
          emoji = '✅'
        }

        results.push({
          number: targetNumber,
          jid: correctJid,
          status: blockStatus,
          youBlocked: youBlockedThem,
          theyBlocked: theyBlockedYou,
          ppStatus: ppStatus,
          lastSeen: lastSeenStatus,
          isContact: isContact,
          emoji: emoji
        })

      } catch (err) {
        results.push({
          number: targetJid.split('@')[0],
          status: 'ERROR',
          emoji: '❌'
        })
        continue
      }
    }

    // 6. BUILD RESPONSE
    let responseText = `╭─⌈ 🚫 *BLOCK CHECK RESULTS* ⌋\n`

    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      responseText += `│\n│ ${r.emoji} *User ${i + 1}:* +${r.number}\n`

      if (r.status === 'NOT_REGISTERED') {
        responseText += `│ Status: Not on WhatsApp\n`
      } else if (r.status === 'ERROR') {
        responseText += `│ Status: Check Failed\n`
      } else {
        responseText += `│ Status: ${r.status.replace(/_/g, ' ')}\n`
        responseText += `│ You Blocked: ${r.youBlocked? 'Yes' : 'No'}\n`
        responseText += `│ They Blocked: ${r.theyBlocked? 'Yes' : 'No'}\n`
        responseText += `│ Profile Pic: ${r.ppStatus}\n`
        responseText += `│ Last Seen: ${r.lastSeen}\n`
        responseText += `│ In Contacts: ${r.isContact? 'Yes' : 'No'}\n`
      }
    }

    responseText += `╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, {
      text: responseText
    }, { quoted: msg })

    // 7. REACT DONE
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PPBLOCK ERROR]', error.message)

    let errorMsg = 'Failed to check block status'

    if (error.message === 'INVALID_NUMBER') {
      errorMsg = `╭─⌈ ❌ *Invalid Number* ⌋
│ Use: countrycode + number
│ Example: 14155552671
╰⊷ *Powered By Bunny Tech*`
    } else if (error.message === 'NO_TARGET') {
      errorMsg = `╭─⌈ ❌ *No Target* ⌋
│ Tag user, reply, or provide number
│ Example: ${prefix}ppblock @user
│ Example: ${prefix}ppblock 255xxx
╰⊷ *Powered By Bunny Tech*`
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}