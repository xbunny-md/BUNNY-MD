// commands/reactions/yawn.js
export const name = 'yawn'
export const alias = ['sleepy', 'tired', 'boring']
export const category = 'Reactions'
export const desc = 'Animated yawn reaction with 15 emoji edits on command message'

export default async function yawn(sock, { msg, from }) {
  try {
    // 15 yawn sequence emojis
    const yawnEmojis = [
      '🥱', '😪', '😴', '💤', '🫠',
      '😑', '🥴', '😫', '🛌', '😪',
      '🥱', '💤', '😴', '🫠', '😑'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < yawnEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: yawnEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[YAWN ERROR]', error.message)
  }
}