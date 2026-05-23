// commands/fun/friend.js
export const name = 'friend'
export const alias = ['friendship', 'buddy', 'bff', 'friends']
export const category = 'Fun'
export const desc = 'Check friendship compatibility between two people'

export default async function friend(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY FRIEND MODE 👥
    await sock.sendMessage(from, {
      react: { text: '👥', key: msg.key }
    })

    // 2. Get users to check
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

    // If no second user, can't check friendship
    if (!user2) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}friend @user1 @user2\n> Or reply to someone: ${botSettings.prefix}friend\n> Example: ${botSettings.prefix}friend @john @mary`
      }, { quoted: msg })
    }

    // Can't check friendship with yourself
    if (user1 === user2) {
      return await sock.sendMessage(from, {
        text: '> You cannot check friendship with yourself. Tag another person'
      }, { quoted: msg })
    }

    // 3. Generate compatibility percentage
    const percentage = Math.floor(Math.random() * 101)

    // 4. Get friendship level based on score
    let levelMsg = ''
    let levelEmoji = ''
    let description = ''
    let bond = ''

    if (percentage === 100) {
      levelMsg = 'SOUL BROTHERS'
      levelEmoji = '🫂'
      description = 'Inseparable for life'
      bond = 'Ride or die duo'
    } else if (percentage >= 90) {
      levelMsg = 'BEST FRIENDS'
      levelEmoji = '🤝'
      description = 'BFF material'
      bond = 'Always got each other'
    } else if (percentage >= 80) {
      levelMsg = 'CLOSE FRIENDS'
      levelEmoji = '👫'
      description = 'Very tight bond'
      bond = 'Trust each other completely'
    } else if (percentage >= 70) {
      levelMsg = 'GOOD FRIENDS'
      levelEmoji = '😊'
      description = 'Solid friendship'
      bond = 'Hang out regularly'
    } else if (percentage >= 60) {
      levelMsg = 'FRIENDS'
      levelEmoji = '🙂'
      description = 'Decent connection'
      bond = 'Know each other well'
    } else if (percentage >= 50) {
      levelMsg = 'CASUAL FRIENDS'
      levelEmoji = '👋'
      description = 'Friendly vibes'
      bond = 'Occasional chats'
    } else if (percentage >= 40) {
      levelMsg = 'ACQUAINTANCES'
      levelEmoji = '🤷'
      description = 'Barely know each other'
      bond = 'Small talk only'
    } else if (percentage >= 30) {
      levelMsg = 'STRANGERS'
      levelEmoji = '❓'
      description = 'Who are you?'
      bond = 'Never met properly'
    } else if (percentage >= 20) {
      levelMsg = 'AWKWARD'
      levelEmoji = '😬'
      description = 'Weird energy'
      bond = 'Avoid each other'
    } else if (percentage >= 10) {
      levelMsg = 'ENEMIES'
      levelEmoji = '⚔️'
      description = 'Hate each other'
      bond = 'Always fighting'
    } else {
      levelMsg = 'ARCH RIVALS'
      levelEmoji = '💀'
      description = 'Sworn enemies'
      bond = 'War on sight'
    }

    // 5. Friendship meter bar
    const filled = Math.floor(percentage / 10)
    const empty = 10 - filled
    const friendBar = '👥'.repeat(filled) + '⬜'.repeat(empty)

    // 6. Build caption - CLEAN & FRIENDLY
    let caption = `╭─⌈ 👥 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Friendship Meter*
│
│ 👤 *Person 1:* @${user1.split('@')[0]}
│ 👤 *Person 2:* @${user2.split('@')[0]}
│
│ ${levelEmoji} *Score:* ${percentage}%
│ 🏆 *Level:* ${levelMsg}
│
│ ${friendBar}
│
│ 💬 *Status:* ${description}
│ 🤝 *Bond:* ${bond}
│
╰⊷ *Powered By Bunny Tech*`

    // 7. Send result with mentions
    await sock.sendMessage(from, {
      text: caption,
      mentions: [user1, user2]
    }, { quoted: msg })

    // 8. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[FRIEND ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to calculate friendship. Social meter broken'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}