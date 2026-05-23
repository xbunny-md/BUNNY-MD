// commands/reactions/cry.js
export const name = 'cry'
export const alias = ['sob', 'weep', 'tears']
export const category = 'Reactions'
export const desc = 'Animated cry reaction with 15 emoji edits on command message'

export default async function cry(sock, { msg, from }) {
  try {
    // 15 cry sequence emojis
    const cryEmojis = [
      '😢', '😭', '🥺', '💧', '😿',
      '😥', '💔', '😞', '😭', '🌧️',
      '😢', '🥹', '😿', '💧', '😭'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < cryEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: cryEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[CRY ERROR]', error.message)
  }
}