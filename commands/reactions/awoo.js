// commands/reactions/awoo.js
export const name = 'awoo'
export const alias = ['wolf', 'howl']
export const category = 'Reactions'
export const desc = 'Animated awoo reaction with 15 emoji edits on command message'

export default async function awoo(sock, { msg, from }) {
  try {
    // 15 awoo sequence emojis
    const awooEmojis = [
      '🐺', '🌙', '🌕', '🗣️', '🎵',
      '😮', '🐾', '🌙', '🐺', '🌕',
      '🗣️', '🎵', '😮', '🐾', '🌙'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < awooEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: awooEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[AWOO ERROR]', error.message)
  }
}