// commands/profile/jiddecode.js
export const name = 'jiddecode'
export const alias = ['decodejid', 'parsejid', 'jidinfo']
export const category = 'Profile'
export const desc = 'Decodes WhatsApp JID to get number and type info'

export default async function jiddecode(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 🔍
    await sock.sendMessage(from, {
      react: { text: '🔍', key: msg.key }
    })

    // 2. Get JID from args or quoted
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ').trim()
    const inputJID = textAfterCmd || quotedText.trim()

    if (!inputJID) {
      throw new Error('NO_JID')
    }

    // 3. Validate JID format
    const validFormats = ['@s.whatsapp.net', '@g.us', '@lid', '@broadcast']
    const isValid = validFormats.some(format => inputJID.endsWith(format))
    
    if (!isValid) {
      throw new Error('INVALID_JID')
    }

    // 4. Parse JID
    const [id, server] = inputJID.split('@')
    let jidType = 'Unknown'
    let number = 'N/A'
    let extraInfo = ''

    if (server === 's.whatsapp.net') {
      jidType = 'User Account'
      number = `+${id}`
      
      // Check if registered and get name
      try {
        const [result] = await sock.onWhatsApp(inputJID)
        if (result?.exists) {
          jidType = result.isBusiness ? 'Business Account' : 'User Account'
          const name = await sock.getName(inputJID)
          if (name && name !== id) {
            extraInfo = `│ Name: ${name}\n`
          }
        } else {
          jidType = 'Unregistered Number'
        }
      } catch {}
      
    } else if (server === 'g.us') {
      jidType = 'Group Chat'
      number = id
      
      // Get group info
      try {
        const metadata = await sock.groupMetadata(inputJID)
        extraInfo = `│ Group: ${metadata.subject}\n│ Members: ${metadata.participants.length}\n│ Owner: ${metadata.owner ? '+' + metadata.owner.split('@')[0] : 'Hidden'}\n`
      } catch {
        extraInfo = `│ Group: Access Denied\n`
      }
      
    } else if (server === 'lid') {
      jidType = 'Linked Device ID'
      number = id
      
    } else if (server === 'broadcast') {
      jidType = 'Broadcast List'
      number = id
    }

    const decodePayload = 
`╭─⌈ 🔍 *JID DECODED* ⌋
│ Type: ${jidType}
│ ID: ${number}
${extraInfo}│ Raw JID: ${inputJID}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      text: decodePayload 
    }, { quoted: msg })

    // 5. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[JIDDECODE ERROR]', error.message)

    let errorMsg = '> Failed to decode JID'
    
    if (error.message === 'NO_JID') {
      errorMsg = `> Provide a JID to decode\n> Usage: ${botSettings.prefix}jiddecode 255xxx@s.whatsapp.net`
    } else if (error.message === 'INVALID_JID') {
      errorMsg = '> Invalid JID format\n> Must end with @s.whatsapp.net, @g.us, @lid, or @broadcast'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}