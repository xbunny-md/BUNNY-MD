// commands/group/topchat.js
// Super clean - no file, no db - uses minimal RAM
// Counts messages since bot started only

export const name = 'topchat'
export const alias = ['top10', 'topmembers']
export const category = 'Group'
export const desc = 'Show top 10 most active members since bot started'

// Global counter - uses minimal RAM
global.topChatCache = global.topChatCache || new Map()

// Auto counter middleware
export const before = async function(m) {
  if (!m.isGroup) return

  if (!global.topChatCache.has(m.chat)) {
    global.topChatCache.set(m.chat, new Map())
  }

  const groupMap = global.topChatCache.get(m.chat)
  const current = groupMap.get(m.sender) || 0
  groupMap.set(m.sender, current + 1)
}

export default async function topchat(sock, { msg, from, isGroup }) {
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

    // 3. Get data
    if (!global.topChatCache.has(from)) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📊 *TOP CHAT* ⌋
│
│ *No messages counted yet*
│ *Start chatting to see stats*
│
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    const groupMap = global.topChatCache.get(from)
    const groupMetadata = await sock.groupMetadata(from)

    // 4. Sort top 10
    const sorted = [...groupMap.entries()]
     .sort((a, b) => b[1] - a[1])
     .slice(0, 10)

    if (sorted.length === 0) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📊 *TOP CHAT* ⌋
│
│ *No messages counted yet*
│
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. Format list with symbol and tags
    const mentions = []
    const topList = sorted.map(([jid, count], index) => {
      mentions.push(jid)
      const medal = index === 0? '🥇' : index === 1? '🥈' : index === 2? '🥉' : `${index + 1}.`
      return `│ ${medal} ✦ @${jid.split('@')[0]} - ${count} msgs`
    }).join('\n')

    const totalGroupMsgs = [...groupMap.values()].reduce((a, b) => a + b, 0)

    const successMsg = `╭─⌈ 🏆 *TOP 10 ACTIVE MEMBERS* ⌋
│
│ *Group:* ${groupMetadata.subject}
│ *Total Counted:* ${totalGroupMsgs} msgs
│ *Note:* Since bot started
│
${topList}
│
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      text: successMsg,
      mentions: mentions
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[TOPCHAT ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to get top chat'
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}