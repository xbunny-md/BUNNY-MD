// commands/reactions/shock.js
export const name = 'shock'
export const alias = ['shocked', 'surprised', 'wow']
export const category = 'Reactions'
export const desc = 'Animated shock reaction with 15 emoji edits on command message'

export default async function shock(sock, { msg, from }) {
  try {
    // 15 shock sequence emojis
    const shockEmojis = [
      '😱', '😳', '😲', '🤯', '😨',
      '😰', '🫢', '😵', '💥', '⚡',
      '😱', '🤯', '😳', '😲', '🫨'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < shockEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: shockEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[SHOCK ERROR]', error.message)
  }
}