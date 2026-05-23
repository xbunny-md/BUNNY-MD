// commands/reactions/wink.js
export const name = 'wink'
export const alias = ['flirt', 'smirk', 'cheeky']
export const category = 'Reactions'
export const desc = 'Animated wink reaction with 15 emoji edits on command message'

export default async function wink(sock, { msg, from }) {
  try {
    // 15 wink sequence emojis
    const winkEmojis = [
      '😉', '😏', '😜', '🤭', '✨',
      '😋', '😎', '😉', '💫', '😌',
      '🥴', '😏', '✨', '😜', '😉'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < winkEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: winkEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[WINK ERROR]', error.message)
  }
}