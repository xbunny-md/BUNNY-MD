// commands/game/riddle.js
export const name = 'riddle'
export const alias = ['rid', 'puzzle', 'brain']
export const category = 'Game'
export const desc = 'Riddle: Solve short riddles and brain teasers'

const activeGames = new Map()

const riddleBank = [
  { riddle: 'I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?', answer: 'ECHO' },
  { riddle: 'You see me once in June, twice in November, but not at all in May. What am I?', answer: 'E' },
  { riddle: 'What has keys but no locks, space but no room, and you can enter but not go in?', answer: 'KEYBOARD' },
  { riddle: 'I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?', answer: 'MAP' },
  { riddle: 'What gets wet while drying?', answer: 'TOWEL' },
  { riddle: 'I am not alive, but I grow. I dont have lungs, but I need air. What am I?', answer: 'FIRE' },
  { riddle: 'What has a head and a tail but no body?', answer: 'COIN' },
  { riddle: 'The more you take, the more you leave behind. What are they?', answer: 'FOOTSTEPS' },
  { riddle: 'What can travel around the world while staying in a corner?', answer: 'STAMP' },
  { riddle: 'I have branches, but no fruit, trunk, or leaves. What am I?', answer: 'BANK' },
  { riddle: 'What is always in front of you but cant be seen?', answer: 'FUTURE' },
  { riddle: 'What has many teeth but cannot bite?', answer: 'COMB' },
  { riddle: 'What goes up but never comes down?', answer: 'AGE' },
  { riddle: 'I shave every day, but my beard stays the same. Who am I?', answer: 'BARBER' },
  { riddle: 'What has one eye but cannot see?', answer: 'NEEDLE' },
  { riddle: 'What has hands but cannot clap?', answer: 'CLOCK' },
  { riddle: 'What begins with T, ends with T, and has T in it?', answer: 'TEAPOT' },
  { riddle: 'What has a neck but no head?', answer: 'BOTTLE' },
  { riddle: 'What can you catch but not throw?', answer: 'COLD' },
  { riddle: 'What has words but never speaks?', answer: 'BOOK' }
]

function getRandomRiddle() {
  return riddleBank[Math.floor(Math.random() * riddleBank.length)]
}

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

