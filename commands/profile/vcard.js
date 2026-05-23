// commands/profile/vcard.js
export const name = 'vcard'
export const alias = ['contact', 'savecontact', 'vcardget']
export const category = 'Profile'
export const desc = 'Generates and sends a vCard contact file for any user'

export default async function vcard(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 👤
    await sock.sendMessage(from, {
      react: { text: '👤', key: msg.key }
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

    // 4. Get contact details
    let contactName = number
    let about = ''
    let isBusiness = result.isBusiness || false

    try {
      const name = await sock.getName(target)
      if (name && name!== number) {
        contactName = name
      }
    } catch {}

    try {
      const status = await sock.fetchStatus(target)
      if (status?.status) {
        about = status.status
      }
    } catch {}

    // 5. Generate vCard format
    const vcardData = `BEGIN:VCARD
VERSION:3.0
FN:${contactName}
TEL;type=CELL;type=VOICE;waid=${number}:+${number}
${about? `NOTE:${about.replace(/\n/g, '\\n')}` : ''}
${isBusiness? 'X-WA-BIZ-NAME:' + contactName : ''}
END:VCARD`

    // 6. Send vCard contact
    await sock.sendMessage(from, {
      contacts: {
        displayName: contactName,
        contacts: [{ vcard: vcardData }]
      }
    }, { quoted: msg })

    // 7. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[VCARD ERROR]', error.message)

    let errorMsg = '> Failed to generate vCard'

    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = '> Could not identify target contact'
    } else if (error.message === 'NOT_REGISTERED') {
      errorMsg = '> Number not registered on WhatsApp'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}