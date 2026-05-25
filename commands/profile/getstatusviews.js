// commands/profile/getstatusviews.js
export const name = 'getstatusviews'
export const alias = ['statusviews', 'gsv', 'myviews', 'statusinfo']
export const category = 'Profile'
export const desc = 'Get details of who viewed and reacted to your statuses'

export default async function getstatusviews(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix
  const myJid = sock.user.id

  try {
    // 1. REACT START
    await sock.sendMessage(from, {
      react: { text: '🌹', key: msg.key }
    })

    // 2. FETCH YOUR STATUS - CORRECT METHOD
    const statusData = await sock.fetchStatusMessages([myJid])

    if (!statusData || statusData.length === 0) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📭 *No Active Status* ⌋
│ You have no status in last 24hrs
│ Post a status first to track views
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    const statuses = statusData[0].statuses || []

    if (statuses.length === 0) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📭 *No Status* ⌋
│ No active status found
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 3. SORT BY NEWEST FIRST
    statuses.sort((a, b) => b.messageTimestamp - a.messageTimestamp)

    let totalViews = 0
    let totalReactions = 0
    let statusReports = []

    // 4. LOOP THROUGH EACH STATUS
    for (let i = 0; i < statuses.length; i++) {
      const status = statuses[i]
      const statusKey = status.key

      // Get time ago
      const timeAgo = Math.floor((Date.now() / 1000 - status.messageTimestamp) / 60)
      const timeText = timeAgo < 60? `${timeAgo}m ago` :
                       timeAgo < 1440? `${Math.floor(timeAgo / 60)}h ago` :
                       `${Math.floor(timeAgo / 1440)}d ago`

      // Get status type
      let statusType = 'Text'
      let caption = ''
      if (status.message?.imageMessage) {
        statusType = 'Image'
        caption = status.message.imageMessage.caption || ''
      } else if (status.message?.videoMessage) {
        statusType = 'Video'
        caption = status.message.videoMessage.caption || ''
      } else if (status.message?.audioMessage) {
        statusType = 'Audio'
      }

      // Get views - FROM STORE
      const views = status.readReceipts || []
      const viewCount = views.length
      totalViews += viewCount

      // Get reactions - FROM STATUS
      const reactions = status.reactions || []
      const reactionCount = reactions.length
      totalReactions += reactionCount

      // Build viewers list - LIMIT 8
      let viewersList = ''
      if (viewCount > 0) {
        const viewerNames = []
        for (const viewer of views.slice(0, 8)) {
          try {
            const name = await sock.getName(viewer.userJid)
            viewerNames.push(name || viewer.userJid.split('@')[0])
          } catch {
            viewerNames.push(viewer.userJid.split('@')[0])
          }
        }
        viewersList = viewerNames.join(', ')
        if (viewCount > 8) viewersList += ` +${viewCount - 8} more`
      } else {
        viewersList = 'No views yet'
      }

      // Build reactions list - LIMIT 6
      let reactionsList = ''
      if (reactionCount > 0) {
        const reactionData = []
        for (const react of reactions.slice(0, 6)) {
          try {
            const name = await sock.getName(react.key.participant || react.key.remoteJid)
            reactionData.push(`${react.text} ${name || react.key.participant.split('@')[0]}`)
          } catch {
            reactionData.push(`${react.text} ${react.key.participant.split('@')[0]}`)
          }
        }
        reactionsList = reactionData.join('\n│ ')
      } else {
        reactionsList = 'No reactions'
      }

      // Add caption preview
      const captionPreview = caption? `\n│ Caption: ${caption.slice(0, 30)}${caption.length > 30? '...' : ''}` : ''

      // Add to reports
      statusReports.push(`╭─⌈ 📊 *STATUS ${i + 1}/${statuses.length}* ⌋
│ Type: ${statusType}${captionPreview}
│ Time: ${timeText}
│ Views: ${viewCount}
│ Reacts: ${reactionCount}
│
│ *Viewers:*
│ ${viewersList}
│
│ *Reactions:*
│ ${reactionsList}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`)
    }

    // 5. SEND HEADER WITH TOTALS
    const header = `╭─⌈ 🌹 *STATUS ANALYTICS* ⌋
│ Total Status: ${statuses.length}
│ Total Views: ${totalViews}
│ Total Reacts: ${totalReactions}
│ Avg Views: ${Math.floor(totalViews / statuses.length)}
│ Generated: ${new Date().toLocaleTimeString()}
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, { text: header }, { quoted: msg })

    // 6. SEND EACH STATUS REPORT - DELAY TO AVOID SPAM
    for (const report of statusReports) {
      await sock.sendMessage(from, { text: report })
      await new Promise(r => setTimeout(r, 1000))
    }

    // 7. REACT DONE
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[GETSTATUSVIEWS ERROR]', error.message)

    let errorMsg = `╭─⌈ ❌ *Error* ⌋
│ Failed to fetch status data
│ Make sure you have active status
╰⊷ *Powered By Bunny Tech*`

    if (error.message.includes('fetchStatusMessages')) {
      errorMsg = `╭─⌈ ❌ *Feature Unavailable* ⌋
│ Status tracking not supported
│ Update Baileys to latest version
╰⊷ *Powered By Bunny Tech*`
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}