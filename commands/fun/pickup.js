// commands/fun/pickup.js
export const name = 'pickup'
export const alias = ['pickupline', 'flirt', 'rizzline']
export const category = 'Fun'
export const desc = 'Get smooth pickup lines to use on someone'

export default async function pickup(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY RIZZ MODE 😏
    await sock.sendMessage(from, {
      react: { text: '😏', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted

    // 3. Pickup lines database - 50+ smooth lines
    const pickupLines = [
      "Are you a magician? Because whenever I look at you, everyone else disappears.",
      "Do you have a name or can I call you mine?",
      "Are you WiFi? Because I'm really feeling a connection.",
      "Is your name Google? Because you have everything I've been searching for.",
      "Are you a parking ticket? Because you've got FINE written all over you.",
      "Do you believe in love at first sight, or should I walk by again?",
      "Are you a camera? Because every time I look at you, I smile.",
      "Is your dad a boxer? Because you're a knockout.",
      "Are you French? Because Eiffel for you.",
      "Do you have a map? I keep getting lost in your eyes.",
      "Are you a loan from a bank? Because you have my interest.",
      "Is your name Chapstick? Because you're da balm.",
      "Are you Australian? Because when I look at you, I feel like I'm down under.",
      "Do you have a Band-Aid? Because I just scraped my knee falling for you.",
      "Are you a time traveler? Because I can see you in my future.",
      "Is your body from McDonald's? Because I'm lovin' it.",
      "Are you a 45-degree angle? Because you're acute-y.",
      "Do you like Star Wars? Because Yoda one for me.",
      "Are you my phone charger? Because without you, I'd die.",
      "Is your name Ariel? Because we mermaid for each other.",
      "Are you a keyboard? Because you're just my type.",
      "Do you have a pencil? Because I want to erase your past and write our future.",
      "Are you a volcano? Because I lava you.",
      "Is your name Dunkin? Because I donut want to spend my life without you.",
      "Are you a campfire? Because you're hot and I want s'more.",
      "Do you play soccer? Because you're a keeper.",
      "Are you a dictionary? Because you add meaning to my life.",
      "Is your dad an artist? Because you're a masterpiece.",
      "Are you Netflix? Because I could watch you for hours.",
      "Do you have an inhaler? Because you just took my breath away.",
      "Are you a snowstorm? Because you're making my heart race.",
      "Is your name Waldo? Because someone like you is hard to find.",
      "Are you a light switch? Because you turn me on.",
      "Do you have a sunburn, or are you always this hot?",
      "Are you a bank? Because you have my interest and principal.",
      "Is your name Cinderella? Because I see that dress disappearing at midnight.",
      "Are you a car? Because you're driving me crazy.",
      "Do you like science? Because I've got my ion you.",
      "Are you a candle? Because you light up my world.",
      "Is your name Summer? Because you're hot.",
      "Are you a charger? Because I'm dying without you.",
      "Do you have a mirror in your pocket? Because I can see myself in your pants.",
      "Are you a thief? Because you stole my heart.",
      "Is your dad a baker? Because you're a cutie pie.",
      "Are you oxygen? Because I can't live without you.",
      "Do you have a twin? Because you're the only ten I see.",
      "Are you a puzzle? Because I can't figure you out, but I want to.",
      "Is your name Hope? Because you make my heart soar.",
      "Are you a microwave? Because you make my heart melt.",
      "Do you have 11 protons? Because you're sodium fine."
    ]

    // 4. Pick random pickup line
    const randomLine = pickupLines[Math.floor(Math.random() * pickupLines.length)]

    // 5. Get target name
    let targetName = 'Someone'
    let useFor = 'Use this line:'
    if (target) {
      targetName = `@${target.split('@')[0]}`
      useFor = `For ${targetName}:`
    }

    // 6. Build caption - CLEAN & SMOOTH
    let caption = `╭─⌈ 😏 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Pickup Line*
│
│ 💘 *${useFor}*
│
│ "${randomLine}"
│
│ ✨ *Rizz Level:* 100%
│
╰⊷ *Powered By Bunny Tech*`

    // 7. Send pickup line with mention
    await sock.sendMessage(from, {
      text: caption,
      mentions: target? [target] : []
    }, { quoted: msg })

    // 8. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PICKUP ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to generate pickup line. My rizz is broken'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}