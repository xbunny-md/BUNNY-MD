// commands/profile/getstatusviews.js
export const name = 'getstatusviews'
export const alias = ['statusviews', 'gsv', 'myviews']
export const category = 'Profile'
export const desc = 'Get details of who viewed and reacted to your statuses'

export default async function getstatusviews(sock, { msg, from }, botSettings) {
  try {
    // 1. React start - 🌹
    await sock.sendMessage(from, {
      react: { text: '🌹', key: msg.key }
    })

    // 2. Fetch your own status
    const myStatus = await sock.fetchStatus(sock.user.id)

    if (!myStatus || myStatus.length === 0) {
      throw new Error('NO_STATUS')
    }

    // 3. Sort by newest first
    myStatus.sort((a, b) => b.messageTimestamp - a.messageTimestamp)

    let totalViews = 0
    let totalReactions = 0
    let statusReports = []

    // 4. Loop through each status
    for (let i = 0; i < myStatus.length; i++) {
      const status = myStatus[i]
      const statusKey = status.key

      // Get status info
      const timeAgo = Math.floor((Date.now() / 1000 - status.messageTimestamp) / 60)
      const timeText = timeAgo < 60? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`

      // Get status type
      let statusType = 'Text'
      if (status.message?.imageMessage) statusType = 'Image'
      else if (status.message?.videoMessage) statusType = 'Video'
      else if (status.message?.audioMessage) statusType = 'Audio'

      // Get views - Baileys store
      const views = await sock.getStatusViewers(statusKey.id)
      const viewCount = views?.length || 0
      totalViews += viewCount

      // Get reactions
      const reactions = status.reactions || []
      const reactionCount = reactions.length
      totalReactions += reactionCount

      // Build viewers list
      let viewersList = ''
      if (viewCount > 0) {
        const viewerNames = []
        for (const viewer of views.slice(0, 10)) { // Limit 10 to avoid spam
          try {
            const name = await sock.getName(viewer)
            viewerNames.push(name || viewer.split('@')[0])
          } catch {
            viewerNames.push(viewer.split('@')[0])
          }
        }
        viewersList = viewerNames.join(', ')
        if (viewCount > 10) viewersList += ` +${viewCount - 10} more`
      } else {
        viewersList = 'No views yet'
      }

      // Build reactions list
      let reactionsList = ''
      if (reactionCount > 0) {
        const reactionData = []
        for (const react of reactions.slice(0, 8)) {
          try {
            const name = await sock.getName(react.sender)
            reactionData.push(`${react.text} ${name || react.sender.split('@')[0]}`)
          } catch {
            reactionData.push(`${react.text} ${react.sender.split('@')[0]}`)
          }
        }
        reactionsList = reactionData.join('\n│ ')
      } else {
        reactionsList = 'No reactions'
      }

      // Add to reports
      statusReports.push(`╭─⌈ 📊 *STATUS ${i + 1}* ⌋
│ Type: ${statusType}
│ Time: ${timeText}
│ Views: ${viewCount}
│ Reacts: ${reactionCount}
│ Viewers: ${viewersList}
│ Reactions:
│ ${reactionsList}
╰⊷ *${i + 1}/${myStatus.length}*`)
    }

    // 5. Send header with totals
    const header = `╭─⌈ 🌹 *STATUS ANALYTICS* ⌋
│ Total Status: ${myStatus.length}
│ Total Views: ${totalViews}
│ Total Reacts: ${totalReactions}
│ Generated: ${new Date().toLocaleTimeString()}
╰⊷ *Powered by Bunny Tech*`

    await sock.sendMessage(from, { text: header }, { quoted: msg })

    // 6. Send each status report - delay to avoid spam
    for (const report of statusReports) {
      await sock.sendMessage(from, { text: report })
      await new Promise(r => setTimeout(r, 800))
    }

    // 7. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[GETSTATUSVIEWS ERROR]', error.message)

    if (error.message === 'NO_STATUS') {
      await sock.sendMessage(from, {
        text: '> You have no active status in last 24hrs'
      }, { quoted: msg })
    }

    // React fail ❌
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}