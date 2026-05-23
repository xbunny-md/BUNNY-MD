// commands/fun/kiss.js
export const name = 'kiss'
export const alias = ['smooch', 'muah', 'mwah', 'kisses']
export const category = 'Fun'
export const desc = 'Give someone a romantic kiss'

export default async function kiss(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY KISS MODE 💋
    await sock.sendMessage(from, {
      react: { text: '💋', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.key.participant || msg.sender

    // 3. Kiss messages database - 30+ romantic kisses
    const kisses = [
      "gave ${targetName} a sweet kiss on the cheek",
      "planted a gentle kiss on ${targetName}",
      "gave ${targetName} a passionate kiss",
      "smooched ${targetName} lovingly",
      "kissed ${targetName} under the moonlight",
      "gave ${targetName} a surprise kiss",
      "planted a soft kiss on ${targetName}",
      "kissed ${targetName} with affection",
      "gave ${targetName} a romantic kiss",
      "smooched ${targetName} tenderly",
      "kissed ${targetName} on the forehead",
      "gave ${targetName} a butterfly kiss",
      "planted a loving kiss on ${targetName}",
      "kissed ${targetName} like in the movies",
      "gave ${targetName} a French kiss",
      "smooched ${targetName} passionately",
      "kissed ${targetName} with fireworks",
      "gave ${targetName} a magical kiss",
      "planted a warm kiss on ${targetName}",
      "kissed ${targetName} like Romeo and Juliet",
      "gave ${targetName} a dreamy kiss",
      "smooched ${targetName} with butterflies",
      "kissed ${targetName} like a fairytale",
      "gave ${targetName} a slow romantic kiss",
      "planted a kiss on ${targetName} that made sparks fly",
      "kissed ${targetName} with rose petals falling",
      "gave ${targetName} a kiss full of love",
      "smooched ${targetName} under the stars",
      "kissed ${targetName} like true love",
      "gave ${targetName} a kiss to remember"
    ]

    // 4. Pick random kiss
    const randomKiss = kisses[Math.floor(Math.random() * kisses.length)]

    // 5. Get target name
    let targetName = 'themselves'
    let mentionsList = []
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
      mentionsList = [target]
    }

    // 6. Get kisser name
    const kisserName = `@${msg.sender.split('@')[0]}`

    // Replace placeholder in kiss message
    const finalKiss = randomKiss.replace(/\$\{targetName\}/g, targetName)

    // 7. Get random effect
    const effects = ['💋', '💕', '😘', '💖', '😍', '🥰', '💗', '💓', '❤️', '🌹']
    const effect = effects[Math.floor(Math.random() * effects.length)]

    // 8. Get romance level
    const romance = Math.floor(Math.random() * 51) + 50

    // 9. Build caption - CLEAN & ROMANTIC
    let caption = `╭─⌈ 💋 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Kiss Delivered*
│
│ ${effect} *Kisser:* ${kisserName}
│ 😚 *Receiver:* ${targetName}
│
│ 📋 *Action:*
│ ${kisserName} ${finalKiss}
│
│ 💞 *Romance:* ${romance}% sweet
│ ✨ *Status:* Love In The Air
│
╰⊷ *Powered By Bunny Tech*`

    // 10. Send kiss with mentions
    await sock.sendMessage(from, {
      text: caption,
      mentions: [msg.sender,...mentionsList]
    }, { quoted: msg })

    // 11. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[KISS ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to kiss. Lips got shy'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}