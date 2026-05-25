// commands/profile/vstall.js
export const name = 'vstall'
export const alias = ['likall', 'loveall', 'allstatus', 'vsall']
export const category = 'Profile'
export const desc = 'Like ALL contacts statuses with random love emojis or custom emojis'

export default async function vstall(sock, { msg, from, body }, botSettings) {
  const prefix = botSettings.prefix
  const botJid = sock.user?.id

  try {
    // 1. REACT START
    await sock.sendMessage(from, {
      react: { text: '🧶', key: msg.key }
    }).catch(() => {})

    // 2. PARSE COMMAND - BRUTE FORCE REGEX
    const commandText = body.trim()
    const cmdRegex = new RegExp(
      `^${prefix}\\s*vstall\\s*([\\p{Emoji}\\p{Emoji_Presentation}\\p{Emoji_Modifier}\\p{Emoji_Component}\\p{Extended_Pictographic},\\s]*)$`,
      'iu'
    )
    const match = commandText.match(cmdRegex)

    // 3. DEFAULT LOVE EMOJIS - 30 kasoro 💚
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

    // 4. GET ALL CONTACTS - BAILEYS 6.7.18 METHOD
    const contacts = Object.keys(sock.contacts || {})

    if (contacts.length === 0) {
      throw new Error('NO_CONTACTS')
    }

    // 5. FETCH STATUS FOR EACH CONTACT - BRUTE FORCE WITH RETRY
    const statusByUser = new Map()
    const now = Math.floor(Date.now() / 1000)
    let checkedContacts = 0

    for (const contactJid of contacts) {
      // Skip bot and groups
      if (contactJid === botJid || contactJid.endsWith('@g.us')) continue

      try {
        // BAILEYS 6.7.18: fetchStatus returns array of status
        const statuses = await sock.fetchStatus(contactJid)

        if (statuses && statuses.length > 0) {
          // Filter last 24hrs only
          const validStatuses = statuses.filter(s => now - s.messageTimestamp < 86400)

          if (validStatuses.length > 0) {
            statusByUser.set(contactJid, validStatuses.map(s => s.key))
          }
        }

        checkedContacts++

        // Delay every 5 contacts to avoid rate limit
        if (checkedContacts % 5 === 0) {
          await new Promise(r => setTimeout(r, 1000))
        }

        // Memory cleanup every 20 contacts
        if (checkedContacts % 20 === 0 && global.gc) {
          global.gc()
        }

      } catch {
        continue // Skip if error, brute force continue
      }
    }

    if (statusByUser.size === 0) {
      throw new Error('NO_STATUS')
    }

    // 6. PROCESS USERS - BRUTE FORCE LOW RAM
    let totalUsers = statusByUser.size
    let totalLiked = 0
    let totalFailed = 0
    let totalViewed = 0
    let usedEmojis = new Set()
    let processedUsers = 0
    let skippedUsers = 0

    for (const [userJid, statusKeys] of statusByUser) {
      try {
        // View all first - BRUTE FORCE
        try {
          await sock.readMessages(statusKeys.map(key => ({ key })))
          totalViewed += statusKeys.length
        } catch {}

        // Like each status with random emoji - BRUTE FORCE RETRY
        for (const key of statusKeys) {
          const randomEmoji = emojiPool[Math.floor(Math.random() * emojiPool.length)]
          usedEmojis.add(randomEmoji)

          let retries = 3
          let success = false

          while (retries > 0 &&!success) {
            try {
              await sock.sendMessage('status@broadcast', {
                react: {
                  text: randomEmoji,
                  key: key
                }
              })
              totalLiked++
              success = true
            } catch {
              retries--
              if (retries === 0) totalFailed++
              await new Promise(r => setTimeout(r, 1000))
            }
          }

          // Random delay 1.8-3.8s - WhatsApp safety
          await new Promise(r => setTimeout(r, 1800 + Math.random() * 2000))
        }

        processedUsers++

        // Delay between users 2.5-4.5s - safe for RAM and WhatsApp
        if (processedUsers < totalUsers) {
          await new Promise(r => setTimeout(r, 2500 + Math.random() * 2000))
        }

      } catch {
        skippedUsers++
        continue // Skip user on error, continue with others
      }

      // Memory cleanup every 10 users
      if (processedUsers % 10 === 0 && global.gc) {
        global.gc()
      }
    }

    // 7. SEND CONFIRM MESSAGE - DETAILED STATS
    const successRate = totalUsers > 0? Math.floor((processedUsers / totalUsers) * 100) : 0

    const confirmMsg = `╭─⌈ 🧶 *VSTALL COMPLETE* ⌋
│ Mode: ALL CONTACTS
│ Contacts Checked: ${checkedContacts}
│ Users With Status: ${totalUsers}
│ Users Processed: ${processedUsers}
│ Users Skipped: ${skippedUsers}
│ Success Rate: ${successRate}%
│
│ Status Viewed: ${totalViewed}
│ Status Liked: ${totalLiked}
│ Failed Likes: ${totalFailed}
│
│ Emojis Used: ${[...usedEmojis].slice(0, 15).join(' ')}
│ Type: ${customEmojis.length > 0? 'Custom' : 'Random Love 30'}
╰⊷ *Powered by Bunny Tech*`

    await sock.sendMessage(from, { text: confirmMsg }, { quoted: msg }).catch(() => {})

    // 8. REACT DONE
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {})

  } catch (error) {
    console.error('[VSTALL ERROR]', error.message)

    let errorMsg = `╭─⌈ ❌ *VSTALL FAILED* ⌋
│ Error: ${error.message}
│ Try again later
╰⊷ *Powered by Bunny Tech*`

    if (error.message === 'NO_CONTACTS') {
      errorMsg = `╭─⌈ ❌ *No Contacts* ⌋
│ No contacts found in your list
│ Add contacts first
╰⊷ *Powered by Bunny Tech*`
    } else if (error.message === 'NO_STATUS') {
      errorMsg = `╭─⌈ 📭 *No Status* ⌋
│ No active status from contacts
│ Wait for contacts to post status
╰⊷ *Powered by Bunny Tech*`
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg }).catch(() => {})
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {})
  }
}