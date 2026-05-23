// commands/reactions/bruh.js
export const name = 'bruh'
export const alias = ['moment', 'fr', 'dead']
export const category = 'Reactions'
export const desc = 'Animated bruh reaction with 15 emoji edits'

export default async function bruh(sock, { msg, from }) {
  try {
    // 15 bruh moment sequence emojis
    const bruhEmojis = [
      '😐', '😑', '🤦', '😒', '💀',
      '🗿', '😮‍💨', '🤷', '😬', '😶',
      '🥴', '🤨', '😪', '🙄', '😑'
    ]

    // Send initial emoji and store message key
    const sentMsg = await sock.sendMessage(from, { 
      text: bruhEmojis[0] 
    }, { quoted: msg })

    const messageKey = sentMsg.key

    // Edit message 14 times with 2.5s delay
    for (let i = 1; i < bruhEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: bruhEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[BRUH ERROR]', error.message)
  }
}