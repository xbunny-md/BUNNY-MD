// commands/reactions/sad.js
export const name = 'sad'
export const alias = ['depressed', 'unhappy', 'down']
export const category = 'Reactions'
export const desc = 'Animated sad reaction with 15 emoji edits'

export default async function sad(sock, { msg, from }) {
  try {
    // 15 sad sequence emojis
    const sadEmojis = [
      '😔', '😟', '😢', '😭', '😞',
      '🥺', '💔', '😿', '😥', '😖',
      '😩', '🫤', '😓', '🥀', '😔'
    ]

    // Send initial emoji and store message key
    const sentMsg = await sock.sendMessage(from, { 
      text: sadEmojis[0] 
    }, { quoted: msg })

    const messageKey = sentMsg.key

    // Edit message 14 times with 2.5s delay
    for (let i = 1; i < sadEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: sadEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[SAD ERROR]', error.message)
  }
}