// commands/reactions/kick.js
export const name = 'kick'
export const alias = ['boot', 'punt']
export const category = 'Reactions'
export const desc = 'Animated kick reaction with 15 emoji edits on command message'

export default async function kick(sock, { msg, from }) {
  try {
    // 15 kick sequence emojis
    const kickEmojis = [
      '🦵', '💥', '😠', '👟', '💢',
      '🥾', '💨', '😡', '🦵', '💥',
      '😤', '👟', '💢', '🥾', '🦵'
    ]

    // Use the command message key for editing
    const messageKey = msg.key

    // Edit the original command message 15 times with 2.5s delay
    for (let i = 0; i < kickEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: kickEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[KICK ERROR]', error.message)
  }
}