export default async function riddle(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '❓', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❓ *Riddle* ⌋
│ Solve brain teasers
│ Think outside the box
│
│ *Commands:*
│ ${botSettings.prefix}rid start - New riddle
│ ${botSettings.prefix}rid answer <word> - Submit answer
│ ${botSettings.prefix}rid hint - Get hint (-3 pts)
│ ${botSettings.prefix}rid reveal - Show answer (-10 pts)
│ ${botSettings.prefix}rid skip - Skip riddle
│ ${botSettings.prefix}rid stop - End game
│ ${botSettings.prefix}rid score - Your score
│
│ *Scoring:*
│ Correct: +15 points
│ Wrong: -2 points
│ Hint: -3 points
│ Reveal: -10 points
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 2. SCORE
    if (action === 'score' || action === 'stats') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      let scoreText = `╭─⌈ 📊 *Scores* ⌋\n`
      const sorted = Object.entries(game.scores).sort((a, b) => b[1].points - a[1].points)

      if (sorted.length === 0) {
        scoreText += `│ No scores yet\n`
      } else {
        sorted.forEach(([user, data], i) => {
          const medal = i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : '🎯'
          scoreText += `│ ${medal} ${user.split('@')[0]}: ${data.points} pts\n`
          scoreText += `│ Solved: ${data.solved} | Streak: ${data.streak} 🔥\n`
        })
      }
      scoreText += `│\n│ Riddles solved: ${game.totalSolved}\n`
      scoreText += `│ Current attempts: ${game.attempts}\n`
      scoreText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: scoreText }, { quoted: msg })
    }

    // 3. STOP
    if (action === 'stop' || action === 'end') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      clearGame(from) // FUTA CACHE
      await sock.sendMessage(from, { react: { text: '🛑', key: msg.key } })

      let endText = `╭─⌈ 🛑 *Game Ended* ⌋\n`
      endText += `│ Answer was: *${game.currentAnswer}*\n`
      endText += `│ Solved: ${game.totalSolved} riddles\n│\n`

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
        return await sock.sendMessage(from, { text: '> Game running! Use `.rid answer <word>`' }, { quoted: msg })
      }

      const { riddle, answer } = getRandomRiddle()

      const gameData = {
        currentRiddle: riddle,
        currentAnswer: answer,
        hintUsed: false,
        attempts: 0,
        scores: {},
        totalSolved: 0,
        timeout: null
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: `╭─⌈ ❓ *Riddle* ⌋
│ ${riddle}
│
│ Answer: ${botSettings.prefix}rid answer <word>
│ Hint: ${botSettings.prefix}rid hint (-3 pts)
│ Time: 120s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Answer was: *${answer}*
│ Game ended
╰⊷ *Powered By Bunny Tech*`
        })
      }, 120000)

      return
    }

    // 5. HINT
    if (action === 'hint') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })
      if (game.hintUsed) return await sock.sendMessage(from, { text: '> Hint already used!' }, { quoted: msg })

      game.hintUsed = true
      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, streak: 0 }
      game.scores[sender].points -= 3

      const answer = game.currentAnswer
      const firstLetter = answer[0]
      const lastLetter = answer.slice(-1)
      const length = answer.length

      await sock.sendMessage(from, { react: { text: '💡', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *Hint* ⌋
│ First letter: *${firstLetter}*
│ Last letter: *${lastLetter}*
│ Length: ${length} letters
│ -3 points
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. REVEAL
    if (action === 'reveal' || action === 'show') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, streak: 0 }
      game.scores[sender].points -= 10
      game.scores[sender].streak = 0

      const answer = game.currentAnswer
      await sock.sendMessage(from, { react: { text: '📖', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📖 *Revealed* ⌋
│ Answer: *${answer}*
│ -10 points @${sender.split('@')[0]}
│ Total: ${game.scores[sender].points} pts
│
│ Use.rid skip for new riddle
╰⊷ *Powered By Bunny Tech*`,
        mentions: [sender]
      }, { quoted: msg })
    }

    // 7. SKIP
    if (action === 'skip') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const oldAnswer = game.currentAnswer
      const { riddle, answer } = getRandomRiddle()

      clearTimeout(game.timeout)
      game.currentRiddle = riddle
      game.currentAnswer = answer
      game.hintUsed = false
      game.attempts = 0

      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, streak: 0 }
      game.scores[sender].streak = 0

      await sock.sendMessage(from, { react: { text: '⏭️', key: msg.key } })
      await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *Skipped* ⌋
│ Previous: *${oldAnswer}*
│
│ *New Riddle:*
│ ${riddle}
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      game.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Time up! Answer was: *${answer}*` })
      }, 120000)

      return
    }

    // 8. ANSWER
    if (action === 'answer' || action === 'ans' || action === 'a') {
      const guess = args.slice(1).join(' ').toUpperCase()
      if (!guess) return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}rid answer <word>` }, { quoted: msg })

      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.rid start`' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, streak: 0 }
      game.attempts++

      if (guess === game.currentAnswer) {
        // CORRECT
        game.scores[sender].solved++
        game.scores[sender].streak++
        game.scores[sender].points += 15
        game.totalSolved++

        const bonus = game.scores[sender].streak >= 3? 5 : 0
        if (bonus) game.scores[sender].points += bonus

        await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })

        const { riddle, answer } = getRandomRiddle()
        const oldAnswer = game.currentAnswer

        clearTimeout(game.timeout)
        game.currentRiddle = riddle
        game.currentAnswer = answer
        game.hintUsed = false
        game.attempts = 0

        await sock.sendMessage(from, {
          text: `╭─⌈ 🎉 *CORRECT* ⌋
│ Answer: *${oldAnswer}*
│ +15 points @${sender.split('@')[0]}
│ Streak: ${game.scores[sender].streak} 🔥 ${bonus? `+${bonus} bonus` : ''}
│ Total: ${game.scores[sender].points} pts
│
│ *Next Riddle:*
│ ${riddle}
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })

        game.timeout = setTimeout(() => {
          clearGame(from) // FUTA CACHE
          sock.sendMessage(from, { text: `> ⏰ Time up! Answer was: *${answer}*` })
        }, 120000)

      } else {
        // WRONG
        game.scores[sender].points -= 2
        game.scores[sender].streak = 0

        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        await sock.sendMessage(from, {
          text: `╭─⌈ ❌ *WRONG* ⌋
│ Your answer: ${guess}
│ -2 points
│ Attempts: ${game.attempts}
│ Total: ${game.scores[sender].points} pts
│
│ Try again!
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })
      }
      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, answer, hint, reveal, skip, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[RIDDLE ERROR]', err.message)
    clearGame(from) // FUTA CACHE KAMA ERROR
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error. Cache cleared.' }, { quoted: msg })
  }
}