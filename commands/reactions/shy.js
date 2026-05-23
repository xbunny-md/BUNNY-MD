// commands/reactions/blush.js
export const name = 'blush'
export const alias = ['shy', 'cute', 'flustered']
export const category = 'Reactions'
export const desc = 'Animated blush reaction with 15 emoji edits on command message'

export default async function blush(sock, { msg, from }) {
  try {
    // 15 blush sequence emojis
    const blushEmojis = [
      '😊', '☺️', '😳', '🥰', '😚',
      '🙈', '💕', '✨', '😌', '🥹',
      '💗', '😇', '🫣', '💖', '😊'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < blushEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: blushEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[BLUSH ERROR]', error.message)
  }
}