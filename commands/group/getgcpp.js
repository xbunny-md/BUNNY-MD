// commands/group/getgcpp.js
export const name = 'getgcpp'
export const alias = ['getgrouppic', 'grouppic', 'gcpp']
export const category = 'Group'
export const desc = 'Get current group profile picture'

export default async function getgcpp(sock, { msg, from, isGroup }) {
  try {
    // 1. Group check
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups 🐰'
      }, { quoted: msg })
    }

    // 2. React 🧤
    await sock.sendMessage(from, {
      react: { text: '🧤', key: msg.key }
    })

    // 3. Get group profile picture
    let ppUrl
    try {
      ppUrl = await sock.profilePictureUrl(from, 'image')
    } catch (error) {
      return await sock.sendMessage(from, {
        text: '> This group has no profile picture set'
      }, { quoted: msg })
    }

    const groupMetadata = await sock.groupMetadata(from)
    const groupName = groupMetadata.subject

    const caption = `╭─⌈ 📸 *GROUP PICTURE* ⌋
│
│ *Group:* ${groupName}
│ *Members:* ${groupMetadata.participants.length}
│
╰⊷ *Powered By Bunny Tech* 🐰`

    // 4. Send group picture
    await sock.sendMessage(from, {
      image: { url: ppUrl },
      caption: caption
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[GETGCPP ERROR]', error.message)

    let errorMsg = '> Failed to get group picture'
    if (error.message.includes('404')) {
      errorMsg = '> This group has no profile picture set'
    } else if (error.message.includes('not-authorized')) {
      errorMsg = '> Cannot access group picture'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}