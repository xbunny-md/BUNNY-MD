// commands/profile/viewstatus.js
export const name = 'viewstatus'
export const alias = ['vst', 'statusview', 'likestatus', 'vs']
export const category = 'Profile'
export const desc = 'View/like status - supports all, specific index, multiple emojis, bulk view'

export default async function viewstatus(sock, { msg, from, body }, botSettings) {
  const prefix = botSettings.prefix
  const botJid = sock.user?.id

  try {
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo
    const quoted = contextInfo?.quotedMessage
    const quotedParticipant = contextInfo?.participant

    // 1. PARSE COMMAND - BRUTE FORCE REGEX
    const commandText = body.trim()
    // Match:.vst 😂 255712345678 all 2
    const cmdRegex = new RegExp(
      `^${prefix}\\s*vst\\s*([\\p{Emoji}\\p{Emoji_Presentation}\\p{Emoji_Modifier}\\p{Emoji_Component}\\p{Extended_Pictographic}\\s]*)\\s*(\\d+)?\\s*(all)?\\s*(\\d+)?$`,
      'iu'
    )
    const match = commandText.match(cmdRegex)

    let likeEmoji = null
    let targetNumber = null
    let likeAll = false
    let specificIndex = null

    if (match) {
      likeEmoji = match[1]?.trim() || null
      targetNumber = match[2]? `${match[2]}@s.whatsapp.net` : null
      likeAll = match[3]?.toLowerCase() === 'all'
      specificIndex = match[4]? parseInt(match[4]) : null
    }

    // 2. REACT START
    await sock.sendMessage(from, {
      react: { text: '🙈', key: msg.key }
    }).catch(() => {})

    let targetStatuses = []
    let targetUser = null

    // 3. CASE 1: REPLYING DIRECTLY TO STATUS - BRUTE FORCE
    if (quoted && contextInfo?.remoteJid === 'status@broadcast') {
      try {
        targetStatuses = [{
          key: {
            remoteJid: 'status@broadcast',
            id: contextInfo.stanzaId,
            participant: quotedParticipant
          }
        }]
        targetUser = quotedParticipant
      } catch {}
    }
    // 4. CASE 2: NUMBER PROVIDED
    else if (targetNumber) {
      targetUser = targetNumber
    }
    // 5. CASE 3: REPLYING TO USER MESSAGE
    else if (quotedParticipant && quotedParticipant!== botJid) {
      targetUser = quotedParticipant
    } else {
      throw new Error('NOT_VALID_TARGET')
    }

    // 6. FETCH STATUS - BRUTE FORCE WITH RETRY
    if (targetStatuses.length === 0 && targetUser) {
      let statusMessages = []
      try {
        // BAILEYS 6.7.18 METHOD
        statusMessages = await sock.fetchStatus(targetUser)
      } catch (e) {
        console.log('FetchStatus failed, trying alternative...')
        throw new Error('NO_STATUS')
      }

      if (!statusMessages || statusMessages.length === 0) {
        throw new Error('NO_STATUS')
      }

      // SORT BY TIMESTAMP - NEWEST FIRST
      statusMessages.sort((a, b) => b.messageTimestamp - a.messageTimestamp)

      const now = Math.floor(Date.now() / 1000)
      // Filter only last 24hrs
      const validStatuses = statusMessages.filter(s => now - s.messageTimestamp < 86400)

      if (validStatuses.length === 0) {
        throw new Error('NO_ACTIVE_STATUS')
      }

      if (likeAll) {
        // GET ALL STATUSES
        targetStatuses = validStatuses.map(s => ({ key: s.key }))
      } else if (specificIndex && specificIndex > 0 && specificIndex <= validStatuses.length) {
        // GET SPECIFIC INDEX - NEW FEATURE
        targetStatuses = [{ key: validStatuses[specificIndex - 1].key }]
      } else {
        // GET LATEST ONLY
        targetStatuses = [{ key: validStatuses[0].key }]
      }
    }

    if (targetStatuses.length === 0) {
      throw new Error('NO_STATUS')
    }

    // 7. VIEW ALL TARGET STATUSES - BRUTE FORCE
    try {
      await sock.readMessages(targetStatuses.map(s => s.key))
    } catch (e) {
      console.log('Read failed but continuing...')
    }

    // 8. LIKE STATUSES - BRUTE FORCE WITH RETRY
    let likedCount = 0
    let failedCount = 0

    if (likeEmoji) {
      for (let i = 0; i < targetStatuses.length; i++) {
        const status = targetStatuses[i]
        let retries = 3

        while (retries > 0) {
          try {
            await sock.sendMessage('status@broadcast', {
              react: {
                text: likeEmoji,
                key: status.key
              }
            })
            likedCount++
            break
          } catch (e) {
            retries--
            if (retries === 0) failedCount++
            await new Promise(r => setTimeout(r, 1000))
          }
        }

        // Delay between likes
        if (i < targetStatuses.length - 1) {
          await new Promise(r => setTimeout(r, 800))
        }
      }
    }

    // 9. GET TARGET NAME - BRUTE FORCE
    let targetName = targetUser.split('@')[0]
    try {
      const name = await sock.getName(targetUser)
      if (name && name!== targetName) targetName = name
    } catch {}

    // 10. GET STATUS INFO FOR REPORT - NEW FEATURE
    let statusInfo = ''
    if (targetStatuses.length === 1) {
      try {
        const status = await sock.fetchStatus(targetUser)
        const currentStatus = status[0]
        const timeAgo = Math.floor((Date.now() / 1000 - currentStatus.messageTimestamp) / 60)
        const timeText = timeAgo < 60? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`
        statusInfo = `\n│ Time: ${timeText}`
      } catch {}
    }

    // 11. SEND CONFIRMATION TO BOT DM - BRUTE FORCE
    if (botJid) {
      const confirmMsg = likeEmoji
       ? `╭─⌈ 👍 *STATUS LIKED* ⌋
│ User: ${targetName}
│ Number: +${targetUser.split('@')[0]}
│ Emoji: ${likeEmoji}
│ Success: ${likedCount}/${targetStatuses.length}
│ Failed: ${failedCount}${statusInfo}
│ Mode: ${likeAll? 'All statuses' : specificIndex? `Status #${specificIndex}` : 'Latest status'}
╰⊷ *Powered by Bunny Tech*`
        : `╭─⌈ 👀 *STATUS VIEWED* ⌋
│ User: ${targetName}
│ Number: +${targetUser.split('@')[0]}
│ Viewed: ${targetStatuses.length}${statusInfo}
│ Mode: ${likeAll? 'All statuses' : specificIndex? `Status #${specificIndex}` : 'Latest status'}
╰⊷ *Powered by Bunny Tech*`

      await sock.sendMessage(botJid, { text: confirmMsg }).catch(() => {})
    }

    // 12. REACT DONE
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {})

  } catch (error) {
    console.error('[VIEWSTATUS ERROR]', error.message)

    // BRUTE FORCE ERROR HANDLING
    let errorEmoji = '❌'
    if (error.message === 'NO_STATUS') errorEmoji = '📭'
    else if (error.message === 'NOT_VALID_TARGET') errorEmoji = '⚠️'
    else if (error.message === 'NO_ACTIVE_STATUS') errorEmoji = '⏰'

    // REACT FAIL - NO MESSAGE AS REQUESTED
    await sock.sendMessage(from, { react: { text: errorEmoji, key: msg.key } }).catch(() => {})
  }
}