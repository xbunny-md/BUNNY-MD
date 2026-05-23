// commands/fun/pat.js
export const name = 'pat'
export const alias = ['headpat', 'pet', 'goodboy', 'goodgirl']
export const category = 'Fun'
export const desc = 'Give someone wholesome headpats'

export default async function pat(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY PAT MODE 🫳
    await sock.sendMessage(from, {
      react: { text: '🫳', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.key.participant || msg.sender

    // 3. Pat messages database - 30+ wholesome headpats
    const pats = [
      "gave ${targetName} gentle headpats",
      "patted ${targetName} softly on the head",
      "gave ${targetName} comforting headpats",
      "patted ${targetName} like a good child",
      "gave ${targetName} warm headpats",
      "patted ${targetName} with care",
      "gave ${targetName} wholesome headpats",
      "patted ${targetName} to make them smile",
      "gave ${targetName} soothing headpats",
      "patted ${targetName} like they deserve",
      "gave ${targetName} fluffy headpats",
      "patted ${targetName} with affection",
      "gave ${targetName} cute headpats",
      "patted ${targetName} until they purred",
      "gave ${targetName} rewarding headpats",
      "patted ${targetName} like a proud parent",
      "gave ${targetName} soft headpats",
      "patted ${targetName} for being good",
      "gave ${targetName} encouraging headpats",
      "patted ${targetName} with love",
      "gave ${targetName} healing headpats",
      "patted ${targetName} until they felt better",
      "gave ${targetName} sweet headpats",
      "patted ${targetName} like a treasure",
      "gave ${targetName} peaceful headpats",
      "patted ${targetName} with pride",
      "gave ${targetName} precious headpats",
      "patted ${targetName} like they did well",
      "gave ${targetName} blessed headpats",
      "patted ${targetName} until they giggled"
    ]

    // 4. Pick random pat
    const randomPat = pats[Math.floor(Math.random() * pats.length)]

    // 5. Get target name
    let targetName = 'themselves'
    let mentionsList = []
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
      mentionsList = [target]
    }

    // 6. Get patter name
    const patterName = `@${msg.sender.split('@')[0]}`

    // Replace placeholder in pat message
    const finalPat = randomPat.replace(/\$\{targetName\}/g, targetName)

    // 7. Get random effect
    const effects = ['🥰', '😊', '😇', '✨', '💖', '🌸', '☺️', '😌', '💕', '🌟']
    const effect = effects[Math.floor(Math.random() * effects.length)]

    // 8. Get comfort level
    const comfort = Math.floor(Math.random() * 51) + 50

    // 9. Build caption - CLEAN & WHOLESOME
    let caption = `╭─⌈ 🫳 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Headpats Delivered*
│
│ ${effect} *Patter:* ${patterName}
│ 🥺 *Receiver:* ${targetName}
│
│ 📋 *Action:*
│ ${patterName} ${finalPat}
│
│ 💝 *Comfort:* ${comfort}% wholesome
│ 🌈 *Status:* Mood Boosted
│
╰⊷ *Powered By Bunny Tech*`

    // 10. Send pat with mentions
    await sock.sendMessage(from, {
      text: caption,
      mentions: [msg.sender,...mentionsList]
    }, { quoted: msg })

    // 11. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PAT ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to pat. Hand got tired'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}