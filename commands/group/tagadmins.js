// commands/group/tagadmin.js
// Super clean - no file, no db, no RAM usage
// Tags all group admins

export const name = 'tagadmin'
export const alias = ['admins', 'listadmin', 'atmin']
export const category = 'Group'
export const desc = 'Tag all group admins'

export default async function tagadmin(sock, { msg, from, isGroup, sender }) {
  try {
    // 1. Group check
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups'
      }, { quoted: msg })
    }

    // 2. React 🐦‍🔥
    await sock.sendMessage(from, {
      react: { text: '🐦‍🔥', key: msg.key }
    })

    const groupMetadata = await sock.groupMetadata(from)
    const participants = groupMetadata.participants
    const groupName = groupMetadata.subject

    // 3. Filter admins
    const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    
    if (admins.length === 0) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ 👑 *GROUP ADMINS* ⌋
│
│ *Group:* ${groupName}
│ *Status:* No admins found
│
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 4. Format admin list with tags inside lines
    const mentions = []
    const adminList = admins.map((admin, index) => {
      mentions.push(admin.id)
      const role = admin.admin === 'superadmin' ? '👑 Owner' : '⚡ Admin'
      return `│ ${index + 1}. ✦ @${admin.id.split('@')[0]} - ${role}`
    }).join('\n')

    const successMsg = `╭─⌈ 👑 *GROUP ADMINS* ⌋
│
│ *Group:* ${groupName}
│ *Total Admins:* ${admins.length}
│ *Called by:* @${sender.split('@')[0]}
│
${adminList}
│
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      text: successMsg,
      mentions: [...mentions, sender]
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[TAGADMIN ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to get admin list'
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}