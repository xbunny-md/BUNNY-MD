// commands/reactions/jealous.js
export const name = 'jealous'
export const alias = ['envy', 'salty']
export const category = 'Reactions'
export const desc = 'Animated jealous reaction with 15 emoji edits on command message'

export default async function jealous(sock, { msg, from }) {
  try {
    // 15 jealous sequence emojis
    const jealousEmojis = [
      '😒', '👀', '💚', '😤', '😑',
      '🙄', '💔', '😠', '👁️', '😒',
      '💚', '😤', '🙄', '💔', '👀'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < jealousEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: jealousEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[JEALOUS ERROR]', error.message)
  }
}