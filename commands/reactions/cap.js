// commands/reactions/cap.js
export const name = 'cap'
export const alias = ['lie', 'false', 'fake']
export const category = 'Reactions'
export const desc = 'Animated cap reaction with 15 emoji edits on command message'

export default async function cap(sock, { msg, from }) {
  try {
    // 15 cap sequence emojis
    const capEmojis = [
      '🧢', '❌', '🤥', '😒', '🚫',
      '🙅', '😤', '🙄', '🧢', '❌',
      '🤥', '😑', '🚫', '🙅', '🧢'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < capEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: capEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[CAP ERROR]', error.message)
  }
}