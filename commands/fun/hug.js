// commands/fun/hug.js
export const name = 'hug'
export const alias = ['hugs', 'cuddle', 'embrace', 'comfort']
export const category = 'Fun'
export const desc = 'Give someone a wholesome hug'

export default async function hug(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY HUG MODE 🤗
    await sock.sendMessage(from, {
      react: { text: '🤗', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.key.participant || msg.sender

    // 3. Hug messages database - 30+ wholesome hugs
    const hugs = [
      "gave ${targetName} a warm bear hug",
      "wrapped ${targetName} in a tight hug",
      "gave ${targetName} a comforting hug",
      "squeezed ${targetName} with love",
      "gave ${targetName} a big fluffy hug",
      "embraced ${targetName} warmly",
      "gave ${targetName} a healing hug",
      "cuddled ${targetName} gently",
      "gave ${targetName} a group hug energy",
      "wrapped arms around ${targetName} tightly",
      "gave ${targetName} a wholesome hug",
      "hugged ${targetName} to make them feel better",
      "gave ${targetName} a supportive hug",
      "embraced ${targetName} like family",
      "gave ${targetName} a safe hug",
      "squeezed ${targetName} with care",
      "gave ${targetName} a friendship hug",
      "wrapped ${targetName} in kindness",
      "gave ${targetName} a protective hug",
      "hugged ${targetName} with pure energy",
      "gave ${targetName} a warm embrace",
      "cuddled ${targetName} for comfort",
      "gave ${targetName} a soft hug",
      "embraced ${targetName} with warmth",
      "gave ${targetName} a loving hug",
      "wrapped ${targetName} in positive vibes",
      "gave ${targetName} a caring hug",
      "hugged ${targetName} like a teddy bear",
      "gave ${targetName} a gentle hug",
      "embraced ${targetName} with compassion"
    ]

    // 4. Pick random hug
    const randomHug = hugs[Math.floor(Math.random() * hugs.length)]

    // 5. Get target name
    let targetName = 'themselves'
    let mentionsList = []
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
      mentionsList = [target]
    }

    // 6. Get hugger name
    const huggerName = `@${msg.sender.split('@')[0]}`

    // Replace placeholder in hug message
    const finalHug = randomHug.replace(/\$\{targetName\}/g, targetName)

    // 7. Get random effect
    const effects = ['💕', '💖', '💗', '💓', '💝', '❤️', '🧡', '💛', '💚', '💙']
    const effect = effects[Math.floor(Math.random() * effects.length)]

    // 8. Get warmth level
    const warmth = Math.floor(Math.random() * 51) + 50

    // 9. Build caption - CLEAN & WHOLESOME
    let caption = `╭─⌈ 🤗 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Hug Delivered*
│
│ ${effect} *Hugger:* ${huggerName}
│ 🫂 *Receiver:* ${targetName}
│
│ 📋 *Action:*
│ ${huggerName} ${finalHug}
│
│ 🌡️ *Warmth:* ${warmth}% cozy
│ 💝 *Status:* Comfort Increased
│
╰⊷ *Powered By Bunny Tech*`

    // 10. Send hug with mentions
    await sock.sendMessage(from, {
      text: caption,
      mentions: [msg.sender,...mentionsList]
    }, { quoted: msg })

    // 11. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[HUG ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to hug. Arms too short'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}