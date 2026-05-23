// commands/fun/simp.js
export const name = 'simp'
export const alias = ['simpmeter', 'crush', 'lover', 'fan']
export const category = 'Fun'
export const desc = 'Check someone\'s simp percentage for fun'

export default async function simp(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY SIMP MODE 😍
    await sock.sendMessage(from, {
      react: { text: '😍', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.key.participant || msg.sender

    // 3. Generate random percentage
    const percentage = Math.floor(Math.random() * 101)

    // 4. Get rating message based on score
    let ratingMsg = ''
    let ratingEmoji = ''
    let description = ''
    let behavior = ''

    if (percentage === 100) {
      ratingMsg = 'SIMP LORD'
      ratingEmoji = '👑'
      description = 'Would die for them'
      behavior = 'Donating kidneys for attention'
    } else if (percentage >= 90) {
      ratingMsg = 'CERTIFIED SIMP'
      ratingEmoji = '💸'
      description = 'Wallet always open'
      behavior = 'Buying everything they want'
    } else if (percentage >= 80) {
      ratingMsg = 'MAJOR SIMP'
      ratingEmoji = '😍'
      description = 'Heavily obsessed'
      behavior = 'Stalking all socials 24/7'
    } else if (percentage >= 70) {
      ratingMsg = 'SIMP'
      ratingEmoji = '🥺'
      description = 'Doing too much'
      behavior = 'Writing paragraphs daily'
    } else if (percentage >= 60) {
      ratingMsg = 'KIND OF SIMP'
      ratingEmoji = '😳'
      description = 'Catching feelings'
      behavior = 'Liking old posts'
    } else if (percentage >= 50) {
      ratingMsg = 'BORDERLINE SIMP'
      ratingEmoji = '🤔'
      description = 'Danger zone'
      behavior = 'Thinking about them often'
    } else if (percentage >= 40) {
      ratingMsg = 'ALMOST SIMP'
      ratingEmoji = '😅'
      description = 'Resisting urges'
      behavior = 'Trying to play it cool'
    } else if (percentage >= 30) {
      ratingMsg = 'CASUAL'
      ratingEmoji = '😎'
      description = 'Playing hard to get'
      behavior = 'Normal conversations'
    } else if (percentage >= 20) {
      ratingMsg = 'CHILL'
      ratingEmoji = '🧊'
      description = 'Ice cold'
      behavior = 'Zero effort given'
    } else if (percentage >= 10) {
      ratingMsg = 'ANTI-SIMP'
      ratingEmoji = '❄️'
      description = 'Heart of stone'
      behavior = 'Leaving on read'
    } else {
      ratingMsg = 'SIMP HUNTER'
      ratingEmoji = '🏹'
      description = 'Mocks all simps'
      behavior = 'Roasting simps for fun'
    }

    // 5. Get target name
    let targetName = 'You'
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
    }

    // 6. Simp meter bar
    const hearts = Math.floor(percentage / 10)
    const emptyHearts = 10 - hearts
    const simpBar = '💖'.repeat(hearts) + '🤍'.repeat(emptyHearts)

    // 7. Build caption - CLEAN & SIMP
    let caption = `╭─⌈ 😍 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Simp Meter*
│
│ 🎯 *Target:* ${targetName}
│
│ ${ratingEmoji} *Score:* ${percentage}%
│ 🏆 *Rank:* ${ratingMsg}
│
│ ${simpBar}
│
│ 💬 *Status:* ${description}
│ 📱 *Behavior:* ${behavior}
│
╰⊷ *Powered By Bunny Tech*`

    // 8. Send result with mention
    await sock.sendMessage(from, {
      text: caption,
      mentions: target!== msg.sender? [target] : []
    }, { quoted: msg })

    // 9. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[SIMP ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to calculate simp level. Heart monitor broken'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}