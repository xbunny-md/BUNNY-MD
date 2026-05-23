// commands/reactions/wave.js
export const name = 'hello'
export const alias = ['wave', 'hi', 'bye']
export const category = 'Reactions'
export const desc = 'Animated wave reaction with 15 emoji edits on command message'

export default async function wave(sock, { msg, from }) {
  try {
    // 15 wave sequence emojis
    const waveEmojis = [
      '👋', '😊', '🙋', '✋', '👋',
      '😄', '🙋‍♂️', '🙋‍♀️', '👋', '😊',
      '✋', '🙋', '👋', '😄', '🙋‍♂️'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < waveEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: waveEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[WAVE ERROR]', error.message)
  }
}