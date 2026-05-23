// commands/fun/kill.js
export const name = 'kill'
export const alias = ['murder', 'slay', 'eliminate', 'finish']
export const category = 'Fun'
export const desc = 'Fake kill someone for fun'

export default async function kill(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY KILL MODE 💀
    await sock.sendMessage(from, {
      react: { text: '💀', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.key.participant || msg.sender

    // 3. Kill methods database - 40+ funny ways
    const kills = [
      "threw ${targetName} into a volcano",
      "dropped a piano on ${targetName}",
      "fed ${targetName} to sharks",
      "launched ${targetName} into space without a suit",
      "pushed ${targetName} off a cliff",
      "drowned ${targetName} in a pool of lava",
      "electrocuted ${targetName} with 1 million volts",
      "teleported ${targetName} into the sun",
      "crushed ${targetName} with a meteor",
      "sent ${targetName} to the shadow realm",
      "deleted ${targetName} from existence",
      "turned ${targetName} into dust with Thanos snap",
      "fed ${targetName} to a T-Rex",
      "banished ${targetName} to the backrooms",
      "yeeted ${targetName} into a black hole",
      "used ${targetName} as a human sacrifice",
      "locked ${targetName} in a freezer forever",
      "dropped ${targetName} from 30,000 feet",
      "ran over ${targetName} with a tank",
      "poisoned ${targetName} with expired milk",
      "buried ${targetName} alive in concrete",
      "shot ${targetName} into orbit",
      "turned ${targetName} into a meme",
      "threw ${targetName} to hungry crocodiles",
      "used ${targetName} for target practice",
      "dropped ${targetName} in piranha tank",
      "sacrificed ${targetName} to the gods",
      "turned ${targetName} into a smoothie",
      "launched nukes at ${targetName}",
      "summoned demons to take ${targetName}",
      "used ${targetName} as lightning rod",
      "dropped an anvil on ${targetName}",
      "teleported ${targetName} to Antarctica naked",
      "fed ${targetName} to zombie horde",
      "cursed ${targetName} with eternal lag",
      "trapped ${targetName} in infinite loop",
      "unplugged ${targetName} from the matrix",
      "hit ${targetName} with blue shell",
      "used Uno reverse card on ${targetName}",
      "reported ${targetName} to admins"
    ]

    // 4. Pick random kill method
    const randomKill = kills[Math.floor(Math.random() * kills.length)]

    // 5. Get target name
    let targetName = 'You'
    let mentionsList = []
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
      mentionsList = [target]
    }

    // 6. Get killer name
    const killerName = `@${msg.sender.split('@')[0]}`

    // Replace placeholder in kill message
    const finalKill = randomKill.replace(/\$\{targetName\}/g, targetName)

    // 7. Get random weapon
    const weapons = ['🔪', '💣', '🔫', '⚔️', '🪓', '🏹', '💉', '🧨', '☢️', '⚡']
    const weapon = weapons[Math.floor(Math.random() * weapons.length)]

    // 8. Build caption - CLEAN & DEADLY
    let caption = `╭─⌈ 💀 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Kill Confirmed*
│
│ ${weapon} *Killer:* ${killerName}
│ ☠️ *Victim:* ${targetName}
│
│ 📋 *Cause of Death:*
│ ${killerName} ${finalKill}
│
│ ⚰️ *Status:* Eliminated
│ 🏴 *RIP:* Gone but not forgotten
│
╰⊷ *Powered By Bunny Tech*`

    // 9. Send kill with mentions
    await sock.sendMessage(from, {
      text: caption,
      mentions: [msg.sender,...mentionsList]
    }, { quoted: msg })

    // 10. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[KILL ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to execute. Target escaped'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}