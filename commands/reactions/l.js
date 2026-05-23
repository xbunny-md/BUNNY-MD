// commands/reactions/L.js
export const name = 'loser'
export const alias = ['loss', 'l', 'rip']
export const category = 'Reactions'
export const desc = 'Animated L reaction with 15 emoji edits on command message'

export default async function L(sock, { msg, from }) {
  try {
    // 15 L sequence emojis
    const LEmojis = [
      '🇱', '💀', '😂', '🤣', '📉',
      '🪦', '🤡', '😭', '💀', '🇱',
      '😂', '🤣', '📉', '🪦', '🤡'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < LEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: LEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[L ERROR]', error.message)
  }
}