// commands/profile/ppremove.js
export const name = 'ppremove'
export const alias = ['delpp', 'removepp', 'clearpp']
export const category = 'Owner'
export const desc = 'Removes your bot profile picture'

export default async function ppremove(sock, { msg, from, sender }, botSettings) {
  try {
    // 1. OWNER CHECK - BOT NUMBER ONLY
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'
    if (sender!== botNumber) {
      return await sock.sendMessage(from, { 
        text: '> Access Denied. Only the bot owner can remove bot PP.' 
      }, { quoted: msg })
    }

    // 2. React first - BUNNY STYLE 🗑️
    await sock.sendMessage(from, {
      react: { text: '🗑️', key: msg.key }
    })

    // 3. Check if bot has PP first
    try {
      await sock.profilePictureUrl(botNumber, 'preview')
    } catch (error) {
      if (error.output?.statusCode === 404) {
        throw new Error('NO_PP')
      } else {
        throw error
      }
    }

    // 4. Remove PP - send empty
    await sock.removeProfilePicture(botNumber)

    const successPayload = 
`╭─⌈ 🗑️ *PP REMOVED* ⌋
│ Bot profile picture cleared
│ Status: Success
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      text: successPayload 
    }, { quoted: msg })

    // 5. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PPREMOVE ERROR]', error.message)

    let errorMsg = '> Failed to remove profile picture'
    
    if (error.message === 'NO_PP') {
      errorMsg = '> Bot has no profile picture to remove'
    } else if (error.output?.statusCode === 401) {
      errorMsg = '> Unauthorized. Cannot modify profile'
    } else if (error.output?.statusCode === 500) {
      errorMsg = '> Server error. Try again later'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}