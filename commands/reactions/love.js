// commands/reactions/love.js
export const name = 'love'
export const alias = ['heart', 'ily', 'luv']
export const category = 'Reactions'
export const desc = 'Animated love reaction with 15 emoji edits on command message'

export default async function love(sock, { msg, from }) {
  try {
    // 15 love sequence emojis
    const loveEmojis = [
      '❤️', '💕', '🥰', '😍', '💖',
      '💗', '💘', '💝', '💞', '💓',
      '❤️', '🥰', '✨', '💖', '😍'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < loveEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: loveEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[LOVE ERROR]', error.message)
  }
}