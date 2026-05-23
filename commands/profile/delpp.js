// commands/profile/delpp.js
export const name = 'delpp'
export const alias = ['deletepp', 'removepp', 'delpic']
export const category = 'Profile'
export const desc = 'Deletes bot profile picture'

export default async function delpp(sock, { msg, from }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 🗑️
    await sock.sendMessage(from, {
      react: { text: '🗑️', key: msg.key }
    })

    // 2. Delete bot profile picture
    await sock.removeProfilePicture(sock.user.id)

    // 3. Short confirm
    const confirmPayload = 
`╭─⌈ 🗑️ *PP DELETED* ⌋
│ Bot profile picture removed
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      text: confirmPayload 
    }, { quoted: msg })

    // 4. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[DELPP ERROR]', error.message)

    let errorMsg = '> Failed to delete profile picture'
    
    if (error.message.includes('404')) {
      errorMsg = '> Bot has no profile picture to delete'
    } else if (error.message.includes('500')) {
      errorMsg = '> WhatsApp server error. Try again'
    } else if (error.message.includes('403')) {
      errorMsg = '> No permission to delete profile picture'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}