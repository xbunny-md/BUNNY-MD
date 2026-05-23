// commands/reactions/happy.js
export const name = 'happy'
export const alias = ['joy', 'glad', 'excited']
export const category = 'Reactions'
export const desc = 'Animated happy reaction with 15 emoji edits on command message'

export default async function happy(sock, { msg, from }) {
  try {
    // 15 happy sequence emojis
    const happyEmojis = [
      '😀', '😃', '😄', '😁', '😆',
      '🥳', '✨', '🎉', '😊', '🙌',
      '💃', '🕺', '🌟', '🥰', '😄'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < happyEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: happyEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[HAPPY ERROR]', error.message)
  }
}