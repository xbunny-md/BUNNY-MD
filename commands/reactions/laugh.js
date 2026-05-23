// commands/reactions/laugh.js
export const name = 'laugh'
export const alias = ['lol', 'lmao', 'funny']
export const category = 'Reactions'
export const desc = 'Animated laugh reaction with 15 emoji edits'

export default async function laugh(sock, { msg, from }) {
  try {
    // 15 laugh sequence emojis
    const laughEmojis = [
      '😀', '😄', '😆', '🤣', '😂',
      '😹', '💀', '🤪', '😝', '😜',
      '🤭', '😁', '🥴', '🤡', '😂'
    ]

    // Send initial emoji and store message key
    const sentMsg = await sock.sendMessage(from, { 
      text: laughEmojis[0] 
    }, { quoted: msg })

    const messageKey = sentMsg.key

    // Edit message 14 times with 2.5s delay
    for (let i = 1; i < laughEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: laughEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[LAUGH ERROR]', error.message)
  }
}