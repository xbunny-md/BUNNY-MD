// commands/reactions/dance.js
export const name = 'dance'
export const alias = ['vibe', 'groove', 'party']
export const category = 'Reactions'
export const desc = 'Animated dance reaction with 15 emoji edits on command message'

export default async function dance(sock, { msg, from }) {
  try {
    // 15 dance sequence emojis
    const danceEmojis = [
      '🕺', '💃', '🪩', '🎉', '✨',
      '🔥', '🎵', '🎶', '🕺', '💃',
      '🥳', '✨', '🪩', '🎊', '🕺'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < danceEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: danceEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[DANCE ERROR]', error.message)
  }
}