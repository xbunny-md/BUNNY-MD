// commands/info/ppprivacy.js
export const name = 'ppprivacy'
export const alias = ['pppriv', 'ppwho', 'whocansee']
export const category = 'Profile'
export const desc = 'Checks who can see a user profile picture'

export default async function ppprivacy(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 🔐
    await sock.sendMessage(from, {
      react: { text: '🔐', key: msg.key }
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

    // 4. Check PP privacy by trying to fetch
    let privacyStatus = ''
    let canSee = false
    let emoji = '🔒'

    try {
      await sock.profilePictureUrl(target, 'preview')
      privacyStatus = isBot? 'EVERYONE' : 'YOU CAN SEE'
      canSee = true
      emoji = '✅'
    } catch (error) {
      const statusCode = error.output?.statusCode
      
      if (statusCode === 404) {
        privacyStatus = 'NO PROFILE PICTURE'
        emoji = '❌'
      } else if (statusCode === 403) {
        privacyStatus = 'CONTACTS ONLY'
        emoji = '👥'
      } else if (statusCode === 401) {
        privacyStatus = 'BLOCKED YOU'
        emoji = '🚫'
      } else {
        throw new Error('FETCH_FAILED')
      }
    }

    // 5. Check if you are in their contacts - extra check
    let contactStatus = 'UNKNOWN'
    if (canSee &&!isBot) {
      try {
        const status = await sock.fetchStatus(target)
        contactStatus = status? 'IN CONTACTS' : 'NOT IN CONTACTS'
      } catch {
        contactStatus = 'UNKNOWN'
      }
    }

    const checkPayload = 
`╭─⌈ 🔐 *PP PRIVACY* ⌋
│ Number: +${targetNumber}
│ PP Status: ${privacyStatus}
│ Contact: ${contactStatus}
│ Can See: ${canSee? 'Yes' : 'No'}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      text: checkPayload 
    }, { quoted: msg })

    // 6. React done
    await sock.sendMessage(from, { react: { text: emoji, key: msg.key } })

  } catch (error) {
    console.error('[PPPRIVACY ERROR]', error.message)

    let errorMsg = '> Failed to check PP privacy'
    
    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = '> Could not identify target user'
    } else if (error.message === 'NOT_REGISTERED') {
      errorMsg = '> Number not registered on WhatsApp'
    } else if (error.message === 'FETCH_FAILED') {
      errorMsg = '> Server timeout. Failed to check privacy'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}