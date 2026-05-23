// commands/reactions/W.js
export const name = 'win'
export const alias = ['w', 'winner', 'dub']
export const category = 'Reactions'
export const desc = 'Animated W reaction with 15 emoji edits on command message'

export default async function W(sock, { msg, from }) {
  try {
    // 15 W sequence emojis
    const WEmojis = [
      '🇼', '🏆', '🔥', '😎', '💯',
      '🎉', '👑', '📈', '✨', '🇼',
      '🏆', '🔥', '😎', '💯', '🎉'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < WEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: WEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[W ERROR]', error.message)
  }
}