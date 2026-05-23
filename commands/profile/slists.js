// commands/profile/statuslist.js
export const name = 'statuslist'
export const alias = ['slist', 'statlist', 'lists']
export const category = 'Profile'
export const desc = 'List all active statuses from your contacts'

export default async function statuslist(sock, { msg, from }, botSettings) {
  try {
    // 1. React start - 🌸
    await sock.sendMessage(from, {
      react: { text: '🌸', key: msg.key }
    })

    // 2. Fetch all status updates
    const allStatuses = await sock.fetchStatusUpdates()

    if (!allStatuses || allStatuses.length === 0) {
      throw new Error('NO_STATUS')
    }

    // 3. Group by user and filter last 24hrs
    const now = Math.floor(Date.now() / 1000)
    const statusMap = new Map()

    for (const status of allStatuses) {
      // Skip expired status > 24hrs
      if (now - status.messageTimestamp > 86400) continue

      const userJid = status.participant || status.key.participant
      if (!userJid || userJid === sock.user.id) continue

      if (!statusMap.has(userJid)) {
        statusMap.set(userJid, [])
      }
      statusMap.get(userJid).push(status)
    }

    if (statusMap.size === 0) {
      throw new Error('NO_STATUS')
    }

    // 4. Build status list
    let totalUsers = statusMap.size
    let totalStatus = 0
    let userReports = []

    for (const [userJid, userStatuses] of statusMap) {
      totalStatus += userStatuses.length

      // Sort user statuses newest first
      userStatuses.sort((a, b) => b.messageTimestamp - a.messageTimestamp)

      // Get user name
      let userName = userJid.split('@')[0]
      try {
        const name = await sock.getName(userJid)
        if (name && name!== userName) userName = name
      } catch {}

      // Get latest status time
      const latestTime = Math.floor((now - userStatuses[0].messageTimestamp) / 60)
      const timeText = latestTime < 60? `${latestTime}m ago` : `${Math.floor(latestTime / 60)}h ago`

      // Get status types
      const types = []
      for (const s of userStatuses) {
        if (s.message?.imageMessage) types.push('📷')
        else if (s.message?.videoMessage) types.push('🎥')
        else if (s.message?.audioMessage) types.push('🎵')
        else if (s.message?.documentMessage) types.push('📄')
        else types.push('📝')
      }

      userReports.push(`╭─⌈ 👤 *${userName}* ⌋
│ Number: +${userJid.split('@')[0]}
│ Status: ${userStatuses.length}
│ Latest: ${timeText}
│ Types: ${types.slice(0, 5).join(' ')}
│ Tip: Reply user msg + ${botSettings.prefix}vst 🔥
╰⊷ *View with vst command*`)
    }

    // 5. Send header
    const header = `╭─⌈ 🌸 *STATUS LIST* ⌋
│ Active Users: ${totalUsers}
│ Total Status: ${totalStatus}
│ Generated: ${new Date().toLocaleTimeString()}
│ Usage: Reply user + ${botSettings.prefix}vst 😂
╰⊷ *Powered by Bunny Tech*`

    await sock.sendMessage(from, { text: header }, { quoted: msg })

    // 6. Send user reports - max 15 to avoid spam
    const limitedReports = userReports.slice(0, 15)
    for (const report of limitedReports) {
      await sock.sendMessage(from, { text: report })
      await new Promise(r => setTimeout(r, 600))
    }

    if (userReports.length > 15) {
      await sock.sendMessage(from, {
        text: `> +${userReports.length - 15} more users with status not shown`
      })
    }

    // 7. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[STATUSLIST ERROR]', error.message)

    if (error.message === 'NO_STATUS') {
      await sock.sendMessage(from, {
        text: '> No active status found from your contacts'
      }, { quoted: msg })
    }

    // React fail ❌
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}