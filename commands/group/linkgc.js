// commands/group/linkgc.js
// Super clean - link only, no extra data

export const name = 'linkgc'
export const alias = ['link', 'gclink', 'grouplink']
export const category = 'Group'
export const desc = 'Get group invite link'

export default async function linkgc(sock, { msg, from, isGroup }) {
  try {
    // 1. Group check
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups'
      }, { quoted: msg })
    }

    // 2. React 🫶
    await sock.sendMessage(from, {
      react: { text: '🫶', key: msg.key }
    })

    // 3. Get invite code
    const code = await sock.groupInviteCode(from)
    const inviteLink = `https://chat.whatsapp.com/${code}`

    const successMsg = `╭─⌈ 🔗 *GROUP LINK* ⌋
│
│ ${inviteLink}
│
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, { text: successMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[LINKGC ERROR]', error.message)

    let errorMsg = '> Failed to get group link'
    if (error.message.includes('not admin') || error.message.includes('forbidden')) {
      errorMsg = '> Bot must be admin'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}