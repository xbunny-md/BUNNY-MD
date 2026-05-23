// commands/fun/hot.js
export const name = 'hot'
export const alias = ['hotness', 'sexy', 'fire', 'attractive']
export const category = 'Fun'
export const desc = 'Check someone\'s hotness level for fun'

export default async function hot(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY FIRE MODE 🔥
    await sock.sendMessage(from, {
      react: { text: '🔥', key: msg.key }
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
    let effect = ''

    if (percentage === 100) {
      ratingMsg = 'GOD TIER HOT'
      ratingEmoji = '🌋'
      description = 'Causing global warming'
      effect = 'Everyone sweating'
    } else if (percentage >= 95) {
      ratingMsg = 'VOLCANIC'
      ratingEmoji = '🌋'
      description = 'Lava hot'
      effect = 'Setting everything on fire'
    } else if (percentage >= 90) {
      ratingMsg = 'BLAZING HOT'
      ratingEmoji = '🔥'
      description = 'Too hot to handle'
      effect = 'Fire department on standby'
    } else if (percentage >= 80) {
      ratingMsg = 'VERY HOT'
      ratingEmoji = '🌡️'
      description = 'Temperature rising'
      effect = 'AC not working'
    } else if (percentage >= 70) {
      ratingMsg = 'HOT'
      ratingEmoji = '☀️'
      description = 'Summer vibes'
      effect = 'Making people thirsty'
    } else if (percentage >= 60) {
      ratingMsg = 'PRETTY HOT'
      ratingEmoji = '✨'
      description = 'Turning heads'
      effect = 'Getting noticed'
    } else if (percentage >= 50) {
      ratingMsg = 'WARM'
      ratingEmoji = '🌤️'
      description = 'Mild heat'
      effect = 'Comfortable temperature'
    } else if (percentage >= 40) {
      ratingMsg = 'LUKEWARM'
      ratingEmoji = '😐'
      description = 'Room temperature'
      effect = 'Nothing special'
    } else if (percentage >= 30) {
      ratingMsg = 'COOL'
      ratingEmoji = '❄️'
      description = 'Chilly vibes'
      effect = 'Need a jacket'
    } else if (percentage >= 20) {
      ratingMsg = 'COLD'
      ratingEmoji = '🧊'
      description = 'Ice cold'
      effect = 'Freezing point'
    } else if (percentage >= 10) {
      ratingMsg = 'FREEZING'
      ratingEmoji = '🥶'
      description = 'Arctic level'
      effect = 'Ice age vibes'
    } else {
      ratingMsg = 'ANTARCTIC'
      ratingEmoji = '🐧'
      description = 'Absolute zero'
      effect = 'Penguins jealous'
    }

    // 5. Get target name
    let targetName = 'You'
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
    }

    // 6. Temperature bar
    const fireCount = Math.floor(percentage / 10)
    const emptyCount = 10 - fireCount
    const tempBar = '🔥'.repeat(fireCount) + '❄️'.repeat(emptyCount)

    // 7. Build caption - CLEAN & HOT
    let caption = `╭─⌈ 🔥 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Hotness Meter*
│
│ 🎯 *Target:* ${targetName}
│
│ ${ratingEmoji} *Score:* ${percentage}%
│ 🏆 *Rank:* ${ratingMsg}
│
│ ${tempBar}
│
│ 💬 *Status:* ${description}
│ 🌡️ *Effect:* ${effect}
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
    console.error('[HOT ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to calculate hotness. Thermometer exploded'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}