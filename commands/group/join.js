// commands/group/join.js

export const name = 'join'
export const alias = ['joingc', 'joingroup']
export const category = 'Group'
export const desc = 'Join group using invite link'

export default async function join(sock, { msg, from, args, isOwner }, botSettings) {
  try {
    if (!isOwner) {
      return await sock.sendMessage(from, {
        text: '> Owner only command'
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      react: { text: '🦁', key: msg.key }
    })

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?join(gc|group)?\s*/i, '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔗 *JOIN GROUP* ⌋
│
│ *Usage:* ${botSettings.prefix}join <group link>
│ *Example:* ${botSettings.prefix}join https://chat.whatsapp.com/xxxxx
│ *Reply:* Reply to message with link
│
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    const regex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i
    const match = input.match(regex)

    if (!match) {
      return await sock.sendMessage(from, {
        text: '> Invalid group link format\n> Use: https://chat.whatsapp.com/xxxxx'
      }, { quoted: msg })
    }

    const inviteCode = match[1]
    const groupId = await sock.groupAcceptInvite(inviteCode)

    if (!groupId) {
      throw new Error('Failed to join')
    }

    const metadata = await sock.groupMetadata(groupId)
    const groupName = metadata.subject

    const successMsg = `╭─⌈ ✅ *JOINED* ⌋
│
│ *Group:* ${groupName}
│ *Members:* ${metadata.participants.length}
│ *Status:* Joined successfully
│
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, { text: successMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[JOIN ERROR]', error.message)

    let errorMsg = '> Failed to join group'

    if (error.message.includes('not-authorized')) {
      errorMsg = '> Link expired or revoked'
    } else if (error.message.includes('gone')) {
      errorMsg = '> Group link no longer valid'
    } else if (error.message.includes('already-in')) {
      errorMsg = '> Bot already in this group'
    } else if (error.message.includes('temporarily-banned')) {
      errorMsg = '> Bot temporarily banned from joining'
    } else if (error.message.includes('forbidden')) {
      errorMsg = '> Group is private or full'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}