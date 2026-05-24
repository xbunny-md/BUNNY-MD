// commands/group/unmute.js
export const name = 'unmute'
export const alias = ['open', 'unlock']
export const category = 'Group'
export const desc = 'Unmute group - everyone can send messages'

export default async function unmute(sock, { msg, from, isAdmin, isBotAdmin, isGroup }, botSettings) {
  try {
    // 1. Group check
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups 🐰'
      }, { quoted: msg })
    }

    // 2. Admin check
    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: '> Admin only command 🔒'
      }, { quoted: msg })
    }

    // 3. Bot admin check
    if (!isBotAdmin) {
      return await sock.sendMessage(from, {
        text: '> I need to be admin to unmute the group 🍊'
      }, { quoted: msg })
    }

    // 4. React 🍊
    await sock.sendMessage(from, {
      react: { text: '🍊', key: msg.key }
    })

    const groupMetadata = await sock.groupMetadata(from)
    const isMuted = groupMetadata.announce // true = muted, false = unmuted

    // 5. Check if already unmuted
    if (!isMuted) {
      return await sock.sendMessage(from, {
        text: '> Group is already unmuted 🔓\n> Everyone can send messages'
      }, { quoted: msg })
    }

    // 6. Unmute group
    await sock.groupSettingUpdate(from, 'not_announcement')

    const unmuteMsg = `╭─⌈ 🔓 *GROUP UNMUTED* ⌋
│
│ Group has been unmuted by admin
│ Everyone can send messages now
│
│ To mute: ${botSettings.prefix}mute
│
╰⊷ Powered By Bunny Tech 🐰`

    await sock.sendMessage(from, { text: unmuteMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[UNMUTE ERROR]', error.message)

    let errorMsg = '> Failed to unmute group'
    if (error.message.includes('forbidden')) {
      errorMsg = '> I do not have permission to change group settings'
    } else if (error.message.includes('not-authorized')) {
      errorMsg = '> Bot is not admin in this group 🍊'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}