// commands/group/gstatus.js
// No admin needed - post any media/text to bot status
// Reply to image/video/audio/text with command

export const name = 'gstatus'
export const alias = ['setstatus', 'tostatus', 'upstatus']
export const category = 'Group'
export const desc = 'Post to bot status - supports text, image, video, audio'

export default async function gstatus(sock, { msg, from, isGroup }, botSettings) {
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

    // 3. Get quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    
    if (!quoted) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📤 *BOT STATUS* ⌋
│
│ *Usage:* Reply to media/text with ${botSettings.prefix}gstatus
│ *Supports:* Text, Image, Video, Audio
│
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 4. Post to status based on type
    if (quoted.imageMessage) {
      const caption = quoted.imageMessage.caption || ''
      const buffer = await sock.downloadMediaMessage({ message: { imageMessage: quoted.imageMessage } })
      await sock.sendMessage('status@broadcast', {
        image: buffer,
        caption: caption
      })
    } 
    else if (quoted.videoMessage) {
      const caption = quoted.videoMessage.caption || ''
      const buffer = await sock.downloadMediaMessage({ message: { videoMessage: quoted.videoMessage } })
      await sock.sendMessage('status@broadcast', {
        video: buffer,
        caption: caption
      })
    }
    else if (quoted.audioMessage) {
      const buffer = await sock.downloadMediaMessage({ message: { audioMessage: quoted.audioMessage } })
      await sock.sendMessage('status@broadcast', {
        audio: buffer,
        mimetype: 'audio/mp4',
        ptt: quoted.audioMessage.ptt || false
      })
    }
    else if (quoted.conversation || quoted.extendedTextMessage) {
      const text = quoted.conversation || quoted.extendedTextMessage.text
      await sock.sendMessage('status@broadcast', { text: text })
    }
    else {
      return await sock.sendMessage(from, {
        text: '> Unsupported media type'
      }, { quoted: msg })
    }

    const successMsg = `╭─⌈ ✅ *POSTED* ⌋
│
│ *Status updated successfully*
│
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, { text: successMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[GSTATUS ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to post status'
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}