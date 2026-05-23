// commands/reactions/glare.js
export const name = 'glare'
export const alias = ['stare', 'sideeye']
export const category = 'Reactions'
export const desc = 'Animated glare reaction with 15 emoji edits on command message'

export default async function glare(sock, { msg, from }) {
  try {
    // 15 glare sequence emojis
    const glareEmojis = [
      '👁️', '😑', '🙄', '😒', '😠',
      '👀', '🗿', '😤', '👁️', '😑',
      '🙄', '😒', '😠', '👀', '🗿'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < glareEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: glareEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[GLARE ERROR]', error.message)
  }
}