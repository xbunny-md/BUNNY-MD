// commands/game/dilemma.js
export const name = 'dilemma'
export const alias = ['dil', 'choice', 'moral']
export const category = 'Game'
export const desc = 'Dilemma: Choose A or B in moral/social scenarios, see group stats'

const activeGames = new Map()

const dilemmas = [
  {
    question: 'You find a wallet with $1000 and ID. No cameras around.',
    optionA: 'Keep the money - nobody will know',
    optionB: 'Return it - it\'s the right thing',
    category: 'Honesty'
  },
  {
    question: 'Your friend asks if they look fat in new clothes. They do.',
    optionA: 'Tell truth - honesty is best',
    optionB: 'Lie kindly - protect feelings',
    category: 'Truth'
  },
  {
    question: 'You can save 5 strangers or your 1 sibling from accident.',
    optionA: 'Save 5 strangers - greater good',
    optionB: 'Save sibling - family first',
    category: 'Loyalty'
  },
  {
    question: 'Boss asks you to lie to client to close $1M deal.',
    optionA: 'Lie - keep job, company benefits',
    optionB: 'Refuse - risk job, keep integrity',
    category: 'Ethics'
  },
  {
    question: 'You see friend cheating on exam. Teacher asks you.',
    optionA: 'Tell teacher - cheating is wrong',
    optionB: 'Stay silent - loyalty to friend',
    category: 'Justice'
  },
  {
    question: 'AI can replace your job but make company 10x efficient.',
    optionA: 'Support AI - progress matters',
    optionB: 'Oppose AI - protect workers',
    category: 'Progress'
  },
  {
    question: 'Partner cheated once, regrets deeply, begs forgiveness.',
    optionA: 'Forgive - people make mistakes',
    optionB: 'Leave - trust is broken forever',
    category: 'Forgiveness'
  },
  {
    question: 'You can steal medicine to save dying child, no other way.',
    optionA: 'Steal - life over property',
    optionB: 'Don\'t steal - law is law',
    category: 'Morality'
  },
  {
    question: 'Terrorist group takes hostages, demands prisoner release.',
    optionA: 'Release prisoner - save hostages',
    optionB: 'Refuse - don\'t negotiate with terrorists',
    category: 'Security'
  },
  {
    question: 'Your art goes viral but gets stolen, no credit to you.',
    optionA: 'Stay silent - art reached people',
    optionB: 'Fight publicly - demand credit',
    category: 'Recognition'
  },
  {
    question: 'You can time travel, kill baby Hitler.',
    optionA: 'Kill - prevent Holocaust',
    optionB: 'Don\'t kill - murder is wrong',
    category: 'Philosophy'
  },
  {
    question: 'Friend uploads embarrassing video of you. Asks to delete.',
    optionA: 'Let it stay - they have right to post',
    optionB: 'Demand delete - your privacy',
    category: 'Privacy'
  }
]

function getRandomDilemma() {
  return dilemmas[Math.floor(Math.random() * dilemmas.length)]
}

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    clearTimeout(game.roundTimer)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

// ANTI-BAN: Random delay
function antiBanDelay() {
  return Math.floor(Math.random() * 1200) + 800
}

// ANTI-BAN: Typing indicator
async function showTyping(sock, from) {
  await sock.presenceSubscribe(from)
  await sock.sendPresenceUpdate('composing', from)
  await new Promise(r => setTimeout(r, antiBanDelay()))
}

// ANIMATED REVEAL
async function animateResults(sock, from, game) {
  const total = game.votesA + game.votesB
  const percentA = total > 0? ((game.votesA / total) * 100).toFixed(0) : 0
  const percentB = total > 0? ((game.votesB / total) * 100).toFixed(0) : 0

  const frames = [
    `⚖️ *Calculating votes...*`,
    `⚖️ Option A: ${game.votesA} votes`,
    `⚖️ Option A: ${game.votesA} votes (${percentA}%)\n⚖️ Option B: ${game.votesB} votes`,
    `⚖️ Option A: ${game.votesA} votes (${percentA}%)\n⚖️ Option B: ${game.votesB} votes (${percentB}%)`
  ]

  const key = await sock.sendMessage(from, { text: frames[0] })

  for (let i = 1; i < frames.length; i++) {
    await new Promise(r => setTimeout(r, 800))
    await sock.sendMessage(from, { text: frames[i], edit: key.key })
  }

  return key
}

