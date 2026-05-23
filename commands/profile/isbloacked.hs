// commands/info/ppblock.js
export const name = 'ppblock'
export const alias = ['isblocked', 'didblockme', 'blockcheck']
export const category = 'Info'
export const desc = 'Checks if a user blocked you or you blocked them'

export default async function ppblock(sock, { msg, from, args, sender }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 🚫
    await sock.sendMessage(from, {
      react: { text: '🚫', key: msg.key }
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
    // Way 4: Error - lazima u-specify
    else {
      throw new Error('NO_TARGET')
    }

    if (!target) throw new Error('NO_TARGET')

    // 3. Check if number exists on WhatsApp
    const [result] = await sock.onWhatsApp(target)
    if (!result?.exists) throw new Error('NOT_REGISTERED')

    target = result.jid
    const targetNumber = target.split('@')[0]

    // 4. Check block status - 2 ways
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'
    
    // 4a. Check if YOU blocked them
    const blocklist = await sock.fetchBlocklist()
    const youBlockedThem = blocklist.includes(target)

    // 4b. Check if THEY blocked you - try fetch PP
    let theyBlockedYou = false
    try {
      await sock.profilePictureUrl(target, 'preview')
    } catch (error) {
      if (error.output?.statusCode === 401) {
        theyBlockedYou = true
      }
    }

    // 5. Build status
    let blockStatus = ''
    let emoji = '✅'
    
    if (youBlockedThem && theyBlockedYou) {
      blockStatus = 'MMEBLOCKIANA'
      emoji = '🚫'
    } else if (youBlockedThem) {
      blockStatus = 'UMEMBLOCK'
      emoji = '🔒'
    } else if (theyBlockedYou) {
      blockStatus = 'AMEKUBLOCK'
      emoji = '🔴'
    } else {
      blockStatus = 'HAMJABLOCKIANA'
      emoji = '✅'
    }

    const checkPayload = 
`╭─⌈ 🚫 *BLOCK CHECK* ⌋
│ Number: +${targetNumber}
│ Status: ${blockStatus}
│ You blocked: ${youBlockedThem? 'Yes' : 'No'}
│ They blocked: ${theyBlockedYou? 'Yes' : 'No'}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      text: checkPayload 
    }, { quoted: msg })

    // 6. React done
    await sock.sendMessage(from, { react: { text: emoji, key: msg.key } })

  } catch (error) {
    console.error('[PPBLOCK ERROR]', error.message)

    let errorMsg = '> Failed to check block status'
    
    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = `> Tag, reply, au weka namba. Mfano: ${botSettings.prefix}ppblock 255xxx`
    } else if (error.message === 'NOT_REGISTERED') {
      errorMsg = '> Number not registered on WhatsApp'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}