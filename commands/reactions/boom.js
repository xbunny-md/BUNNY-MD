// commands/reactions/explode.js
export const name = 'explode'
export const alias = ['boom', 'explosion', 'kaboom']
export const category = 'Reactions'
export const desc = 'Animated explode reaction with 15 emoji edits on command message'

export default async function explode(sock, { msg, from }) {
  try {
    // 15 explode sequence emojis
    const explodeEmojis = [
      '💣', '🔥', '💥', '💨', '☁️',
      '😵', '🤯', '💀', '🔥', '💣',
      '💥', '💨', '☁️', '😵', '🤯'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < explodeEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: explodeEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[EXPLODE ERROR]', error.message)
  }
}