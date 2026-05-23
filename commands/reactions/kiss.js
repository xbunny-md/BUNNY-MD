// commands/reactions/kiss.js
export const name = 'kiss'
export const alias = ['mwah', 'smooch', 'xoxo']
export const category = 'Reactions'
export const desc = 'Animated kiss reaction with 15 emoji edits on command message'

export default async function kiss(sock, { msg, from }) {
  try {
    // 15 kiss sequence emojis
    const kissEmojis = [
      '😘', '💋', '😗', '😙', '💕',
      '😚', '💖', '🥰', '💗', '😽',
      '😘', '💋', '✨', '💞', '😚'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < kissEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: kissEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[KISS ERROR]', error.message)
  }
}