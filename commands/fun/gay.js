// commands/fun/howgay.js
export const name = 'howgay'
export const alias = ['gay', 'rainbow', 'pride']
export const category = 'Fun'
export const desc = 'Check someone\'s rainbow percentage for fun'

export default async function howgay(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY RAINBOW MODE 🌈
    await sock.sendMessage(from, {
      react: { text: '🌈', key: msg.key }
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

    if (percentage === 100) {
      ratingMsg = 'RAINBOW KING'
      ratingEmoji = '👑'
      description = 'Certified fabulous'
    } else if (percentage >= 90) {
      ratingMsg = 'SUPER FABULOUS'
      ratingEmoji = '✨'
      description = 'Living your best life'
    } else if (percentage >= 80) {
      ratingMsg = 'VERY FABULOUS'
      ratingEmoji = '💅'
      description = 'Slaying daily'
    } else if (percentage >= 70) {
      ratingMsg = 'FABULOUS'
      ratingEmoji = '🌟'
      description = 'Serving looks'
    } else if (percentage >= 60) {
      ratingMsg = 'PRETTY FABULOUS'
      ratingEmoji = '💫'
      description = 'Getting there'
    } else if (percentage >= 50) {
      ratingMsg = 'HALF FABULOUS'
      ratingEmoji = '🎭'
      description = 'Bi-iconic'
    } else if (percentage >= 40) {
      ratingMsg = 'KIND OF FABULOUS'
      ratingEmoji = '🎨'
      description = 'Exploring vibes'
    } else if (percentage >= 30) {
      ratingMsg = 'A LITTLE FABULOUS'
      ratingEmoji = '🎪'
      description = 'Hidden potential'
    } else if (percentage >= 20) {
      ratingMsg = 'BARELY FABULOUS'
      ratingEmoji = '🎯'
      description = 'Still figuring out'
    } else if (percentage >= 10) {
      ratingMsg = 'NOT VERY FABULOUS'
      ratingEmoji = '📦'
      description = 'Pretty straight'
    } else {
      ratingMsg = 'STRAIGHT'
      ratingEmoji = '📏'
      description = 'Completely straight'
    }

    // 5. Get target name
    let targetName = 'You'
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
    }

    // 6. Rainbow progress bar
    const colors = ['🟥', '🟧', '🟨', '🟩', '🟦', '🟪']
    const filledBars = Math.floor(percentage / 17)
    const rainbowBar = colors.slice(0, filledBars + 1).join('')

    // 7. Build caption - CLEAN & FABULOUS
    let caption = `╭─⌈ 🌈 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Rainbow Meter*
│
│ 🎯 *Target:* ${targetName}
│
│ ${ratingEmoji} *Score:* ${percentage}%
│ 🏆 *Rank:* ${ratingMsg}
│
│ ${rainbowBar}
│
│ 💬 *Status:* ${description}
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
    console.error('[HOWGAY ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to calculate percentage. Rainbow machine is broken'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}