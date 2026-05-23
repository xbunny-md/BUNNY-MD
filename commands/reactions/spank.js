// commands/reactions/spank.js
export const name = 'spank'
export const alias = ['smack', 'whip']
export const category = 'Reactions'
export const desc = 'Animated spank reaction with 15 emoji edits on command message'

export default async function spank(sock, { msg, from }) {
  try {
    // 15 spank sequence emojis
    const spankEmojis = [
      '🍑', '✋', '💥', '😳', '😈',
      '👋', '💢', '🥵', '🍑', '✋',
      '💥', '😳', '😈', '👋', '💢'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < spankEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: spankEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[SPANK ERROR]', error.message)
  }
}