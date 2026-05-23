// commands/fun/rate.js
export const name = 'rate'
export const alias = ['rating', 'score', 'percent', 'nipime']
export const category = 'Fun'
export const desc = 'Rate yourself or someone else from 0-100%'

export default async function rate(sock, { msg, from, mentionedJid, args }, botSettings) {
  try {
    // 1. React first - BUNNY RATING MODE 💯
    await sock.sendMessage(from, {
      react: { text: '💯', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.sender

    // 3. Get what to rate from args
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ').trim()

    let rateSubject = textAfterCmd || 'you'

    // Clean subject if it's a mention
    if (rateSubject.includes('@')) {
      rateSubject = 'this person'
    }

    // 4. Generate random percentage
    const percentage = Math.floor(Math.random() * 101)

    // 5. Get rating message based on score
    let ratingMsg = ''
    let ratingEmoji = ''

    if (percentage === 100) {
      ratingMsg = 'PERFECT SCORE'
      ratingEmoji = '👑'
    } else if (percentage >= 90) {
      ratingMsg = 'LEGENDARY'
      ratingEmoji = '🔥'
    } else if (percentage >= 80) {
      ratingMsg = 'EXCELLENT'
      ratingEmoji = '⭐'
    } else if (percentage >= 70) {
      ratingMsg = 'GREAT'
      ratingEmoji = '✨'
    } else if (percentage >= 60) {
      ratingMsg = 'GOOD'
      ratingEmoji = '👍'
    } else if (percentage >= 50) {
      ratingMsg = 'AVERAGE'
      ratingEmoji = '😐'
    } else if (percentage >= 40) {
      ratingMsg = 'BELOW AVERAGE'
      ratingEmoji = '📉'
    } else if (percentage >= 30) {
      ratingMsg = 'POOR'
      ratingEmoji = '👎'
    } else if (percentage >= 20) {
      ratingMsg = 'BAD'
      ratingEmoji = '💀'
    } else if (percentage >= 10) {
      ratingMsg = 'TERRIBLE'
      ratingEmoji = '🗑️'
    } else if (percentage > 0) {
      ratingMsg = 'DISASTER'
      ratingEmoji = '💩'
    } else {
      ratingMsg = 'ZERO'
      ratingEmoji = '❌'
    }

    // 6. Get target name
    let targetName = 'You'
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
    }

    // 7. Progress bar
    const filledBars = Math.floor(percentage / 10)
    const emptyBars = 10 - filledBars
    const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars)

    // 8. Build caption - CLEAN & RATED
    let caption = `╭─⌈ 💯 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Rating System*
│
│ 🎯 *Target:* ${targetName}
│ 📊 *Rating:* ${rateSubject}
│
│ ${ratingEmoji} *Score:* ${percentage}%
│ 🏆 *Grade:* ${ratingMsg}
│
│ ${progressBar}
│
│ 📈 *Status:* ${percentage >= 50? 'PASSED' : 'FAILED'}
│
╰⊷ *Powered By Bunny Tech*`

    // 9. Send rating with mention
    await sock.sendMessage(from, {
      text: caption,
      mentions: target!== msg.sender? [target] : []
    }, { quoted: msg })

    // 10. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[RATE ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to calculate rating. Calculator is broken'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}