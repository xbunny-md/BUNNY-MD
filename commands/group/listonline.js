// commands/group/listonline.js
export const name = 'listonline'
export const alias = ['online', 'onlinemembers']
export const category = 'Group'
export const desc = 'List members who are currently online'

export default async function listonline(sock, { msg, from, isGroup }) {
  try {
    // 1. Group check
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups'
      }, { quoted: msg })
    }

    // 2. React 🧣
    await sock.sendMessage(from, {
      react: { text: '🧣', key: msg.key }
    })

    const groupMetadata = await sock.groupMetadata(from)
    const participants = groupMetadata.participants

    // 3. Get presence for each participant
    let onlineMembers = []
    let onlineJids = []

    for (const participant of participants) {
      const jid = participant.id
      try {
        await sock.presenceSubscribe(jid)
        await new Promise(resolve => setTimeout(resolve, 50))

        const presence = sock.presence[jid]
        if (presence?.lastKnownPresence === 'available' || presence?.lastKnownPresence === 'composing' || presence?.lastKnownPresence === 'recording') {
          onlineMembers.push(jid)
          onlineJids.push(jid)
        }
      } catch {
        continue
      }
    }

    // 4. Format output
    if (onlineMembers.length === 0) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💤 *ONLINE MEMBERS* ⌋
│
│ *Status:* No members online right now
│
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // Format tags with symbol inside bot lines
    const taggedList = onlineMembers.slice(0, 50).map((jid, i) => `│ ✦ @${jid.split('@')[0]}`).join('\n')
    const moreText = onlineMembers.length > 50? `\n│ ✦...and ${onlineMembers.length - 50} more` : ''

    const successMsg = `╭─⌈ 🟢 *ONLINE MEMBERS* ⌋
│
│ *Total Online:* ${onlineMembers.length}/${participants.length}
│
${taggedList}${moreText}
│
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      text: successMsg,
      mentions: onlineJids
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[LISTONLINE ERROR]', error.message)

    let errorMsg = '> Failed to get online members'
    if (error.message.includes('rate-overlimit')) {
      errorMsg = '> Too many requests. Try again later'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}