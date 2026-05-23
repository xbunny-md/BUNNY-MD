// commands/fun/stupid.js
export const name = 'stupid'
export const alias = ['dumb', 'clown', 'brain', 'iq']
export const category = 'Fun'
export const desc = 'Check someone\'s stupidity percentage for fun'

export default async function stupid(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY CLOWN MODE 🤡
    await sock.sendMessage(from, {
      react: { text: '🤡', key: msg.key }
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
    let brainCells = ''

    if (percentage === 100) {
      ratingMsg = 'BRAIN DEAD'
      ratingEmoji = '💀'
      description = 'No thoughts, head empty'
      brainCells = '0 brain cells detected'
    } else if (percentage >= 90) {
      ratingMsg = 'CERTIFIED CLOWN'
      ratingEmoji = '🤡'
      description = 'Circus called, they want you back'
      brainCells = '1 brain cell remaining'
    } else if (percentage >= 80) {
      ratingMsg = 'ABSOLUTELY CLUELESS'
      ratingEmoji = '🗿'
      description = 'Zero awareness detected'
      brainCells = 'Running on 2% battery'
    } else if (percentage >= 70) {
      ratingMsg = 'VERY DUMB'
      ratingEmoji = '🦧'
      description = 'Monkey smarter than you'
      brainCells = 'Brain went on vacation'
    } else if (percentage >= 60) {
      ratingMsg = 'PRETTY DUMB'
      ratingEmoji = '🤪'
      description = 'Common sense not found'
      brainCells = 'Windows 95 brain'
    } else if (percentage >= 50) {
      ratingMsg = 'AVERAGE DUMB'
      ratingEmoji = '😐'
      description = 'Mid-tier clownery'
      brainCells = 'Brain.exe stopped working'
    } else if (percentage >= 40) {
      ratingMsg = 'KINDA SMART'
      ratingEmoji = '🤓'
      description = 'Few brain cells active'
      brainCells = 'Brain loading 40%'
    } else if (percentage >= 30) {
      ratingMsg = 'SMART'
      ratingEmoji = '🧠'
      description = 'Actually thinking'
      brainCells = 'Brain functioning normally'
    } else if (percentage >= 20) {
      ratingMsg = 'VERY SMART'
      ratingEmoji = '🎓'
      description = 'Big brain energy'
      brainCells = 'Galaxy brain activated'
    } else if (percentage >= 10) {
      ratingMsg = 'GENIUS'
      ratingEmoji = '🧬'
      description = 'Einstein level'
      brainCells = '1000 IQ plays only'
    } else {
      ratingMsg = 'BIG BRAIN'
      ratingEmoji = '👑'
      description = 'Certified intellectual'
      brainCells = 'Ascended beyond humanity'
    }

    // 5. Get target name
    let targetName = 'You'
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
    }

    // 6. Brain cell counter
    const cells = Math.max(0, 100 - percentage)
    const brainBar = '🧠'.repeat(Math.floor(cells / 20)) || '❌'

    // 7. Build caption - CLEAN & DUMB
    let caption = `╭─⌈ 🤡 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Stupidity Meter*
│
│ 🎯 *Target:* ${targetName}
│
│ ${ratingEmoji} *Score:* ${percentage}%
│ 🏆 *Rank:* ${ratingMsg}
│
│ ${brainBar}
│
│ 💬 *Status:* ${description}
│ 🔬 *Diagnosis:* ${brainCells}
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
    console.error('[STUPID ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to calculate stupidity. Brain.exe crashed'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}