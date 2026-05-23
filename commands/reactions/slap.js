// commands/reactions/slap.js
export const name = 'rslap'
export const alias = ['smack', 'hit', 'kofi']
export const category = 'Reactions'
export const desc = 'Animated slap reaction with 15 emoji edits'

export default async function slap(sock, { msg, from }) {
  try {
    // 15 slap sequence emojis
    const slapEmojis = [
      '👋', '✋', '💥', '😵', '🤚',
      '💢', '😠', '👋', '💫', '😫',
      '✨', '💥', '😵‍💫', '🤛', '💢'
    ]

    // Send initial emoji and store message key
    const sentMsg = await sock.sendMessage(from, { 
      text: slapEmojis[0] 
    }, { quoted: msg })

    const messageKey = sentMsg.key

    // Edit message 14 times with 2.5s delay
    for (let i = 1; i < slapEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: slapEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[SLAP ERROR]', error.message)
  }
}