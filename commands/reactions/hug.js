// commands/reactions/hug.js
export const name = 'hug'
export const alias = ['cuddle', 'embrace', 'comfort']
export const category = 'Reactions'
export const desc = 'Animated hug reaction with 15 emoji edits'

export default async function hug(sock, { msg, from }) {
  try {
    // 15 hug sequence emojis
    const hugEmojis = [
      '🤗', '🫂', '💕', '🥰', '😊',
      '💞', '🤍', '🫶', '💗', '😌',
      '✨', '💝', '🥹', '🫂', '🤗'
    ]

    // Send initial emoji and store message key
    const sentMsg = await sock.sendMessage(from, { 
      text: hugEmojis[0] 
    }, { quoted: msg })

    const messageKey = sentMsg.key

    // Edit message 14 times with 2.5s delay
    for (let i = 1; i < hugEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: hugEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[HUG ERROR]', error.message)
  }
}