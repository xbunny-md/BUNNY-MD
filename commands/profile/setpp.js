// commands/profile/setpp.js
export const name = 'setpp'
export const alias = ['setdp', 'updatepp']
export const category = 'Profile'
export const desc = 'Updates bot profile picture from replied image'

export default async function setpp(sock, { msg, from }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE ☝️
    await sock.sendMessage(from, {
      react: { text: '☝️', key: msg.key }
    })

    // 2. Check if replied to image
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedImage = quoted?.imageMessage

    if (!quotedImage) {
      throw new Error('NO_IMAGE')
    }

    // 3. Download image buffer
    const stream = await sock.downloadMediaMessage({ message: { imageMessage: quotedImage } })
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    if (!buffer || buffer.length === 0) throw new Error('DOWNLOAD_FAILED')

    // 4. Update bot profile picture
    await sock.updateProfilePicture(sock.user.id, buffer)

    // 5. Short confirm
    const confirmPayload = 
`╭─⌈ ✅ *PP UPDATED* ⌋
│ Bot profile picture changed
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      text: confirmPayload 
    }, { quoted: msg })

    // 6. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[SETPP ERROR]', error.message)

    let errorMsg = '> Failed to update profile picture'
    
    if (error.message === 'NO_IMAGE') {
      errorMsg = '> Reply to an image to set as bot PP'
    } else if (error.message === 'DOWNLOAD_FAILED') {
      errorMsg = '> Failed to download image'
    } else if (error.message.includes('500')) {
      errorMsg = '> WhatsApp server error. Try again'
    } else if (error.message.includes('403')) {
      errorMsg = '> No permission to update profile picture'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}