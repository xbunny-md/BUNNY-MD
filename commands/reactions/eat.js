// commands/reactions/eat.js
export const name = 'eat'
export const alias = ['food', 'hungry', 'yum']
export const category = 'Reactions'
export const desc = 'Animated eat reaction with 15 emoji edits on command message'

export default async function eat(sock, { msg, from }) {
  try {
    // 15 eat sequence emojis
    const eatEmojis = [
      '😋', '🍕', '🍔', '🍟', '🌮',
      '😛', '🍜', '🍣', '😋', '🍗',
      '🥪', '😛', '🍩', '🧁', '😋'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < eatEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: eatEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[EAT ERROR]', error.message)
  }
}