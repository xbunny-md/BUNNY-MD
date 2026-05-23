// commands/stalker/whatsappstalk.js
import axios from 'axios'

export const name = 'whatsappstalk'
export const alias = ['wastalk', 'wainfo', 'wastalker']
export const category = 'Stalker'
export const desc = 'Get WhatsApp user profile information'

export default async function whatsappstalk(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract number from args, message, quoted message, or mention
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(/^[!.]?wastalk\s*/i, '') || quotedText

    // Check for mentions first
    if (mentions.length > 0) {
      input = mentions[0].split('@')[0]
    }

    // Check if replying to someone
    const participant = msg.message?.extendedTextMessage?.contextInfo?.participant
    if (!input && participant) {
      input = participant.split('@')[0]
    }

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}wastalk <number>\n> Example: ${botSettings.prefix}wastalk 255712345678\n> Example: ${botSettings.prefix}wastalk @mention\n> Reply to someone: ${botSettings.prefix}wastalk`
      }, { quoted: msg })
    }

    // Clean number - remove + and spaces
    let number = input.replace(/[^0-9]/g, '')

    // Validate number format
    if (number.length < 10 || number.length > 15) {
      return await sock.sendMessage(from, {
        text: '> Invalid number format. Use: 255712345678'
      }, { quoted: msg })
    }

    const jid = `${number}@s.whatsapp.net`

    // 2. React first - BUNNY STALKER MODE 😷
    await sock.sendMessage(from, {
      react: { text: '😷', key: msg.key }
    })

    const processingMsg = await sock.sendMessage(from, {
      text: `> Searching WhatsApp profile +${number}...`
    }, { quoted: msg })

    // 3. Check if number exists on WhatsApp
    const [result] = await sock.onWhatsApp(jid)
    if (!result?.exists) {
      throw new Error('Number not on WhatsApp')
    }

    // 4. Fetch all available data
    let profilePicUrl = null
    let status = null
    let businessProfile = null
    let name = null

    try {
      // Get profile picture
      profilePicUrl = await sock.profilePictureUrl(jid, 'image')
    } catch (e) {
      console.log('[WASTALK] No profile pic')
    }

    try {
      // Get status/about
      status = await sock.fetchStatus(jid)
    } catch (e) {
      console.log('[WASTALK] No status')
    }

    try {
      // Get business profile if available
      businessProfile = await sock.getBusinessProfile(jid)
    } catch (e) {
      console.log('[WASTALK] Not a business account')
    }

    try {
      // Get contact name
      const contact = await sock.getContact(jid)
      name = contact?.name || contact?.notify || null
    } catch (e) {
      console.log('[WASTALK] No contact name')
    }

    // 5. Build info card - BUNNY STYLE
    const isBusiness = businessProfile? true : false
    const accountType = isBusiness? 'Business 💼' : 'Personal 👤'
    const verifyStatus = businessProfile?.verifiedName? 'Verified ✅' : 'Not Verified'

    let infoCard = `╭─⌈ 😷 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *WhatsApp Profile Stalker*
│
│ 📱 *Number:* +${number}
│ 👤 *Name:* ${name || businessProfile?.verifiedName || 'Unknown'}
│ 💬 *About:* ${status?.status || 'No status set'}
│ ⏰ *Status Updated:* ${status?.setAt? new Date(status.setAt).toLocaleDateString() : 'Unknown'}
│
│ 🏷️ *Account:* ${accountType}
│ ${verifyStatus}
│`

    if (isBusiness) {
      infoCard += `\n│ 📊 *Business Info:*`
      if (businessProfile.description) {
        infoCard += `\n│ 📝 *Description:* ${businessProfile.description.slice(0, 60)}${businessProfile.description.length > 60? '...' : ''}`
      }
      if (businessProfile.category) {
        infoCard += `\n│ 🏪 *Category:* ${businessProfile.category}`
      }
      if (businessProfile.website) {
        infoCard += `\n│ 🔗 *Website:* ${businessProfile.website}`
      }
      if (businessProfile.email) {
        infoCard += `\n│ 📧 *Email:* ${businessProfile.email}`
      }
      if (businessProfile.address) {
        infoCard += `\n│ 📍 *Address:* ${businessProfile.address}`
      }
    }

    infoCard += `\n│\n╰⊷ *Data retrieved successfully*`

    // 6. Send profile with avatar
    if (profilePicUrl) {
      await sock.sendMessage(from, {
        image: { url: profilePicUrl },
        caption: infoCard,
        contextInfo: {
          externalAdReply: {
            title: `+${number}`,
            body: `${accountType} • ${verifyStatus}`,
            thumbnailUrl: profilePicUrl,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: `https://wa.me/${number}`
          }
        }
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        text: infoCard + `\n\n> No profile picture set`
      }, { quoted: msg })
    }

    // 7. Delete processing message and react done ✅
    await sock.sendMessage(from, { delete: processingMsg.key })
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[WASTALK ERROR]', error.message)

    let errorMsg = '> Failed to fetch WhatsApp profile'
    if (error.message.includes('not on WhatsApp')) {
      errorMsg = '> Number not registered on WhatsApp'
    } else if (error.message.includes('Invalid')) {
      errorMsg = '> Invalid number format'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}