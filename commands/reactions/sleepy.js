// commands/reactions/sleepy.js
export const name = 'sleepy'
export const alias = ['tired', 'sleep', 'drowsy']
export const category = 'Reactions'
export const desc = 'Animated sleepy reaction with 15 emoji edits'

export default async function sleepy(sock, { msg, from }) {
  try {
    // 15 sleepy sequence emojis
    const sleepyEmojis = [
      '😴', '🥱', '😪', '😌', '💤',
      '🌙', '🛏️', '😪', '💤', '🌃',
      '✨', '😴', '💤', '🌜', '😪'
    ]

    // Send initial emoji and store message key
    const sentMsg = await sock.sendMessage(from, { 
      text: sleepyEmojis[0] 
    }, { quoted: msg })

    const messageKey = sentMsg.key

    // Edit message 14 times with 2.5s delay
    for (let i = 1; i < sleepyEmojis.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      await sock.sendMessage(from, {
        text: sleepyEmojis[i],
        edit: messageKey
      })
    }

  } catch (error) {
    console.error('[SLEEPY ERROR]', error.message)
  }
}