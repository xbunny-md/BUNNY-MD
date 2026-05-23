// commands/fun/yeet.js
export const name = 'yeet'
export const alias = ['throw', 'launch', 'space', 'orbit']
export const category = 'Fun'
export const desc = 'Yeet someone into space'

export default async function yeet(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY YEET MODE 🫆
    await sock.sendMessage(from, {
      react: { text: '🫆', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.key.participant || msg.sender

    // 3. Yeet messages database - 30+ space yeets
    const yeets = [
      "yeeted ${targetName} into outer space",
      "launched ${targetName} to Mars",
      "threw ${targetName} into the sun",
      "yeeted ${targetName} to another galaxy",
      "sent ${targetName} orbiting Earth",
      "yeeted ${targetName} past the moon",
      "launched ${targetName} at light speed",
      "threw ${targetName} into a black hole",
      "yeeted ${targetName} to Jupiter",
      "sent ${targetName} flying through the cosmos",
      "yeeted ${targetName} beyond the solar system",
      "launched ${targetName} into the stratosphere",
      "threw ${targetName} to Saturn rings",
      "yeeted ${targetName} into deep space",
      "sent ${targetName} to Pluto",
      "yeeted ${targetName} through a wormhole",
      "launched ${targetName} to Andromeda",
      "threw ${targetName} into asteroid field",
      "yeeted ${targetName} to the edge of universe",
      "sent ${targetName} spinning in space",
      "yeeted ${targetName} to Neptune",
      "launched ${targetName} with NASA rocket",
      "threw ${targetName} past the stars",
      "yeeted ${targetName} into space station",
      "sent ${targetName} floating in zero gravity",
      "yeeted ${targetName} to Venus",
      "launched ${targetName} through space-time",
      "threw ${targetName} into orbit forever",
      "yeeted ${targetName} to Mercury",
      "sent ${targetName} to space without a suit"
    ]

    // 4. Pick random yeet
    const randomYeet = yeets[Math.floor(Math.random() * yeets.length)]

    // 5. Get target name
    let targetName = 'themselves'
    let mentionsList = []
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
      mentionsList = [target]
    }

    // 6. Get yeeter name
    const yeeterName = `@${msg.sender.split('@')[0]}`

    // Replace placeholder in yeet message
    const finalYeet = randomYeet.replace(/\$\{targetName\}/g, targetName)

    // 7. Get random effect
    const effects = ['🚀', '🛸', '🌌', '☄️', '🌠', '🛰️', '👽', '🌍', '✨', '💫']
    const effect = effects[Math.floor(Math.random() * effects.length)]

    // 8. Get distance
    const distances = ['999999 KM', '5 Light Years', 'Infinity', 'Beyond Universe', '2 Galaxies Away', 'Past Mars', 'Near Black Hole', 'Edge of Space']
    const distance = distances[Math.floor(Math.random() * distances.length)]

    // 9. Build caption - CLEAN & SPACEY
    let caption = `╭─⌈ 🫆 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Yeet Launched*
│
│ ${effect} *Astronaut:* ${yeeterName}
│ 👨‍🚀 *Passenger:* ${targetName}
│
│ 📋 *Flight Log:*
│ ${yeeterName} ${finalYeet}
│
│ 📍 *Distance:* ${distance}
│ 🛰️ *Status:* Lost In Space
│
╰⊷ *Powered By Bunny Tech*`

    // 10. Send yeet with mentions
    await sock.sendMessage(from, {
      text: caption,
      mentions: [msg.sender,...mentionsList]
    }, { quoted: msg })

    // 11. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[YEET ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to yeet. Rocket broke'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}