// commands/profile/savestatus.js
export const name = 'savestatus'
export const alias = ['statusdl', 'dlstatus', 'downloadstatus']
export const category = 'Profile'
export const desc = 'Downloads and saves WhatsApp status. Add 😂 to send to bot DM'

export default async function savestatus(sock, { msg, from, body }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 📥
    await sock.sendMessage(from, {
      react: { text: '📥', key: msg.key }
    })

    // 2. Check if replying to a status
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const isStatus = msg.message?.extendedTextMessage?.contextInfo?.remoteJid === 'status@broadcast'

    if (!quoted ||!isStatus) {
      throw new Error('NOT_STATUS')
    }

    // 3. Check if user wants to send to bot DM - NENO LA KICHAWI NI 😂
    const shouldSendToBotDM = body.includes('😂')
    const botJid = sock.user?.id || sock.user?.jid
    const destination = shouldSendToBotDM && botJid? botJid : from

    // 4. Get status sender info
    const statusSender = msg.message.extendedTextMessage.contextInfo.participant
    const senderNum = statusSender.split('@')[0]
    let senderName = senderNum

    try {
      const name = await sock.getName(statusSender)
      if (name && name!== senderNum) {
        senderName = name
      }
    } catch {}

    // 5. Extract status media
    let mediaMessage = null
    let mediaType = 'Unknown'
    let caption = ''

    if (quoted.imageMessage) {
      mediaMessage = quoted.imageMessage
      mediaType = 'Image'
      caption = mediaMessage.caption || ''
    } else if (quoted.videoMessage) {
      mediaMessage = quoted.videoMessage
      mediaType = 'Video'
      caption = mediaMessage.caption || ''
    } else if (quoted.audioMessage) {
      mediaMessage = quoted.audioMessage
      mediaType = 'Audio'
    } else if (quoted.conversation) {
      // Text status
      caption = quoted.conversation
      mediaType = 'Text'
    } else if (quoted.extendedTextMessage) {
      caption = quoted.extendedTextMessage.text
      mediaType = 'Text'
    } else {
      throw new Error('UNSUPPORTED_STATUS')
    }

    // 6. Send text status directly
    if (mediaType === 'Text') {
      await sock.sendMessage(destination, {
        text: `╭─⌈ 📱 *SAVED STATUS* ⌋
│ From: ${senderName}
│ Number: +${senderNum}
│ Type: Text Status
│ Content: ${caption}
╰⊷ *Powered by Bunny Tech*`
      })
    } else {
      // 7. Download and resend media status
      const buffer = await sock.downloadMediaMessage({ message: quoted })

      if (mediaType === 'Image') {
        await sock.sendMessage(destination, {
          image: buffer,
          caption: `╭─⌈ 📱 *SAVED STATUS* ⌋
│ From: ${senderName}
│ Number: +${senderNum}
│ Type: Image Status
${caption? `│ Caption: ${caption}\n` : ''}╰⊷ *Powered by Bunny Tech*`
        })
      } else if (mediaType === 'Video') {
        await sock.sendMessage(destination, {
          video: buffer,
          caption: `╭─⌈ 📱 *SAVED STATUS* ⌋
│ From: ${senderName}
│ Number: +${senderNum}
│ Type: Video Status
${caption? `│ Caption: ${caption}\n` : ''}╰⊷ *Powered by Bunny Tech*`
        })
      } else if (mediaType === 'Audio') {
        await sock.sendMessage(destination, {
          audio: buffer,
          mimetype: 'audio/mp4',
          caption: `╭─⌈ 📱 *SAVED STATUS* ⌋
│ From: ${senderName}
│ Number: +${senderNum}
│ Type: Audio Status
╰⊷ *Powered by Bunny Tech*`
        })
      }
    }

    // 8. React done ✅ - Always react kwa original chat
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

    // 9. Notify user if sent to bot DM
    if (shouldSendToBotDM && destination!== from) {
      await sock.sendMessage(from, {
        text: '> Status saved to bot DM 😂'
      }, { quoted: msg })
    }

  } catch (error) {
    console.error('[SAVESTATUS ERROR]', error.message)

    let errorMsg = '> Failed to save status'

    if (error.message === 'NOT_STATUS') {
      errorMsg = '> Reply to a WhatsApp status to save it'
    } else if (error.message === 'UNSUPPORTED_STATUS') {
      errorMsg = '> This status type is not supported yet'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}