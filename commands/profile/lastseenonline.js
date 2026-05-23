// commands/profile/lastseenprivacy.js
export const name = 'lastseenprivacy'
export const alias = ['lsprivacy', 'seenpriv', 'whocansee']
export const category = 'Profile'
export const desc = 'Checks who can see a user last seen & online status'

export default async function lastseenprivacy(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 👁️
    await sock.sendMessage(from, {
      react: { text: '👁️', key: msg.key }
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

    // 4. Check lastseen privacy by fetching presence
    let privacyStatus = ''
    let lastSeen = 'Hidden'
    let emoji = '🔒'

    try {
      // Subscribe to presence first
      await sock.presenceSubscribe(target)
      
      // Wait kidogo then check
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const presence = await sock.fetchPresence(target)
      
      if (presence?.lastSeen) {
        const date = new Date(presence.lastSeen)
        lastSeen = date.toLocaleString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit', 
          minute: '2-digit' 
        })
        privacyStatus = isBot? 'EVERYONE' : 'YOU CAN SEE'
        emoji = '✅'
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

    // 5. Check online status pia
    let onlineStatus = 'Offline'
    try {
      const presence = await sock.fetchPresence(target)
      if (presence?.lastKnownPresence === 'composing' || 
          presence?.lastKnownPresence === 'recording' ||
          presence?.lastKnownPresence === 'available') {
        onlineStatus = 'Online'
      }
    } catch {
      onlineStatus = 'Hidden'
    }

    const checkPayload = 
`╭─⌈ 👁️ *LASTSEEN PRIVACY* ⌋
│ Number: +${targetNumber}
│ Privacy: ${privacyStatus}
│ Last Seen: ${lastSeen}
│ Current: ${onlineStatus}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      text: checkPayload 
    }, { quoted: msg })

    // 6. React done
    await sock.sendMessage(from, { react: { text: emoji, key: msg.key } })

  } catch (error) {
    console.error('[LASTSEENPRIVACY ERROR]', error.message)

    let errorMsg = '> Failed to check last seen privacy'
    
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