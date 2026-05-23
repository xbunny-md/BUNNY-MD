// commands/reactions/pat.js
export const name = 'pat'
export const alias = ['headpat', 'comfort', 'pet']
export const category = 'Reactions'
export const desc = 'Animated pat reaction with 15 emoji edits on command message'

export default async function pat(sock, { msg, from }) {
  try {
    // 15 pat sequence emojis
    const patEmojis = [
      '🫱', '😊', '🤚', '🥰', '✋',
      '😌', '💕', '🫳', '☺️', '✨',
      '🫱', '😊', '🤚', '💗', '🥹'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < patEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: patEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[PAT ERROR]', error.message)
  }
}