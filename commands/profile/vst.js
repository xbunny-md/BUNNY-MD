// commands/profile/viewstatus.js
export const name = 'viewstatus'
export const alias = ['vst', 'statusview', 'likestatus']
export const category = 'Profile'
export const desc = 'View/like status. Format: PREFIXvst 😂 255712345678 all'

export default async function viewstatus(sock, { msg, from, body }, botSettings) {
  try {
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo
    const quoted = contextInfo?.quotedMessage
    const quotedParticipant = contextInfo?.participant
    const botJid = sock.user?.id

    // 1. Parse command: PREFIXvst EMOJI NUMBER all
    const commandText = body.trim()
    const cmdRegex = new RegExp(`^${botSettings.prefix}\\s*vst\\s*([\\p{Emoji}\\p{Emoji_Presentation}\\p{Emoji_Modifier}\\p{Emoji_Component}\\p{Extended_Pictographic}]*)\\s*(\\d+)?\\s*(all)?$`, 'iu')
    const match = commandText.match(cmdRegex)

    let likeEmoji = null
    let targetNumber = null
    let likeAll = false

    if (match) {
      likeEmoji = match[1]?.trim() || null
      targetNumber = match[2]? `${match[2]}@s.whatsapp.net` : null
      likeAll = match[3]?.toLowerCase() === 'all'
    }

    // 2. React start - 🙈
    await sock.sendMessage(from, {
      react: { text: '🙈', key: msg.key }
    })

    let targetStatuses = []
    let targetUser = null

    // 3. CASE 1: Replying directly to a status
    if (quoted && contextInfo?.remoteJid === 'status@broadcast') {
      targetStatuses = [{
        key: {
          remoteJid: 'status@broadcast',
          id: contextInfo.stanzaId,
          participant: quotedParticipant
        }
      }]
      targetUser = quotedParticipant
    }
    // 4. CASE 2: Number provided in command
    else if (targetNumber) {
      targetUser = targetNumber
    }
    // 5. CASE 3: Replying to user's message
    else if (quotedParticipant && quotedParticipant!== botJid) {
      targetUser = quotedParticipant
    } else {
      throw new Error('NOT_VALID_TARGET')
    }

    // 6. Fetch status if not direct reply
    if (targetStatuses.length === 0 && targetUser) {
      try {
        const statusMessages = await sock.fetchStatus(targetUser)

        if (!statusMessages || statusMessages.length === 0) {
          throw new Error('NO_STATUS')
        }

        // Sort by timestamp - newest first
        statusMessages.sort((a, b) => b.messageTimestamp - a.messageTimestamp)

        if (likeAll) {
          // Get all current statuses - max 24hrs old
          const now = Math.floor(Date.now() / 1000)
          targetStatuses = statusMessages
          .filter(s => now - s.messageTimestamp < 86400)
          .map(s => ({ key: s.key }))
        } else {
          // Get only latest status
          targetStatuses = [{ key: statusMessages[0].key }]
        }
      } catch (e) {
        throw new Error('NO_STATUS')
      }
    }

    if (targetStatuses.length === 0) {
      throw new Error('NO_STATUS')
    }

    // 7. View all target statuses secretly
    await sock.readMessages(targetStatuses.map(s => s.key))

    // 8. Like statuses if emoji provided
    let likedCount = 0
    if (likeEmoji) {
      for (const status of targetStatuses) {
        try {
          await sock.sendMessage('status@broadcast', {
            react: {
              text: likeEmoji,
              key: status.key
            }
          })
          likedCount++
          await new Promise(r => setTimeout(r, 500))
        } catch {}
      }
    }

    // 9. Get target name
    let targetName = targetUser.split('@')[0]
    try {
      const name = await sock.getName(targetUser)
      if (name && name!== targetName) targetName = name
    } catch {}

    // 10. Send confirmation to BOT DM - CLEAN
    if (botJid) {
      const confirmMsg = likeEmoji
       ? `╭─⌈ 👍 *STATUS LIKED* ⌋
│ User: ${targetName}
│ Number: +${targetUser.split('@')[0]}
│ Emoji: ${likeEmoji}
│ Liked: ${likedCount}/${targetStatuses.length}
│ Mode: ${likeAll? 'All statuses' : 'Latest status'}
╰⊷ *Powered by Bunny Tech*`
        : `╭─⌈ 👀 *STATUS VIEWED* ⌋
│ User: ${targetName}
│ Number: +${targetUser.split('@')[0]}
│ Viewed: ${targetStatuses.length}
│ Mode: ${likeAll? 'All statuses' : 'Latest status'}
╰⊷ *Powered by Bunny Tech*`

      await sock.sendMessage(botJid, { text: confirmMsg })
    }

    // 11. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[VIEWSTATUS ERROR]', error.message)

    // React fail ❌ - NO MESSAGE
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}