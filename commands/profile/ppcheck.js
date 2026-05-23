// commands/profile/ppcheck.js
export const name = 'ppcheck'
export const alias = ['checkpp', 'haspp', 'ppstatus']
export const category = 'Profile'
export const desc = 'Checks if a number has profile picture or not'

export default async function ppcheck(sock, { msg, from, args }, botSettings) {
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

    // Way 1: Args - number direct (any country)
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

    // 4. Check PP status
    let hasPP = false
    let status = ''
    
    try {
      await sock.profilePictureUrl(target, 'preview')
      hasPP = true
      status = 'HAS PROFILE PICTURE'
    } catch (error) {
      if (error.output?.statusCode === 404) {
        hasPP = false
        status = 'NO PROFILE PICTURE'
      } else if (error.output?.statusCode === 403) {
        hasPP = false
        status = 'PP HIDDEN BY PRIVACY'
      } else if (error.output?.statusCode === 401) {
        throw new Error('BLOCKED')
      } else {
        throw new Error('FETCH_FAILED')
      }
    }

    const checkPayload = 
`╭─⌈ 👁️ *PP CHECK* ⌋
│ Number: +${targetNumber}
│ Status: ${status}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      text: checkPayload 
    }, { quoted: msg })

    // 5. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PPCHECK ERROR]', error.message)

    let errorMsg = '> Failed to check profile picture'
    
    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = '> Could not identify target user'
    } else if (error.message === 'NOT_REGISTERED') {
      errorMsg = '> Number not registered on WhatsApp'
    } else if (error.message === 'BLOCKED') {
      errorMsg = '> Cannot access profile. You may be blocked'
    } else if (error.message === 'FETCH_FAILED') {
      errorMsg = '> Server timeout. Failed to check profile picture'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}