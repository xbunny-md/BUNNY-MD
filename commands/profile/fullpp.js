// commands/profile/getppfull.js
export const name = 'getppfull'
export const alias = ['fullpp', 'ppfull', 'ppfullsize']
export const category = 'Profile'
export const desc = 'Gets full size profile picture without crop'

export default async function getppfull(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 🔍
    await sock.sendMessage(from, {
      react: { text: '🔍', key: msg.key }
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

    // 4. Get FULL SIZE profile picture - no crop
    let ppUrl
    try {
      ppUrl = await sock.profilePictureUrl(target, 'image') // 'image' = full size, 'preview' = thumbnail
    } catch (error) {
      if (error.output?.statusCode === 404) throw new Error('NO_PP')
      if (error.output?.statusCode === 403) throw new Error('PP_PRIVACY')
      if (error.output?.statusCode === 401) throw new Error('BLOCKED')
      throw new Error('FETCH_FAILED')
    }

    if (!ppUrl) throw new Error('NO_PP')

    const targetNumber = target.split('@')[0]

    const ppPayload = 
`╭─⌈ 🔍 *FULL SIZE PP* ⌋
│ Number: +${targetNumber}
│ Quality: Full Resolution
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      image: { url: ppUrl },
      caption: ppPayload 
    }, { quoted: msg })

    // 5. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[GETPPFULL ERROR]', error.message)

    let errorMsg = '> Failed to fetch full profile picture'
    
    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = '> Could not identify target user'
    } else if (error.message === 'NOT_REGISTERED') {
      errorMsg = '> Number not registered on WhatsApp'
    } else if (error.message === 'NO_PP') {
      errorMsg = '> User has no profile picture'
    } else if (error.message === 'PP_PRIVACY') {
      errorMsg = '> Profile picture hidden due to privacy settings'
    } else if (error.message === 'BLOCKED') {
      errorMsg = '> Cannot access profile. You may be blocked'
    } else if (error.message === 'FETCH_FAILED') {
      errorMsg = '> Server timeout. Failed to fetch profile picture'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}