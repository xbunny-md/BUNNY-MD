// commands/reactions/twerk.js
export const name = 'twerk'
export const alias = ['booty', 'shake']
export const category = 'Reactions'
export const desc = 'Animated twerk reaction with 15 emoji edits on command message'

export default async function twerk(sock, { msg, from }) {
  try {
    // 15 twerk sequence emojis
    const twerkEmojis = [
      '🍑', '🕺', '💃', '🔥', '😏',
      '💦', '🥵', '🍑', '🕺', '💃',
      '🔥', '😏', '💦', '🥵', '🍑'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < twerkEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: twerkEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[TWERK ERROR]', error.message)
  }
}