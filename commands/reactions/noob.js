// commands/reactions/noob.js
export const name = 'noob'
export const alias = ['newbie', 'beginner', 'lol']
export const category = 'Reactions'
export const desc = 'Animated noob reaction with 15 emoji edits on command message'

export default async function noob(sock, { msg, from }) {
  try {
    // 15 noob sequence emojis
    const noobEmojis = [
      '🤓', '🤡', '😂', '🤣', '💀',
      '🙄', '🤦', '😆', '🤪', '👶',
      '🤓', '😂', '🤡', '💀', '🤣'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < noobEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: noobEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[NOOB ERROR]', error.message)
  }
}