// commands/profile/vstall.js
export const name = 'vstall'
export const alias = ['likall', 'loveall', 'allstatus']
export const category = 'Profile'
export const desc = 'Like ALL contacts statuses with random love emojis or custom emojis'

export default async function vstall(sock, { msg, from, body }, botSettings) {
  try {
    const botJid = sock.user?.id

    // 1. React start - 🧶
    await sock.sendMessage(from, {
      react: { text: '🧶', key: msg.key }
    })

    // 2. Parse command: PREFIXvstall EMOJIS only - NO NUMBER
    const commandText = body.trim()
    const cmdRegex = new RegExp(`^${botSettings.prefix}\\s*vstall\\s*([\\p{Emoji}\\p{Emoji_Presentation}\\p{Emoji_Modifier}\\p{Emoji_Component}\\p{Extended_Pictographic},\\s]*)$`, 'iu')
    const match = commandText.match(cmdRegex)

    // 3. Default love emojis - 30 kasoro 💚
    const defaultEmojis = [
      '❤️','🧡','💛','🤎','🖤','🤍','💙','💜','🩷','❣️',
      '💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫀',
      '💌','😍','🥰','😘','😻','🫶','💋','💐','🌹','🩵'
    ]

    let customEmojis = []

    if (match) {
      const emojiString = match[1]?.trim()
      if (emojiString) {
        customEmojis = emojiString
      .split(/[,\s]+/)
      .map(e => e.trim())
      .filter(e => /[\p{Emoji}]/u.test(e))
      }
    }

    const emojiPool = customEmojis.length > 0? customEmojis : defaultEmojis

    // 4. FETCH ALL CONTACTS WITH ACTIVE STATUS - RAM FRIENDLY
    const allStatuses = await sock.fetchStatusUpdates()

    if (!allStatuses || allStatuses.length === 0) {
      throw new Error('NO_STATUS')
    }

    // 5. Group by user - last 24hrs only, low RAM
    const now = Math.floor(Date.now() / 1000)
    const statusByUser = new Map()

    for (const status of allStatuses) {
      if (now - status.messageTimestamp > 86400) continue

      const userJid = status.participant || status.key.participant
      if (!userJid || userJid === botJid) continue

      if (!statusByUser.has(userJid)) {
        statusByUser.set(userJid, [])
      }
      statusByUser.get(userJid).push(status.key)
    }

    if (statusByUser.size === 0) {
      throw new Error('NO_STATUS')
    }

    // 6. Process users one by one - LOW RAM
    let totalUsers = statusByUser.size
    let totalLiked = 0
    let totalFailed = 0
    let usedEmojis = new Set()
    let processedUsers = 0

    for (const [userJid, statusKeys] of statusByUser) {
      try {
        // View all first
        await sock.readMessages(statusKeys.map(key => ({ key })))

        // Like each status with random emoji
        for (const key of statusKeys) {
          const randomEmoji = emojiPool[Math.floor(Math.random() * emojiPool.length)]
          usedEmojis.add(randomEmoji)

          try {
            await sock.sendMessage('status@broadcast', {
              react: {
                text: randomEmoji,
                key: key
              }
            })
            totalLiked++

            // Random delay 1.8-3.8s - WhatsApp asishtuke
            await new Promise(r => setTimeout(r, 1800 + Math.random() * 2000))
          } catch {
            totalFailed++
          }
        }

        processedUsers++

        // Delay between users 2.5-4.5s - safe kwa RAM na WhatsApp
        if (processedUsers < totalUsers) {
          await new Promise(r => setTimeout(r, 2500 + Math.random() * 2000))
        }

      } catch {
        continue // Skip user on error, endelea na wengine
      }

      // Clear memory kila users 10
      if (processedUsers % 10 === 0 && global.gc) {
        global.gc()
      }
    }

    // 7. Send confirm message - SAME AREA
    const confirmMsg = `╭─⌈ 🧶 *VSTALL COMPLETE* ⌋
│ Mode: ALL CONTACTS
│ Users: ${processedUsers}/${totalUsers}
│ Status Liked: ${totalLiked}
│ Failed: ${totalFailed}
│ Emojis: ${[...usedEmojis].slice(0, 15).join(' ')}
│ Type: ${customEmojis.length > 0? 'Custom' : 'Random love 30'}
╰⊷ *Powered by Bunny Tech*`

    await sock.sendMessage(from, { text: confirmMsg }, { quoted: msg })

    // 8. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[VSTALL ERROR]', error.message)

    let errorMsg = '> Failed to process vstall'
    if (error.message === 'NO_STATUS') {
      errorMsg = '> No active status found from your contacts'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}