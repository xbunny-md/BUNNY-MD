// commands/fun/ship.js
export const name = 'ship'
export const alias = ['couple', 'love', 'match', 'pair']
export const category = 'Fun'
export const desc = 'Ship two people and check their love compatibility'

export default async function ship(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY SHIP MODE 💕
    await sock.sendMessage(from, {
      react: { text: '💕', key: msg.key }
    })

    // 2. Get users to ship
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const sender = msg.key.participant || msg.sender

    let user1 = sender
    let user2 = null

    // Check for mentions or quoted user
    if (mentions.length >= 2) {
      user1 = mentions[0]
      user2 = mentions[1]
    } else if (mentions.length === 1) {
      user2 = mentions[0]
    } else if (quoted) {
      user2 = quoted
    }

    // If no second user, can't ship
    if (!user2) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}ship @user1 @user2\n> Or reply to someone: ${botSettings.prefix}ship\n> Example: ${botSettings.prefix}ship @john @mary`
      }, { quoted: msg })
    }

    // Can't ship same person
    if (user1 === user2) {
      return await sock.sendMessage(from, {
        text: '> You cannot ship someone with themselves. Find another person'
      }, { quoted: msg })
    }

    // 3. Generate compatibility percentage
    const percentage = Math.floor(Math.random() * 101)

    // 4. Get ship name - combine first 3 letters of each
    const name1 = user1.split('@')[0].slice(0, 3)
    const name2 = user2.split('@')[0].slice(-3)
    const shipName = (name1 + name2).toLowerCase()

    // 5. Get compatibility message based on score
    let compatMsg = ''
    let compatEmoji = ''
    let relationship = ''

    if (percentage === 100) {
      compatMsg = 'SOULMATES'
      compatEmoji = '💍'
      relationship = 'Perfect match made in heaven'
    } else if (percentage >= 90) {
      compatMsg = 'TRUE LOVE'
      compatEmoji = '💖'
      relationship = 'Marriage material'
    } else if (percentage >= 80) {
      compatMsg = 'AMAZING COUPLE'
      compatEmoji = '❤️'
      relationship = 'Strong relationship potential'
    } else if (percentage >= 70) {
      compatMsg = 'GREAT MATCH'
      compatEmoji = '💘'
      relationship = 'Could work really well'
    } else if (percentage >= 60) {
      compatMsg = 'GOOD PAIR'
      compatEmoji = '💝'
      relationship = 'Worth giving a shot'
    } else if (percentage >= 50) {
      compatMsg = 'DECENT MATCH'
      compatEmoji = '💗'
      relationship = 'Might work with effort'
    } else if (percentage >= 40) {
      compatMsg = 'RISKY'
      compatEmoji = '💔'
      relationship = 'Probably won\'t last'
    } else if (percentage >= 30) {
      compatMsg = 'BAD IDEA'
      compatEmoji = '💸'
      relationship = 'Toxic potential'
    } else if (percentage >= 20) {
      compatMsg = 'TERRIBLE'
      compatEmoji = '🗑️'
      relationship = 'Stay away from each other'
    } else if (percentage >= 10) {
      compatMsg = 'DISASTER'
      compatEmoji = '☢️'
      relationship = 'Absolute chaos'
    } else {
      compatMsg = 'ENEMIES'
      compatEmoji = '⚔️'
      relationship = 'Better as rivals'
    }

    // 6. Heart meter
    const hearts = Math.floor(percentage / 20)
    const brokenHearts = 5 - hearts
    const heartMeter = '❤️'.repeat(hearts) + '💔'.repeat(brokenHearts)

    // 7. Build caption - CLEAN & SHIPPED
    let caption = `╭─⌈ 💕 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Love Calculator*
│
│ 👤 *Person 1:* @${user1.split('@')[0]}
│ 👤 *Person 2:* @${user2.split('@')[0]}
│
│ 💑 *Ship Name:* ${shipName}
│ ${compatEmoji} *Compatibility:* ${percentage}%
│ 🏆 *Status:* ${compatMsg}
│
│ ${heartMeter}
│
│ 💬 *Result:* ${relationship}
│
╰⊷ *Powered By Bunny Tech*`

    // 8. Send ship result with mentions
    await sock.sendMessage(from, {
      text: caption,
      mentions: [user1, user2]
    }, { quoted: msg })

    // 9. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[SHIP ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to calculate love. Cupid is on vacation'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}