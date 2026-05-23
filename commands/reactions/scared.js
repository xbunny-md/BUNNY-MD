// commands/reactions/scared.js
export const name = 'scared'
export const alias = ['afraid', 'fear', 'spooky']
export const category = 'Reactions'
export const desc = 'Animated scared reaction with 15 emoji edits on command message'

export default async function scared(sock, { msg, from }) {
  try {
    // 15 scared sequence emojis
    const scaredEmojis = [
      '😱', '👻', '😨', '🫣', '😰',
      '🙈', '💀', '😵', '😱', '👻',
      '😨', '🫣', '😰', '🙈', '💀'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < scaredEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: scaredEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[SCARED ERROR]', error.message)
  }
}