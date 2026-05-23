// commands/reactions/bored.js
export const name = 'bored'
export const alias = ['boring', 'meh', 'tired']
export const category = 'Reactions'
export const desc = 'Animated bored reaction with 15 emoji edits on command message'

export default async function bored(sock, { msg, from }) {
  try {
    // 15 bored sequence emojis
    const boredEmojis = [
      '😑', '😐', '😒', '🥱', '😴',
      '🫠', '😪', '🙄', '😩', '🫤',
      '😑', '🥱', '💤', '😒', '😐'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < boredEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: boredEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[BORED ERROR]', error.message)
  }
}