export default async function dilemma(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '⚖️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⚖️ *Dilemma* ⌋
│ Choose A or B in moral scenarios
│ See what group thinks
│ No right/wrong answer
│
│ *Commands:*
│ ${botSettings.prefix}dil start - New dilemma
│ ${botSettings.prefix}dil a - Choose option A
│ ${botSettings.prefix}dil b - Choose option B
│ ${botSettings.prefix}dil stats - Show current stats
│ ${botSettings.prefix}dil skip - Skip dilemma
│ ${botSettings.prefix}dil stop - End game
│ ${botSettings.prefix}dil score - Your score
│
│ *Scoring:*
│ Vote: +5 points
│ Majority side: +3 bonus
│ Minority side: +5 bonus (brave)
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 2. SCORE
    if (action === 'score' || action === 'stats') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      await showTyping(sock, from)
      let scoreText = `╭─⌈ 📊 *Scores* ⌋\n`
      const sorted = Object.entries(game.scores).sort((a, b) => b[1].points - a[1].points)

      if (sorted.length === 0) {
        scoreText += `│ No scores yet\n`
      } else {
        sorted.forEach(([user, data], i) => {
          const medal = i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : '🎯'
          scoreText += `│ ${medal} ${user.split('@')[0]}: ${data.points} pts\n`
          scoreText += `│ Votes: ${data.votes} | Brave: ${data.brave}\n`
        })
      }
      scoreText += `│\n│ Round: ${game.round} | Category: ${game.dilemma.category}\n`
      scoreText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: scoreText }, { quoted: msg })
    }

    // 3. STOP
    if (action === 'stop' || action === 'end') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      clearGame(from) // FUTA CACHE
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '🛑', key: msg.key } })

      let endText = `╭─⌈ 🛑 *Game Ended* ⌋\n`
      endText += `│ Last: ${game.dilemma.question}\n`
      endText += `│ A: ${game.votesA} | B: ${game.votesB}\n`
      endText += `│ Rounds: ${game.round}\n│\n`

      const sorted = Object.entries(game.scores).sort((a, b) => b[1].points - a[1].points)
      if (sorted.length > 0) {
        endText += `│ *Final Scores:*\n`
        sorted.forEach(([user, data], i) => {
          const medal = i === 0? '🥇' : i === 1? '🥈' : '🥉'
          endText += `│ ${medal} ${user.split('@')[0]}: ${data.points} pts\n`
        })
      }
      endText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: endText }, { quoted: msg })
    }

    // 4. START
    if (action === 'start') {
      if (activeGames.has(from)) {
        return await sock.sendMessage(from, { text: '> Game running! Vote A or B.' }, { quoted: msg })
      }

      const dilemma = getRandomDilemma()

      const gameData = {
        dilemma: dilemma,
        votesA: 0,
        votesB: 0,
        voters: {},
        scores: {},
        round: 1,
        timeout: null,
        roundTimer: null,
        revealed: false
      }

      activeGames.set(from, gameData)
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      await sock.sendMessage(from, {
        text: `╭─⌈ ⚖️ *Dilemma Round 1* ⌋
│ Category: ${dilemma.category}
│
│ *${dilemma.question}*
│
│ 🅰️ A: ${dilemma.optionA}
│ 🅱️ B: ${dilemma.optionB}
│
│ Vote:.dil a or.dil b
│ Stats:.dil stats
│ Time: 45s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Round timeout 45s - auto reveal
      gameData.roundTimer = setTimeout(async () => {
        if (!gameData.revealed) {
          gameData.revealed = true
          await animateResults(sock, from, gameData)

          const total = gameData.votesA + gameData.votesB
          const majority = gameData.votesA > gameData.votesB? 'A' : gameData.votesB > gameData.votesA? 'B' : 'TIE'

          // Award bonuses
          Object.keys(gameData.voters).forEach(voter => {
            const vote = gameData.voters[voter]
            if (majority!== 'TIE') {
              if (vote === majority) {
                gameData.scores[voter].points += 3 // Majority bonus
              } else {
                gameData.scores[voter].points += 5 // Brave minority bonus
                gameData.scores[voter].brave++
              }
            }
          })

          await new Promise(r => setTimeout(r, 1000))
          await showTyping(sock, from)
          await sock.sendMessage(from, {
            text: `╭─⌈ 📊 *Results* ⌋
│ Majority: ${majority === 'TIE'? 'Split 50/50' : 'Option ' + majority}
│ Total votes: ${total}
│
│ No right answer - just perspectives
│ Next round...
╰⊷ *Powered By Bunny Tech*`
          })
          setTimeout(() => nextRound(from, sock, botSettings), 3000)
        }
      }, 45000)

      // Game timeout 300s
      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Game ended! Total rounds: ${gameData.round}` })
      }, 300000)

      return
    }

    // 5. STATS - Show current votes without revealing
    if (action === 'stats') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const total = game.votesA + game.votesB
      await showTyping(sock, from)
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📊 *Current Stats* ⌋
│ Total votes: ${total}
│ Voters: ${Object.keys(game.voters).length}
│
│ Results hidden until time up
│ Keep voting!
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SKIP
    if (action === 'skip') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const oldQ = game.dilemma.question
      const newDilemma = getRandomDilemma()

      clearTimeout(game.roundTimer)
      game.dilemma = newDilemma
      game.votesA = 0
      game.votesB = 0
      game.voters = {}
      game.revealed = false

      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '⏭️', key: msg.key } })
      await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *Skipped* ⌋
