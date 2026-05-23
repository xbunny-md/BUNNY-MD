// commands/profile/aboutprivacy.js
export const name = 'aboutprivacy'
export const alias = ['bioprivacy', 'aboutpriv', 'statuspriv']
export const category = 'Profile'
export const desc = 'Checks who can see a user About/Bio status'

export default async function aboutprivacy(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 📝
    await sock.sendMessage(from, {
      react: { text: '📝', key: msg.key }
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
    const targetNumber = target.split('@')[0]
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'
    const isBot = target === botNumber

    // 4. Check About/Bio privacy
    let privacyStatus = ''
    let aboutText = 'Hidden'
    let emoji = '🔒'

    try {
      const status = await sock.fetchStatus(target)
      
      if (status?.status) {
        aboutText = status.status
        privacyStatus = isBot? 'EVERYONE' : 'YOU CAN SEE'
        emoji = '✅'
      } else if (status?.status === null) {
        aboutText = 'No About Set'
        privacyStatus = 'EMPTY'
        emoji = '📭'
      } else {
        privacyStatus = 'NOBODY / HIDDEN'
        emoji = '👁️'
      }

    } catch (error) {
      if (error.output?.statusCode === 403) {
        privacyStatus = 'CONTACTS ONLY'
        emoji = '👥'
      } else if (error.output?.statusCode === 401) {
        privacyStatus = 'BLOCKED YOU'
        emoji = '🚫'
      } else {
        privacyStatus = 'NOBODY / HIDDEN'
        emoji = '👁️'
      }
    }

    const checkPayload = 
`╭─⌈ 📝 *ABOUT PRIVACY* ⌋
│ Number: +${targetNumber}
│ Privacy: ${privacyStatus}
│ About: ${aboutText.length > 50? aboutText.slice(0, 50) + '...' : aboutText}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      text: checkPayload 
    }, { quoted: msg })

    // 5. React done
    await sock.sendMessage(from, { react: { text: emoji, key: msg.key } })

  } catch (error) {
    console.error('[ABOUTPRIVACY ERROR]', error.message)

    let errorMsg = '> Failed to check about privacy'
    
    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = '> Could not identify target user'
    } else if (error.message === 'NOT_REGISTERED') {
      errorMsg = '> Number not registered on WhatsApp'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}