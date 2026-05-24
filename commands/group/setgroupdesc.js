// commands/group/setdesc.js
export const name = 'setdesc'
export const alias = ['setgroupdesc', 'changedesc']
export const category = 'Group'
export const desc = 'Change group description - admin only'

export default async function setdesc(sock, { msg, from, args, isAdmin, isBotAdmin, isGroup }, botSettings) {
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
        text: '> I need to be admin to change group description 🍊'
      }, { quoted: msg })
    }

    // 4. Check if new description provided
    const newDesc = args.join(' ').trim()
    if (!newDesc) {
      return await sock.sendMessage(from, {
        text: `> Provide a new group description\n\nExample: ${botSettings.prefix}setdesc Welcome to Bunny Squad`
      }, { quoted: msg })
    }

    // 5. Check description length - WhatsApp limit is 2048 chars
    if (newDesc.length > 2048) {
      return await sock.sendMessage(from, {
        text: '> Group description too long. Maximum 2048 characters'
      }, { quoted: msg })
    }

    // 6. React 💃
    await sock.sendMessage(from, {
      react: { text: '💃', key: msg.key }
    })

    const groupMetadata = await sock.groupMetadata(from)
    const oldDesc = groupMetadata.desc || ''

    // 7. Check if description is same
    if (oldDesc === newDesc) {
      return await sock.sendMessage(from, {
        text: '> Group description is already set to that'
      }, { quoted: msg })
    }

    // 8. Update group description
    await sock.groupUpdateDescription(from, newDesc)

    const successMsg = `╭─⌈ ✅ *DESCRIPTION UPDATED* ⌋
│
│ *Group description updated successfully*
│
╰⊷ *Powered By Bunny Tech* 🐰`

    await sock.sendMessage(from, { text: successMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[SETDESC ERROR]', error.message)

    let errorMsg = '> Failed to change group description'
    if (error.message.includes('forbidden')) {
      errorMsg = '> I do not have permission to change group description'
    } else if (error.message.includes('not-authorized')) {
      errorMsg = '> Bot is not admin in this group 🍊'
    } else if (error.message.includes('rate-overlimit')) {
      errorMsg = '> Too many description changes. Try again later'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}