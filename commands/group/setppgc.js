// commands/group/setppgc.js
export const name = 'setppgc'
export const alias = ['setgrouppic', 'setgroupicon', 'setgcpp']
export const category = 'Group'
export const desc = 'Change group profile picture - auto detects if admin required'

export default async function setppgc(sock, { msg, from, isAdmin, isBotAdmin, isGroup }) {
  try {
    // 1. Group check
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups 🐰'
      }, { quoted: msg })
    }

    // 2. Get group metadata to check who can edit
    const groupMetadata = await sock.groupMetadata(from)
    const editSettings = groupMetadata.restrict // false = everyone, true = admin only

    // 3. Check if admin required based on group settings
    if (editSettings && !isAdmin) {
      return await sock.sendMessage(from, {
        text: '> This group only allows admins to change profile picture 🔒'
      }, { quoted: msg })
    }

    // 4. Bot admin check
    if (!isBotAdmin) {
      return await sock.sendMessage(from, {
        text: '> I need to be admin to change group picture 🧤'
      }, { quoted: msg })
    }

    // 5. Check if image provided
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const isQuotedImage = quoted?.imageMessage
    const isImage = msg.message?.imageMessage

    if (!isQuotedImage && !isImage) {
      return await sock.sendMessage(from, {
        text: '> Reply to an image or send image with caption\n\nExample: Reply to image with .setppgc'
      }, { quoted: msg })
    }

    // 6. React 🧤
    await sock.sendMessage(from, {
      react: { text: '🧤', key: msg.key }
    })

    // 7. Download image
    const downloadMsg = isQuotedImage ? {
      key: {
        remoteJid: from,
        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
        participant: msg.message.extendedTextMessage.contextInfo.participant
      },
      message: quoted
    } : msg

    const buffer = await sock.downloadMediaMessage(downloadMsg, 'buffer')

    // 8. Update group profile picture
    await sock.updateProfilePicture(from, buffer)

    const successMsg = `╭─⌈ ✅ *GROUP PICTURE UPDATED* ⌋
│
│ *Group profile picture changed successfully*
│
│ Updated by: ${isAdmin ? 'Admin' : 'Member'}
│
╰⊷ *Powered By Bunny Tech* 🐰`

    await sock.sendMessage(from, { text: successMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[SETPPGC ERROR]', error.message)

    let errorMsg = '> Failed to change group picture'
    if (error.message.includes('forbidden')) {
      errorMsg = '> I do not have permission to change group picture'
    } else if (error.message.includes('not-authorized')) {
      errorMsg = '> Bot is not admin in this group 🧤'
    } else if (error.message.includes('bad-request')) {
      errorMsg = '> Invalid image. Use JPG or PNG only'
    } else if (error.message.includes('rate-overlimit')) {
      errorMsg = '> Too many picture changes. Try again later'
    } else if (error.message.includes('timed-out')) {
      errorMsg = '> Image too large. Use smaller image'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}