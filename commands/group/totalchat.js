// commands/group/totalchat.js
// Super clean - no file, no db, 0.001 RAM usage
// Counts messages since bot started only

export const name = 'totalchat'
export const alias = ['totalmsg', 'groupmsgs']
export const category = 'Group'
export const desc = 'Show messages counted since bot started'

// Global counter - uses almost 0 RAM
global.totalChatCache = global.totalChatCache || new Map()

// Auto counter middleware
export const before = async function(m) {
  if (!m.isGroup) return
  
  const current = global.totalChatCache.get(m.chat) || 0
  global.totalChatCache.set(m.chat, current + 1)
}

export default async function totalchat(sock, { msg, from, isGroup }) {
  try {
    // 1. Group check
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups'
      }, { quoted: msg })
    }

    // 2. React 🐦‍🔥
    await sock.sendMessage(from, {
      react: { text: '🐦‍🔥', key: msg.key }
    })

    const totalMsgs = global.totalChatCache.get(from) || 0
    const groupMetadata = await sock.groupMetadata(from)
    const groupName = groupMetadata.subject
    const memberCount = groupMetadata.participants.length

    // 3. Format numbers
    const formatNumber = (num) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
      return num.toString()
    }

    const avgPerMember = memberCount > 0? Math.floor(totalMsgs / memberCount) : 0

    const successMsg = `╭─⌈ 📊 *MESSAGE STATS* ⌋
│
│ *Group:* ${groupName}
│ *Counted Since Bot Started:* ${formatNumber(totalMsgs)}
│ *Members:* ${memberCount}
│ *Average:* ${formatNumber(avgPerMember)} per member
│
│ *Note:* Count resets when bot restarts
│
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, { text: successMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[TOTALCHAT ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to get message count'
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}