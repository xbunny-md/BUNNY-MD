// commands/fun/roast.js
export const name = 'roast'
export const alias = ['burn', 'savage']
export const category = 'Fun'
export const desc = 'Get roasted by the bot with savage comebacks'

export default async function roast(sock, { msg, from, mentionedJid, args }, botSettings) {
  try {
    // 1. React first - BUNNY ROAST MODE 🔥
    await sock.sendMessage(from, {
      react: { text: '🔥', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.key.participant || msg.sender

    // 3. Roast database - 50+ savage roasts
    const roasts = [
      "You're the reason the gene pool needs a lifeguard.",
      "If I wanted to kill myself I'd climb your ego and jump to your IQ.",
      "You're like a cloud. When you disappear, it's a beautiful day.",
      "I'd agree with you but then we'd both be wrong.",
      "You're proof that evolution CAN go in reverse.",
      "I'm not saying you're stupid, you're just unlucky when thinking.",
      "Your secrets are always safe with me. I never even listen when you tell me them.",
      "You bring everyone so much joy... when you leave the room.",
      "I'd explain it to you but I left my crayons at home.",
      "You're the human version of a participation trophy.",
      "If laughter is the best medicine, your face must be curing the world.",
      "You have something on your chin... no, the third one down.",
      "I'd roast you but my mom said I'm not allowed to burn trash.",
      "You're like Monday mornings. Nobody likes you.",
      "Your family tree must be a cactus because everyone on it is a prick.",
      "You're the reason we have warning labels on everything.",
      "If you were any more inbred you'd be a sandwich.",
      "You're like a software update. Nobody wants you but we need you.",
      "I'm jealous of people who don't know you.",
      "You're as useless as the 'ueue' in 'queue'.",
      "You have an entire life to be an idiot. Why not take today off?",
      "You're like a WiFi signal with one bar. Weak and unreliable.",
      "If you were a vegetable, you'd be a cabba-don't.",
      "You're the reason aliens won't visit Earth.",
      "Your birth certificate is an apology letter from the hospital.",
      "You're like a penny. Two-faced and not worth much.",
      "I'd call you a tool but that implies you're actually useful.",
      "You're the human equivalent of a typo.",
      "If ignorance is bliss, you must be the happiest person alive.",
      "You're like expired milk. Nobody wants you around.",
      "Your face makes onions cry.",
      "You're proof that God has a sense of humor.",
      "I'd give you a nasty look but you've already got one.",
      "You're like a cloud of gas. Offensive and everyone wants you gone.",
      "If you were any slower, you'd be going backwards.",
      "You're the reason shampoo has instructions.",
      "You're like a broken pencil. Pointless.",
      "I'd insult you but nature did a better job.",
      "You're as sharp as a marble.",
      "Your brain's running on Windows 95.",
      "You're the poster child for birth control.",
      "If you were a fruit, you'd be a cantelope. Because you cant elope.",
      "You're like a slinky. Not really good for anything but fun to push down stairs.",
      "Your opinion is like a broken clock. Wrong most of the time.",
      "You're the reason they put directions on Pop-Tarts.",
      "If you were any more basic, you'd be a pH of 14.",
      "You're like a chocolate teapot. Completely useless.",
      "I'd tell you to go outside but you'd probably get lost.",
      "You're the human version of a 404 error.",
      "If brains were dynamite, you wouldn't have enough to blow your nose."
    ]

    // 4. Pick random roast
    const randomRoast = roasts[Math.floor(Math.random() * roasts.length)]

    // 5. Get target name
    let targetName = 'You'
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
    }

    // 6. Build caption - CLEAN & SAVAGE
    let caption = `╭─⌈ 🔥 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Roast Session*
│
│ 🎯 *Target:* ${targetName}
│
│ 💬 *Roast:*
│ ${randomRoast}
│
│ 😂 *Burn Level:* 100%
│
╰⊷ *Powered By Bunny Tech*`

    // 7. Send roast with mention
    await sock.sendMessage(from, {
      text: caption,
      mentions: target!== msg.sender? [target] : []
    }, { quoted: msg })

    // 8. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[ROAST ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to deliver roast. Even the bot is speechless'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}