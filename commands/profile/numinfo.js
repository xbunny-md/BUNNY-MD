// commands/profile/numinfo.js
export const name = 'numinfo'
export const alias = ['numberinfo', 'checknum', 'numcheck']
export const category = 'Profile'
export const desc = 'Gets detailed information about a WhatsApp number'

export default async function numinfo(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 📱
    await sock.sendMessage(from, {
      react: { text: '📱', key: msg.key }
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

    // 4. Gather all info
    let accountType = result.isBusiness? 'Business Account' : 'Personal Account'
    let name = 'Hidden'
    let status = 'Hidden'
    let hasProfilePic = false
    let emoji = '✅'

    // Get name
    try {
      const contactName = await sock.getName(target)
      if (contactName && contactName!== number) {
        name = contactName
      }
    } catch {}

    // Get about status
    try {
      const statusData = await sock.fetchStatus(target)
      if (statusData?.status) {
        status = statusData.status.length > 60? statusData.status.slice(0, 60) + '...' : statusData.status
      }
    } catch {}

    // Check profile picture
    try {
      await sock.profilePictureUrl(target, 'preview')
      hasProfilePic = true
    } catch {}

    // 5. Get country info from number
    let country = 'Unknown'
    if (number.startsWith('1')) country = 'USA/Canada'
    else if (number.startsWith('44')) country = 'United Kingdom'
    else if (number.startsWith('91')) country = 'India'
    else if (number.startsWith('255')) country = 'Tanzania'
    else if (number.startsWith('254')) country = 'Kenya'
    else if (number.startsWith('256')) country = 'Uganda'
    else if (number.startsWith('234')) country = 'Nigeria'
    else if (number.startsWith('27')) country = 'South Africa'

    const infoPayload =
`╭─⌈ 📱 *NUMBER INFO* ⌋
│ Number: +${number}
│ Type: ${accountType}
│ Country: ${country}
│ Name: ${name}
│ About: ${status}
│ Profile Pic: ${hasProfilePic? 'Yes' : 'No/Hidden'}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, {
      text: infoPayload
    }, { quoted: msg })

    // 6. React done
    await sock.sendMessage(from, { react: { text: emoji, key: msg.key } })

  } catch (error) {
    console.error('[NUMINFO ERROR]', error.message)

    let errorMsg = '> Failed to fetch number info'

    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = '> Could not identify target number'
    } else if (error.message === 'NOT_REGISTERED') {
      errorMsg = '> Number not registered on WhatsApp'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}