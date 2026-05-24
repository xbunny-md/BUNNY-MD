// commands/group/mute.js
export const name = 'mute'
export const alias = ['close', 'lock']
export const category = 'Group'
export const desc = 'Mute group - only admins can send messages'

export default async function mute(sock, { msg, from, isAdmin, isBotAdmin, isGroup }, botSettings) {
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
        text: '> I need to be admin to mute the group 🍊'
      }, { quoted: msg })
    }

    // 4. React 🍊
    await sock.sendMessage(from, {
      react: { text: '🍊', key: msg.key }
    })

    const groupMetadata = await sock.groupMetadata(from)
    const isMuted = groupMetadata.announce // true = muted, false = unmuted

    // 5. Check if already muted
    if (isMuted) {
      return await sock.sendMessage(from, {
        text: '> Group is already muted 🔒\n> Only admins can send messages'
      }, { quoted: msg })
    }

    // 6. Mute group
    await sock.groupSettingUpdate(from, 'announcement')

    const muteMsg = `╭─⌈ 🔒 *GROUP MUTED* ⌋
│
│ Group has been muted by admin
│ Only admins can send messages now
│
│ To unmute: ${botSettings.prefix}unmute
│
╰⊷ Powered By Bunny Tech 🐰`

    await sock.sendMessage(from, { text: muteMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[MUTE ERROR]', error.message)

    let errorMsg = '> Failed to mute group'
    if (error.message.includes('forbidden')) {
      errorMsg = '> I do not have permission to change group settings'
    } else if (error.message.includes('not-authorized')) {
      errorMsg = '> Bot is not admin in this group 🍊'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}