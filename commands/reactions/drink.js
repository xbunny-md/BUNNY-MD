// commands/reactions/drink.js
export const name = 'drink'
export const alias = ['sip', 'thirsty']
export const category = 'Reactions'
export const desc = 'Animated drink reaction with 15 emoji edits on command message'

export default async function drink(sock, { msg, from }) {
  try {
    // 15 drink sequence emojis
    const drinkEmojis = [
      '🥤', '😋', '🧃', '🥛', '☕',
      '😛', '🧋', '🍹', '😋', '🥤',
      '😛', '🧃', '☕', '🍹', '😋'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < drinkEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: drinkEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[DRINK ERROR]', error.message)
  }
}