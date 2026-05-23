// commands/fun/slap.js
export const name = 'slap'
export const alias = ['hit', 'smack', 'punch', 'bonk']
export const category = 'Fun'
export const desc = 'Slap someone anime style for fun'

export default async function slap(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY SLAP MODE 👋
    await sock.sendMessage(from, {
      react: { text: '👋', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.key.participant || msg.sender

    // 3. Slap messages database - 35+ anime style slaps
    const slaps = [
      "slapped ${targetName} so hard they flew to another dimension",
      "delivered a 1000x damage critical slap to ${targetName}",
      "used Ultra Instinct slap on ${targetName}",
      "slapped ${targetName} with the force of 1000 suns",
      "sent ${targetName} flying with a thunder slap",
      "bonked ${targetName} into next week",
      "slapped ${targetName} back to the stone age",
      "used Rasengan slap on ${targetName}",
      "slapped ${targetName} so hard their ancestors felt it",
      "delivered a reality-breaking slap to ${targetName}",
      "slapped ${targetName} with a giant anime hand",
      "used One Punch slap on ${targetName}",
      "slapped ${targetName} into the shadow realm",
      "smacked ${targetName} with god-level power",
      "slapped ${targetName} so hard they became a meme",
      "used Kamehameha slap on ${targetName}",
      "slapped ${targetName} through multiple timelines",
      "delivered a nuclear slap to ${targetName}",
      "slapped ${targetName} with the power of friendship",
      "used Jojo slap on ${targetName} - ORA ORA ORA",
      "slapped ${targetName} so hard their phone broke",
      "delivered a legendary slap to ${targetName}",
      "slapped ${targetName} with 9999 damage",
      "used Bankai slap on ${targetName}",
      "slapped ${targetName} into orbit",
      "delivered a multiverse slap to ${targetName}",
      "slapped ${targetName} with anime physics",
      "used Gear 5 slap on ${targetName}",
      "slapped ${targetName} so hard they respawned",
      "delivered a slap that broke the sound barrier to ${targetName}",
      "slapped ${targetName} with the weight of their sins",
      "used Domain Expansion slap on ${targetName}",
      "slapped ${targetName} back to character select",
      "delivered a slap powered by rage to ${targetName}",
      "slapped ${targetName} with a chair like WWE"
    ]

    // 4. Pick random slap
    const randomSlap = slaps[Math.floor(Math.random() * slaps.length)]

    // 5. Get target name
    let targetName = 'themselves'
    let mentionsList = []
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
      mentionsList = [target]
    }

    // 6. Get slapper name
    const slapperName = `@${msg.sender.split('@')[0]}`

    // Replace placeholder in slap message
    const finalSlap = randomSlap.replace(/\$\{targetName\}/g, targetName)

    // 7. Get random effect
    const effects = ['💥', '⚡', '💢', '🔥', '✨', '💫', '🌟', '💢', '🔴', '💢']
    const effect = effects[Math.floor(Math.random() * effects.length)]

    // 8. Get damage number
    const damage = Math.floor(Math.random() * 9999) + 100

    // 9. Build caption - CLEAN & SLAPPY
    let caption = `╭─⌈ 👋 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Slap Attack*
│
│ ${effect} *Attacker:* ${slapperName}
│ 😵 *Victim:* ${targetName}
│
│ 📋 *Action:*
│ ${slapperName} ${finalSlap}
│
│ 💥 *Damage:* -${damage} HP
│ 🏥 *Status:* Critical Hit
│
╰⊷ *Powered By Bunny Tech*`

    // 10. Send slap with mentions
    await sock.sendMessage(from, {
      text: caption,
      mentions: [msg.sender,...mentionsList]
    }, { quoted: msg })

    // 11. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[SLAP ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to slap. Hand got tired'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}