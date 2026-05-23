// commands/fun/cuddle.js
export const name = 'cuddle'
export const alias = ['snuggle', 'spoon', 'cozy', 'warm']
export const category = 'Fun'
export const desc = 'Give someone soft cuddles'

export default async function cuddle(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY CUDDLE MODE 🧸
    await sock.sendMessage(from, {
      react: { text: '🧸', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.key.participant || msg.sender

    // 3. Cuddle messages database - 30+ soft cuddles
    const cuddles = [
      "cuddled ${targetName} under a warm blanket",
      "snuggled ${targetName} like a teddy bear",
      "spooned ${targetName} gently",
      "cuddled ${targetName} by the fireplace",
      "wrapped ${targetName} in soft cuddles",
      "cuddled ${targetName} on a rainy day",
      "snuggled ${targetName} with hot chocolate",
      "cuddled ${targetName} until they fell asleep",
      "held ${targetName} in warm cuddles",
      "cuddled ${targetName} like a pillow",
      "snuggled ${targetName} on the couch",
      "cuddled ${targetName} with fluffy blankets",
      "spooned ${targetName} all night",
      "cuddled ${targetName} during a movie",
      "wrapped ${targetName} in cozy cuddles",
      "cuddled ${targetName} like a cloud",
      "snuggled ${targetName} on a cold night",
      "cuddled ${targetName} with plushies",
      "held ${targetName} in gentle cuddles",
      "cuddled ${targetName} until morning",
      "snuggled ${targetName} in bed",
      "cuddled ${targetName} like precious treasure",
      "wrapped ${targetName} in soft hugs",
      "cuddled ${targetName} under the stars",
      "snuggled ${targetName} with purring",
      "cuddled ${targetName} like a baby",
      "held ${targetName} in peaceful cuddles",
      "cuddled ${targetName} on lazy Sunday",
      "snuggled ${targetName} with warm tea",
      "cuddled ${targetName} until they smiled"
    ]

    // 4. Pick random cuddle
    const randomCuddle = cuddles[Math.floor(Math.random() * cuddles.length)]

    // 5. Get target name
    let targetName = 'themselves'
    let mentionsList = []
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
      mentionsList = [target]
    }

    // 6. Get cuddler name
    const cuddlerName = `@${msg.sender.split('@')[0]}`

    // Replace placeholder in cuddle message
    const finalCuddle = randomCuddle.replace(/\$\{targetName\}/g, targetName)

    // 7. Get random effect
    const effects = ['🧸', '💤', '🛌', '🫂', '💕', '🌙', '☁️', '🤍', '✨', '🥱']
    const effect = effects[Math.floor(Math.random() * effects.length)]

    // 8. Get coziness level
    const cozy = Math.floor(Math.random() * 51) + 50

    // 9. Build caption - CLEAN & COZY
    let caption = `╭─⌈ 🧸 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Cuddle Session*
│
│ ${effect} *Cuddler:* ${cuddlerName}
│ 😴 *Receiver:* ${targetName}
│
│ 📋 *Action:*
│ ${cuddlerName} ${finalCuddle}
│
│ 🌡️ *Cozy Level:* ${cozy}% warm
│ 💤 *Status:* Peacefully Snuggled
│
╰⊷ *Powered By Bunny Tech*`

    // 10. Send cuddle with mentions
    await sock.sendMessage(from, {
      text: caption,
      mentions: [msg.sender,...mentionsList]
    }, { quoted: msg })

    // 11. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[CUDDLE ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to cuddle. Too cold'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}