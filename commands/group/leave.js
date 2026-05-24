// commands/group/leave.js

export const name = 'leave'
export const alias = ['leavegc', 'exit', 'out']
export const category = 'Group'
export const desc = 'Leave current group'

export default async function leave(sock, { msg, from, isGroup, isOwner, isAdmin }) {
  try {
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups'
      }, { quoted: msg })
    }

    if (!isOwner && !isAdmin) {
      return await sock.sendMessage(from, {
        text: '> Admin or Owner only command'
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      react: { text: '🦁', key: msg.key }
    })

    const metadata = await sock.groupMetadata(from)
    const groupName = metadata.subject

    await sock.sendMessage(from, {
      text: `╭─⌈ 👋 *LEAVING* ⌋
│
│ *Group:* ${groupName}
│ *Status:* Goodbye
│
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })

    await sock.groupLeave(from)

  } catch (error) {
    console.error('[LEAVE ERROR]', error.message)

    let errorMsg = '> Failed to leave group'

    if (error.message.includes('forbidden')) {
      errorMsg = '> Bot cannot leave - permission denied'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}