// commands/fun/bonk.js
export const name = 'bonk'
export const alias = ['horny', 'jail', 'whack', 'bop']
export const category = 'Fun'
export const desc = 'Bonk someone to horny jail'

export default async function bonk(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY BONK MODE 🔨
    await sock.sendMessage(from, {
      react: { text: '🔨', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.key.participant || msg.sender

    // 3. Bonk messages database - 30+ horny jail bonks
    const bonks = [
      "bonked ${targetName} to horny jail",
      "sent ${targetName} straight to horny jail",
      "bonked ${targetName} with the holy bonk hammer",
      "whacked ${targetName} into horny prison",
      "bonked ${targetName} for being too horny",
      "threw ${targetName} into horny jail with no bail",
      "bonked ${targetName} so hard they saw Jesus",
      "sent ${targetName} to the horny dimension",
      "bonked ${targetName} back to their senses",
      "arrested ${targetName} and sent them to horny jail",
      "bonked ${targetName} with maximum force",
      "yeeted ${targetName} into horny jail",
      "bonked ${targetName} for horny crimes",
      "locked ${targetName} in horny jail forever",
      "bonked ${targetName} with the banhammer",
      "sent ${targetName} to maximum security horny jail",
      "bonked ${targetName} out of existence",
      "teleported ${targetName} directly to horny jail",
      "bonked ${targetName} with divine judgment",
      "confiscated ${targetName} and sent to horny jail",
      "bonked ${targetName} for public indecency",
      "dragged ${targetName} to horny jail by force",
      "bonked ${targetName} with 1000 years sentence",
      "sent ${targetName} to horny jail with life sentence",
      "bonked ${targetName} for being suspicious",
      "issued a warrant and bonked ${targetName}",
      "bonked ${targetName} with the power of God",
      "escorted ${targetName} to horny jail",
      "bonked ${targetName} for violating horny laws",
      "permanently banned ${targetName} to horny jail"
    ]

    // 4. Pick random bonk
    const randomBonk = bonks[Math.floor(Math.random() * bonks.length)]

    // 5. Get target name
    let targetName = 'themselves'
    let mentionsList = []
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
      mentionsList = [target]
    }

    // 6. Get bonker name
    const bonkerName = `@${msg.sender.split('@')[0]}`

    // Replace placeholder in bonk message
    const finalBonk = randomBonk.replace(/\$\{targetName\}/g, targetName)

    // 7. Get random effect
    const effects = ['🔨', '💥', '⚡', '🚔', '🚨', '👮', '🔒', '⛓️', '💢', '😡']
    const effect = effects[Math.floor(Math.random() * effects.length)]

    // 8. Get sentence length
    const sentences = ['Life Sentence', '1000 Years', 'Forever', 'No Bail', 'Maximum Security', 'Death Penalty', 'Permanent', 'Until Further Notice']
    const sentence = sentences[Math.floor(Math.random() * sentences.length)]

    // 9. Build caption - CLEAN & BONKY
    let caption = `╭─⌈ 🔨 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Bonk Executed*
│
│ ${effect} *Officer:* ${bonkerName}
│ 🚔 *Criminal:* ${targetName}
│
│ 📋 *Crime Report:*
│ ${bonkerName} ${finalBonk}
│
│ ⛓️ *Sentence:* ${sentence}
│ 🔒 *Status:* Incarcerated
│
╰⊷ *Powered By Bunny Tech*`

    // 10. Send bonk with mentions
    await sock.sendMessage(from, {
      text: caption,
      mentions: [msg.sender,...mentionsList]
    }, { quoted: msg })

    // 11. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[BONK ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to bonk. Hammer broke'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}