│ Previous: ${oldQ}
│
│ *New Dilemma:*
│ Category: ${newDilemma.category}
│
│ *${newDilemma.question}*
│
│ 🅰️ A: ${newDilemma.optionA}
│ 🅱️ B: ${newDilemma.optionB}
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      game.roundTimer = setTimeout(async () => {
        if (!game.revealed) {
          game.revealed = true
          await animateResults(sock, from, game)
          setTimeout(() => nextRound(from, sock, botSettings), 3000)
        }
      }, 45000)

      return
    }

    // 7. VOTE - A or B
    if (action === 'a' || action === 'b') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.dil start`' }, { quoted: msg })
      if (game.revealed) return await sock.sendMessage(from, { text: '> Voting closed! Wait for next round.' }, { quoted: msg })

      // Check if already voted
      if (game.voters[sender]) {
        return await sock.sendMessage(from, { text: `> You already voted ${game.voters[sender]}!` }, { quoted: msg })
      }

      if (!game.scores[sender]) game.scores[sender] = { points: 0, votes: 0, brave: 0 }
      game.scores[sender].points += 5
      game.scores[sender].votes++

      const vote = action.toUpperCase()
      game.voters[sender] = vote
      if (vote === 'A') game.votesA++
      else game.votesB++

      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Vote Recorded* ⌋
│ You chose: Option ${vote}
│ +5 points
│ Total: ${game.scores[sender].points} pts
│
│ Results revealed in 45s or when all vote
╰⊷ *Powered By Bunny Tech*`,
        mentions: [sender]
      }, { quoted: msg })

      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, a, b, stats, skip, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[DILEMMA ERROR]', err.message)
    clearGame(from) // FUTA CACHE KAMA ERROR
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error. Cache cleared.' }, { quoted: msg })
  }
}

async function nextRound(chatJid, sock, botSettings) {
  const game = activeGames.get(chatJid)
  if (!game) return

  game.round++
  game.votesA = 0
  game.votesB = 0
  game.voters = {}
  game.revealed = false
  const dilemma = getRandomDilemma()
  game.dilemma = dilemma

  await showTyping(sock, chatJid)
  await sock.sendMessage(chatJid, {
    text: `╭─⌈ ⚖️ *Dilemma Round ${game.round}* ⌋
│ Category: ${dilemma.category}
│
│ *${dilemma.question}*
│
│ 🅰️ A: ${dilemma.optionA}
│ 🅱️ B: ${dilemma.optionB}
│
│ Vote:.dil a or.dil b
│ Time: 45s
╰⊷ *Powered By Bunny Tech*`
  })

  clearTimeout(game.roundTimer)
  game.roundTimer = setTimeout(async () => {
    if (!game.revealed) {
      game.revealed = true
      await animateResults(sock, chatJid, game)
      setTimeout(() => nextRound(chatJid, sock, botSettings), 3000)
    }
  }, 45000)
}