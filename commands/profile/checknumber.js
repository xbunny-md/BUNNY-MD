// commands/profile/checknumber.js
export const name = 'checknumber'
export const alias = ['checknum', 'isregistered', 'iswhatsapp']
export const category = 'Profile'
export const desc = 'Checks if a phone number is registered on WhatsApp'

export default async function checknumber(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 📞
    await sock.sendMessage(from, {
      react: { text: '📞', key: msg.key }
    })

    // 2. Extract number from args
    const textAfterCmd = args.join(' ').trim()

    if (!textAfterCmd) {
      throw new Error('NO_NUMBER')
    }

    // 3. Clean and validate number
    const cleanNum = textAfterCmd.replace(/[^0-9]/g, '')
    if (cleanNum.length < 7 || cleanNum.length > 15) {
      throw new Error('INVALID_NUMBER')
    }

    const targetJid = cleanNum + '@s.whatsapp.net'

    // 4. Check WhatsApp registration
    const [result] = await sock.onWhatsApp(targetJid)

    let status = 'Not Registered'
    let emoji = '❌'
    let accountType = 'N/A'
    let businessName = 'N/A'

    if (result?.exists) {
      status = 'Registered on WhatsApp'
      emoji = '✅'
      accountType = result.isBusiness? 'Business Account' : 'Personal Account'

      // Get business name if available
      if (result.isBusiness) {
        try {
          const bizProfile = await sock.getBusinessProfile(result.jid)
          businessName = bizProfile?.businessName || 'Business Name Hidden'
        } catch {
          businessName = 'Business Name Hidden'
        }
      }
    }

    // 5. Get country from number
    let country = 'Unknown'
    if (cleanNum.startsWith('1')) country = 'USA/Canada'
    else if (cleanNum.startsWith('44')) country = 'United Kingdom'
    else if (cleanNum.startsWith('91')) country = 'India'
    else if (cleanNum.startsWith('255')) country = 'Tanzania'
    else if (cleanNum.startsWith('254')) country = 'Kenya'
    else if (cleanNum.startsWith('256')) country = 'Uganda'
    else if (cleanNum.startsWith('234')) country = 'Nigeria'
    else if (cleanNum.startsWith('27')) country = 'South Africa'

    const checkPayload =
`╭─⌈ 📞 *NUMBER CHECK* ⌋
│ Number: +${cleanNum}
│ Country: ${country}
│ Status: ${status}
│ Type: ${accountType}
${result?.isBusiness? `│ Business: ${businessName}\n` : ''}╰⊷ *Powered by Bunny Tech*`

    await sock.sendMessage(from, {
      text: checkPayload
    }, { quoted: msg })

    // 6. React done
    await sock.sendMessage(from, { react: { text: emoji, key: msg.key } })

  } catch (error) {
    console.error('[CHECKNUMBER ERROR]', error.message)

    let errorMsg = '> Failed to check number'

    if (error.message === 'NO_NUMBER') {
      errorMsg = `> Provide a phone number\n> Usage: ${botSettings.prefix}checknumber 255712345678`
    } else if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use countrycode + number'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}