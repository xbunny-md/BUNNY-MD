// commands/profile/getpp.js
export const name = 'getpp'
export const alias = ['pp', 'getdp', 'dp']
export const category = 'Profile'
export const desc = 'Gets profile picture of any number worldwide'

export default async function getpp(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first
    await sock.sendMessage(from, {
      react: { text: '🤘', key: msg.key }
    })

    // 2. Extract target - 4 ways
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    const mentioned = quoted?.mentionedJid?.[0]
    const replied = quoted?.participant
    const textAfterCmd = args.join(' ').trim()

    let targetJid = null

    // Way 1: Args - number direct
    if (textAfterCmd) {
      const cleanNum = textAfterCmd.replace(/[^0-9]/g, '')
      if (cleanNum.length >= 7 && cleanNum.length <= 15) {
        targetJid = cleanNum + '@s.whatsapp.net'
      } else {
        throw new Error('INVALID_NUMBER')
      }
    }
    // Way 2: Mentioned user
    else if (mentioned) {
      targetJid = mentioned
    }
    // Way 3: Replied user
    else if (replied) {
      targetJid = replied
    }
    // Way 4: Sender default
    else {
      targetJid = msg.key.participant || msg.key.remoteJid
    }

    if (!targetJid) throw new Error('NO_TARGET')

    // 3. FIX: Check if number exists and get NEW JID - solves LID issue
    const [result] = await sock.onWhatsApp(targetJid)
    if (!result?.exists) throw new Error('NOT_REGISTERED')

    // IMPORTANT: Use the JID returned by onWhatsApp - this is the new/correct one
    const correctJid = result.jid

    // 4. Get profile picture using correct JID
    let ppUrl
    try {
      ppUrl = await sock.profilePictureUrl(correctJid, 'image')
    } catch (error) {
      if (error.output?.statusCode === 404) throw new Error('NO_PP')
      if (error.output?.statusCode === 403) throw new Error('PP_PRIVACY')
      if (error.output?.statusCode === 401) throw new Error('BLOCKED')
      throw new Error('FETCH_FAILED')
    }

    if (!ppUrl) throw new Error('NO_PP')

    // Extract number from correct JID
    const targetNumber = correctJid.split('@')[0]

    const ppPayload = 
`╭─⌈ 🖼️ *PROFILE PICTURE* ⌋
│ Number: +${targetNumber}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    // FIX: Use correct JID for mentions if needed
    await sock.sendMessage(from, { 
      image: { url: ppUrl },
      caption: ppPayload,
      mentions: [correctJid]
    }, { quoted: msg })

    // 5. React done
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[GETPP ERROR]', error.message)

    let errorMsg = '> Failed to fetch profile picture'

    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number\n> Example: 14155552671'
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