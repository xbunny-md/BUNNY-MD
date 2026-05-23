// commands/fun/dare.js
export const name = 'dare'
export const alias = ['challenge', 'task', 'dareme']
export const category = 'Fun'
export const desc = 'Get random dares and challenges for groups'

export default async function dare(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY DARE MODE 😈
    await sock.sendMessage(from, {
      react: { text: '😈', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.sender

    // 3. Dare database - 50+ wild dares
    const dares = [
      "Send your last photo in gallery to the group. No cheating.",
      "Change your name to 'I love ${botSettings.botname || 'Bunny'}' for 24 hours.",
      "Text your crush and say 'I had a dream about you last night'.",
      "Do 20 pushups right now and send proof.",
      "Call your mom and tell her you're getting married tomorrow.",
      "Let the group choose your profile picture for 1 week.",
      "Sing the chorus of your favorite song and send a voice note.",
      "Post 'I am single' on your status for 1 hour.",
      "Text your ex 'I miss you' and screenshot the reply.",
      "Do your best dance move for 30 seconds on video.",
      "Let someone in the group send a text to anyone in your contacts.",
      "Eat a spoonful of hot sauce or ketchup straight.",
      "Speak in an accent for the next 10 messages.",
      "Post an embarrassing childhood photo of yourself.",
      "Call a random number and sing Happy Birthday to them.",
      "Do your best impression of a celebrity and send video.",
      "Let the group spam your status with comments for 5 minutes.",
      "Wear your clothes backwards for the rest of the day and send proof.",
      "Text your boss 'I quit' then immediately say it was a dare.",
      "Do 50 jumping jacks and send video proof.",
      "Post your screen time stats to the group right now.",
      "Let someone post anything they want on your status.",
      "Drink a glass of water mixed with salt.",
      "Call your sibling and confess to something you didn't do.",
      "Do your makeup blindfolded and send the result.",
      "Send your most used emoji to the group 20 times.",
      "Let the group decide what you eat for your next meal.",
      "Post 'I believe in aliens' on all your social media.",
      "Do the worm dance move and send video proof.",
      "Text your dad 'I need bail money' and wait 5 minutes.",
      "Balance a book on your head and walk across the room on video.",
      "Send your most embarrassing selfie to the group.",
      "Let someone draw on your face with a marker and send pic.",
      "Speak only in rhymes for the next 15 minutes.",
      "Do your best animal impression and send video.",
      "Post your browser history from today to the group.",
      "Call your best friend and tell them you ate their food.",
      "Do 10 squats while holding a heavy book on video.",
      "Let the group choose your outfit tomorrow and send proof.",
      "Eat a raw onion slice like an apple on video.",
      "Text your teacher 'You're my favorite' if you still have their number.",
      "Do your best evil laugh and send a voice note.",
      "Post 'I'm joining the circus' on your status for 2 hours.",
      "Let someone tickle you for 30 seconds on video.",
      "Speak like a robot for the next 10 messages.",
      "Do a handstand against the wall and send proof.",
      "Send the 15th photo in your gallery to the group.",
      "Call a pizza place and order 100 pizzas as a joke.",
      "Do your best runway walk and send video.",
      "Let the group rename your phone contacts for 1 day."
    ]

    // 4. Pick random dare
    const randomDare = dares[Math.floor(Math.random() * dares.length)]

    // 5. Get target name
    let targetName = 'You'
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
    }

    // 6. Determine difficulty
    const difficulty = ['Easy', 'Medium', 'Hard', 'Extreme'][Math.floor(Math.random() * 4)]
    const difficultyEmoji = {
      'Easy': '🟢',
      'Medium': '🟡',
      'Hard': '🟠',
      'Extreme': '🔴'
    }

    // 7. Build caption - CLEAN & WILD
    let caption = `╭─⌈ 😈 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Dare Challenge*
│
│ 🎯 *Target:* ${targetName}
│ ${difficultyEmoji[difficulty]} *Difficulty:* ${difficulty}
│
│ 📋 *Your Dare:*
│ ${randomDare}
│
│ ⏰ *Time Limit:* 10 minutes
│ 📸 *Proof Required:* Yes
│
╰⊷ *Powered By Bunny Tech*`

    // 8. Send dare with mention
    await sock.sendMessage(from, {
      text: caption,
      mentions: target!== msg.sender? [target] : []
    }, { quoted: msg })

    // 9. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[DARE ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to generate dare. The devil is busy'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}