// commands/profile/ppgrab.js
export const name = 'ppgrab'
export const alias = ['getpp', 'stealpp', 'downloadpp']
export const category = 'Profile'
export const desc = 'Downloads and sends full HD profile picture of any user'

export default async function ppgrab(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 🖼️
    await sock.sendMessage(from, {
      react: { text: '🖼️', key: msg.key }
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

    // 4. Get profile picture URL - HD first, then normal
    let ppUrl = null
    let quality = 'Standard'

    try {
      // Try HD first
      ppUrl = await sock.profilePictureUrl(target, 'image')
      quality = 'HD'
    } catch {
      try {
        // Fallback to preview
        ppUrl = await sock.profilePictureUrl(target, 'preview')
        quality = 'Preview'
      } catch {
        throw new Error('NO_PP')
      }
    }

    // 5. Get contact name
    let contactName = number
    try {
      const name = await sock.getName(target)
      if (name && name!== number) {
        contactName = name
      }
    } catch {}

    // 6. Send profile picture
    await sock.sendMessage(from, {
      image: { url: ppUrl },
      caption: `╭─⌈ 🖼️ *PROFILE PICTURE* ⌋
│ Name: ${contactName}
│ Number: +${number}
│ Quality: ${quality}
╰⊷ *Powered by Bunny Tech*`
    }, { quoted: msg })

    // 7. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PPGRAB ERROR]', error.message)

    let errorMsg = '> Failed to grab profile picture'

    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = '> Could not identify target user'
    } else if (error.message === 'NOT_REGISTERED') {
      errorMsg = '> Number not registered on WhatsApp'
    } else if (error.message === 'NO_PP') {
      errorMsg = '> User has no profile picture or privacy is restricted'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}