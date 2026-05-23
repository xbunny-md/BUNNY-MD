// commands/reactions/proud.js
export const name = 'proud'
export const alias = ['flex', 'based']
export const category = 'Reactions'
export const desc = 'Animated proud reaction with 15 emoji edits on command message'

export default async function proud(sock, { msg, from }) {
  try {
    // 15 proud sequence emojis
    const proudEmojis = [
      '😌', '😎', '💪', '✨', '🔥',
      '👑', '😏', '💯', '🌟', '😌',
      '😎', '💪', '🔥', '👑', '💯'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < proudEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: proudEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[PROUD ERROR]', error.message)
  }
}