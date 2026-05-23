// commands/profile/businessinfo.js
export const name = 'businessinfo'
export const alias = ['bizinfo', 'business', 'bizprofile']
export const category = 'Profile'
export const desc = 'Gets detailed business profile information from WhatsApp Business'

export default async function businessinfo(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 🏢
    await sock.sendMessage(from, {
      react: { text: '🏢', key: msg.key }
    })

    // 2. Extract target - 4 super ways
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    const mentioned = quoted?.mentionedJid?.[0]
    const replied = quoted?.participant
    const textAfterCmd = args.join(' ').trim()

    let target = null

    // Way 1: Args - number direct
    if (textAfterCmd) {
      const cleanNum = textAfterCmd.replace(/[^0-9]/g, '')
      if (cleanNum.length >= 7 && cleanNum.length <= 15) {
        target = cleanNum + '@s.whatsapp.net'
      } else {
        throw new Error('INVALID_NUMBER')
      }
    }
    // Way 2: Mentioned user
    else if (mentioned) {
      target = mentioned
    }
    // Way 3: Replied user
    else if (replied) {
      target = replied
    }
    // Way 4: Sender default
    else {
      target = msg.key.participant || from
    }

    if (!target) throw new Error('NO_TARGET')

    // 3. Check if number exists on WhatsApp
    const [result] = await sock.onWhatsApp(target)
    if (!result?.exists) throw new Error('NOT_REGISTERED')

    target = result.jid
    const number = target.split('@')[0]

    // 4. Check if it's a business account
    if (!result.isBusiness) {
      throw new Error('NOT_BUSINESS')
    }

    // 5. Fetch business profile
    let businessProfile = null
    try {
      businessProfile = await sock.getBusinessProfile(target)
    } catch {
      throw new Error('FETCH_FAILED')
    }

    if (!businessProfile) throw new Error('NO_BUSINESS_PROFILE')

    // 6. Extract business info
    const businessName = businessProfile.businessName || 'Not Set'
    const category = businessProfile.category || 'Not Specified'
    const description = businessProfile.description || 'No Description'
    const website = businessProfile.website || 'Not Set'
    const email = businessProfile.email || 'Not Set'
    const address = businessProfile.address || 'Not Set'

    // Truncate long description
    const shortDesc = description.length > 100? description.slice(0, 100) + '...' : description

    const businessPayload =
`╭─⌈ 🏢 *BUSINESS PROFILE* ⌋
│ Number: +${number}
│ Name: ${businessName}
│ Category: ${category}
│ Description: ${shortDesc}
│ Website: ${website}
│ Email: ${email}
│ Address: ${address}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, {
      text: businessPayload
    }, { quoted: msg })

    // 7. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[BUSINESSINFO ERROR]', error.message)

    let errorMsg = '> Failed to fetch business info'

    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = '> Could not identify target number'
    } else if (error.message === 'NOT_REGISTERED') {
      errorMsg = '> Number not registered on WhatsApp'
    } else if (error.message === 'NOT_BUSINESS') {
      errorMsg = '> This is not a WhatsApp Business account'
    } else if (error.message === 'NO_BUSINESS_PROFILE') {
      errorMsg = '> Business profile not set or hidden'
    } else if (error.message === 'FETCH_FAILED') {
      errorMsg = '> Server error. Failed to fetch business profile'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}