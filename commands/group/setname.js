// commands/group/setgcname.js
export const name = 'setgcname'
export const alias = ['setgroupname', 'changegcname']
export const category = 'Group'
export const desc = 'Change group name - admin only'

export default async function setgcname(sock, { msg, from, args, isAdmin, isBotAdmin, isGroup }, botSettings) {
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
        text: '> I need to be admin to change group name 🍊'
      }, { quoted: msg })
    }

    // 4. Check if new name provided
    const newName = args.join(' ').trim()
    if (!newName) {
      return await sock.sendMessage(from, {
        text: `> Provide a new group name\n\nExample: ${botSettings.prefix}setgcname Bunny Squad 🔥`
      }, { quoted: msg })
    }

    // 5. Check name length - WhatsApp limit is 100 chars
    if (newName.length > 100) {
      return await sock.sendMessage(from, {
        text: '> Group name too long. Maximum 100 characters'
      }, { quoted: msg })
    }

    // 6. React 🍊
    await sock.sendMessage(from, {
      react: { text: '🍊', key: msg.key }
    })

    const groupMetadata = await sock.groupMetadata(from)
    const oldName = groupMetadata.subject

    // 7. Check if name is same
    if (oldName === newName) {
      return await sock.sendMessage(from, {
        text: '> Group name is already set to that'
      }, { quoted: msg })
    }

    // 8. Update group name
    await sock.groupUpdateSubject(from, newName)

    const successMsg = `╭─⌈ ✅ *GROUP NAME UPDATED* ⌋
│
│ Old Name: ${oldName}
│ New Name: ${newName}
│
│ Updated by admin
│
╰⊷ Powered By Bunny Tech 🐰`

    await sock.sendMessage(from, { text: successMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[SETGCNAME ERROR]', error.message)

    let errorMsg = '> Failed to change group name'
    if (error.message.includes('forbidden')) {
      errorMsg = '> I do not have permission to change group name'
    } else if (error.message.includes('not-authorized')) {
      errorMsg = '> Bot is not admin in this group 🍊'
    } else if (error.message.includes('rate-overlimit')) {
      errorMsg = '> Too many name changes. Try again later'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}