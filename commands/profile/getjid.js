// commands/profile/getjid.js
export const name = 'getjid'
export const alias = ['jid', 'getid', 'whois']
export const category = 'Profile'
export const desc = 'Gets WhatsApp JID of any user or group'

export default async function getjid(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 🆔
    await sock.sendMessage(from, {
      react: { text: '🆔', key: msg.key }
    })

    // 2. Extract target - 5 super ways
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    const mentioned = quoted?.mentionedJid?.[0]
    const replied = quoted?.participant
    const textAfterCmd = args.join(' ').trim()
    const isGroup = from.endsWith('@g.us')

    let target = null
    let targetType = 'User'

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
    // Way 4: Current chat - group
    else if (isGroup) {
      target = from
      targetType = 'Group'
    }
    // Way 5: Sender default
    else {
      target = msg.key.participant || from
    }

    if (!target) throw new Error('NO_TARGET')

    // 3. Validate if it's a user JID
    if (target.endsWith('@s.whatsapp.net')) {
      const [result] = await sock.onWhatsApp(target)
      if (!result?.exists) throw new Error('NOT_REGISTERED')
      target = result.jid
      targetType = result.isBusiness? 'Business' : 'User'
    }

    // 4. Get extra info for user
    let extraInfo = ''
    if (target.endsWith('@s.whatsapp.net')) {
      const number = target.split('@')[0]
      extraInfo = `│ Number: +${number}\n`
      
      try {
        const name = await sock.getName(target)
        if (name && name!== number) {
          extraInfo += `│ Name: ${name}\n`
        }
      } catch {}
    } else if (target.endsWith('@g.us')) {
      try {
        const metadata = await sock.groupMetadata(target)
        extraInfo = `│ Group: ${metadata.subject}\n│ Members: ${metadata.participants.length}\n`
      } catch {}
    }

    const jidPayload = 
`╭─⌈ 🆔 *JID INFO* ⌋
│ Type: ${targetType}
${extraInfo}│ JID: ${target}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      text: jidPayload 
    }, { quoted: msg })

    // 5. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[GETJID ERROR]', error.message)

    let errorMsg = '> Failed to get JID'
    
    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = '> Could not identify target'
    } else if (error.message === 'NOT_REGISTERED') {
      errorMsg = '> Number not registered on WhatsApp'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}