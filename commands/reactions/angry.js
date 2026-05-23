// commands/reactions/angry.js
export const name = 'angry'
export const alias = ['mad', 'furious', 'rage']
export const category = 'Reactions'
export const desc = 'Animated angry reaction with 15 emoji edits'

export default async function angry(sock, { msg, from }) {
  try {
    // 1. Array of 15 angry emojis - escalating intensity
    const angryEmojis = [
      '😡', '😠', '😤', '🤬', '👿', 
      '💢', '😾', '😫', '😣', '😖', 
      '🔥', '💢', '🤯', '😠', '😡'
    ]

    // 2. Send first emoji and get message key
    const sentMsg = await sock.sendMessage(from, { 
      text: angryEmojis[0] 
    }, { quoted: msg })

    const messageKey = sentMsg.key

    // 3. Loop through remaining 14 emojis and edit
    for (let i = 1; i < angryEmojis.length; i++) {
      // Fixed 2.5 second delay for antiban
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      // Edit message to next emoji
      await sock.sendMessage(from, {
        text: angryEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[ANGRY ERROR]', error.message)
    // Silent fail - no error message sent
  }
}