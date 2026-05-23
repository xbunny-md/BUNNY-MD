// commands/fun/truth.js
export const name = 'truth'
export const alias = ['ukweli', 'question', 'askme']
export const category = 'Fun'
export const desc = 'Get random truth questions to expose secrets'

export default async function truth(sock, { msg, from, mentionedJid }, botSettings) {
  try {
    // 1. React first - BUNNY TRUTH MODE 🤔
    await sock.sendMessage(from, {
      react: { text: '🤔', key: msg.key }
    })

    // 2. Get target user
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    let target = mentionedJid?.[0] || mentions?.[0] || quoted || msg.sender

    // 3. Truth questions database - 50+ spicy questions
    const truths = [
      "What's the biggest lie you've ever told?",
      "Who was your last crush?",
      "Have you ever cheated in a relationship?",
      "What's your biggest fear?",
      "What's the most embarrassing thing you've done?",
      "Who do you secretly hate in this group?",
      "What's your biggest insecurity?",
      "Have you ever stolen something?",
      "What's the dumbest thing you've done for love?",
      "Who was your first kiss?",
      "What's your darkest secret?",
      "Have you ever lied to get out of trouble?",
      "What's the worst thing you've said about someone behind their back?",
      "Who in this group would you date?",
      "What's your biggest regret?",
      "Have you ever faked being sick to skip work/school?",
      "What's the most childish thing you still do?",
      "Who do you stalk the most on social media?",
      "What's your guilty pleasure?",
      "Have you ever ghosted someone?",
      "What's the worst date you've ever been on?",
      "Who was your worst kiss?",
      "What's something illegal you've done?",
      "Have you ever been caught doing something embarrassing?",
      "What's your most toxic trait?",
      "Who do you think is the most attractive person in this group?",
      "What's the biggest rumor you've spread?",
      "Have you ever had a crush on a teacher/boss?",
      "What's the weirdest thing you do when alone?",
      "Who would you delete from your life if you could?",
      "What's your most embarrassing nickname?",
      "Have you ever peed in a pool?",
      "What's the biggest secret you've kept from your parents?",
      "Who in this group annoys you the most?",
      "What's your worst habit?",
      "Have you ever sent a text to the wrong person?",
      "What's the most expensive thing you've broken?",
      "Who was your worst heartbreak?",
      "What's something you've never told anyone?",
      "Have you ever lied about your age?",
      "What's the cringiest thing in your search history?",
      "Who do you think has the worst taste in partners here?",
      "What's your most embarrassing fall?",
      "Have you ever pretended to like a gift you hated?",
      "What's the biggest fight you've had with a friend?",
      "Who would you save first in a zombie apocalypse?",
      "What's your most irrational fear?",
      "Have you ever eavesdropped on someone?",
      "What's the worst thing you've done while drunk?",
      "Who do you think lies the most in this group?"
    ]

    // 4. Pick random truth
    const randomTruth = truths[Math.floor(Math.random() * truths.length)]

    // 5. Get target name
    let targetName = 'You'
    if (target!== msg.sender) {
      targetName = `@${target.split('@')[0]}`
    }

    // 6. Determine spiciness level
    const spicy = ['Mild', 'Medium', 'Hot', 'Extreme'][Math.floor(Math.random() * 4)]
    const spicyEmoji = {
      'Mild': '🟢',
      'Medium': '🟡',
      'Hot': '🟠',
      'Extreme': '🔴'
    }

    // 7. Build caption - CLEAN & SPICY
    let caption = `╭─⌈ 🤔 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Truth Question*
│
│ 🎯 *Target:* ${targetName}
│ ${spicyEmoji[spicy]} *Spicy Level:* ${spicy}
│
│ ❓ *Question:*
│ ${randomTruth}
│
│ ⏰ *Answer Time:* 5 minutes
│ 🤐 *No Lying:* Be honest
│
╰⊷ *Powered By Bunny Tech*`

    // 8. Send truth with mention
    await sock.sendMessage(from, {
      text: caption,
      mentions: target!== msg.sender? [target] : []
    }, { quoted: msg })

    // 9. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[TRUTH ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Failed to generate truth. The secrets are safe for now'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}