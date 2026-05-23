// commands/reactions/sus.js
export const name = 'sus'
export const alias = ['suspicious', 'imposter', 'doubt']
export const category = 'Reactions'
export const desc = 'Animated sus reaction with 15 emoji edits on command message'

export default async function sus(sock, { msg, from }) {
  try {
    // 15 sus sequence emojis
    const susEmojis = [
      '🤨', '😒', '😐', '🧐', '👀',
      '🤔', '🕵️', '😑', '🙄', '🤨',
      '👁️', '🧐', '😒', '🔍', '🤨'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < susEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: susEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[SUS ERROR]', error.message)
  }
}