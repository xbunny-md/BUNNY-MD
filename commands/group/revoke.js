// commands/group/revoke.js
export const name = 'revoke'
export const alias = ['revokelink', 'resetlink']
export const category = 'Group'
export const desc = 'Reset group invite link - admin only'

export default async function revoke(sock, { msg, from, isAdmin, isBotAdmin, isGroup }) {
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
        text: '> I need to be admin to revoke group link 🧤'
      }, { quoted: msg })
    }

    // 4. React 🧤
    await sock.sendMessage(from, {
      react: { text: '🧤', key: msg.key }
    })

    // 5. Get old link for display
    let oldCode = ''
    try {
      oldCode = await sock.groupInviteCode(from)
    } catch {
      oldCode = 'unavailable'
    }

    // 6. Revoke and generate new link
    const newCode = await sock.groupRevokeInvite(from)
    const newLink = `https://chat.whatsapp.com/${newCode}`

    const successMsg = `╭─⌈ ✅ *GROUP LINK REVOKED* ⌋
│
│ *Old link disabled successfully*
│ *New group link generated*
│
│ ${newLink}
│
╰⊷ *Powered By Bunny Tech* 🐰`

    await sock.sendMessage(from, { text: successMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[REVOKE ERROR]', error.message)

    let errorMsg = '> Failed to revoke group link'
    if (error.message.includes('forbidden')) {
      errorMsg = '> I do not have permission to revoke group link'
    } else if (error.message.includes('not-authorized')) {
      errorMsg = '> Bot is not admin in this group 🧤'
    } else if (error.message.includes('rate-overlimit')) {
      errorMsg = '> Too many link resets. Try again later'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}