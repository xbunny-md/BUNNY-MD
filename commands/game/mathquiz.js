// commands/game/mathquiz.js
export const name = 'mathquiz'
export const alias = ['mq', 'math', 'calc']
export const category = 'Game'
export const desc = 'MathQuiz: Quick math problems. Solve fast for points'

const activeGames = new Map()

function generateProblem(difficulty) {
  let a, b, op, answer, text

  switch(difficulty) {
    case 'easy':
      a = Math.floor(Math.random() * 10) + 1
      b = Math.floor(Math.random() * 10) + 1
      op = ['+', '-'][Math.floor(Math.random() * 2)]
      break
    case 'hard':
      a = Math.floor(Math.random() * 50) + 10
      b = Math.floor(Math.random() * 50) + 10
      op = ['*', '/', '+', '-'][Math.floor(Math.random() * 4)]
      if (op === '/') {
        answer = Math.floor(Math.random() * 20) + 1
        a = answer * b // Ensure clean division
      }
      break
    default: // normal
      a = Math.floor(Math.random() * 20) + 1
      b = Math.floor(Math.random() * 20) + 1
      op = ['+', '-', '*'][Math.floor(Math.random() * 3)]
  }

  if (op === '+') answer = a + b
  else if (op === '-') {
    if (a < b) [a, b] = [b, a] // Avoid negatives
    answer = a - b
  }
  else if (op === '*') answer = a * b
  else if (op === '/') answer = a / b

  text = `${a} ${op} ${b} =?`
  return { text, answer: Math.round(answer) }
}

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    clearInterval(game.roundTimer)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

export default async function mathquiz(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '➕', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ➕ *MathQuiz* ⌋
│ Quick math problems
│ Solve before time runs out
│
│ *Commands:*
│ ${botSettings.prefix}mq start - Normal mode
│ ${botSettings.prefix}mq start easy - Easy 1-10
│ ${botSettings.prefix}mq start hard - Hard 10-50
│ ${botSettings.prefix}mq <answer> - Submit answer
│ ${botSettings.prefix}mq stop - End game
│ ${botSettings.prefix}mq score - Your score
│
│ *Scoring:*
│ <3s: +15 pts
│ 3-5s: +10 pts
│ 5-10s: +5 pts
│ Wrong: -3 pts
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
          const avgTime = data.totalTime / data.solved
          scoreText += `│ ${medal} ${user.split('@')[0]}: ${data.points} pts\n`
          scoreText += `│ Solved: ${data.solved} | Avg: ${avgTime.toFixed(1)}s\n`
        })
      }
      scoreText += `│\n│ Round: ${game.round} | Difficulty: ${game.difficulty}\n`
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
        return await sock.sendMessage(from, { text: '> Game running! Use `.mq <answer>`' }, { quoted: msg })
      }

      const difficulty = args[1]?.toLowerCase() || 'normal'
      const { text, answer } = generateProblem(difficulty)

      const gameData = {
        currentProblem: text,
        currentAnswer: answer,
        difficulty: difficulty,
        round: 1,
        scores: {},
        startTime: Date.now(),
        timeout: null,
        roundTimer: null
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: `╭─⌈ ➕ *MathQuiz* ⌋
│ Round 1 - ${difficulty.toUpperCase()}
│
│ *${text}*
│
│ Answer: ${botSettings.prefix}mq <number>
│ Time: 15s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Round timeout 15s
      gameData.roundTimer = setTimeout(async () => {
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Answer: *${answer}*
│ Next round...
╰⊷ *Powered By Bunny Tech*`
        })
        nextRound(from, sock, botSettings)
      }, 15000)

      // Game timeout 120s
      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Game ended! Total rounds: ${gameData.round}` })
      }, 120000)

      return
    }

    // 5. ANSWER - NUMBER DIRECT
    const guess = parseInt(action)
    if (!isNaN(guess)) {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.mq start`' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, totalTime: 0 }

      const timeTaken = (Date.now() - game.startTime) / 1000

      if (guess === game.currentAnswer) {
        // CORRECT
        let points = 5
        if (timeTaken < 3) points = 15
        else if (timeTaken < 5) points = 10

        game.scores[sender].points += points
        game.scores[sender].solved++
        game.scores[sender].totalTime += timeTaken

        await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })

        clearTimeout(game.roundTimer)
        await sock.sendMessage(from, {
          text: `╭─⌈ 🎉 *CORRECT* ⌋
│ Answer: *${game.currentAnswer}*
│ Time: ${timeTaken.toFixed(1)}s
│ +${points} points @${sender.split('@')[0]}
│ Total: ${game.scores[sender].points} pts
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })

        nextRound(from, sock, botSettings)

      } else {
        // WRONG
        game.scores[sender].points -= 3

        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        await sock.sendMessage(from, {
          text: `╭─⌈ ❌ *WRONG* ⌋
│ Your answer: ${guess}
│ -3 points
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
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, <number>, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[MATHQUIZ ERROR]', err.message)
    clearGame(from) // FUTA CACHE KAMA ERROR
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error. Cache cleared.' }, { quoted: msg })
  }
}

async function nextRound(chatJid, sock, botSettings) {
  const game = activeGames.get(chatJid)
  if (!game) return

  game.round++
  game.startTime = Date.now()
  const { text, answer } = generateProblem(game.difficulty)
  game.currentProblem = text
  game.currentAnswer = answer

  await sock.sendMessage(chatJid, {
    text: `╭─⌈ ➕ *Round ${game.round}* ⌋
│ *${text}*
│
│ Answer: ${botSettings.prefix}mq <number>
│ Time: 15s
╰⊷ *Powered By Bunny Tech*`
  })

  clearTimeout(game.roundTimer)
  game.roundTimer = setTimeout(async () => {
    await sock.sendMessage(chatJid, {
      text: `╭─⌈ ⏰ *Time Up* ⌋
│ Answer: *${answer}*
│ Next round...
╰⊷ *Powered By Bunny Tech*`
    })
    nextRound(chatJid, sock, botSettings)
  }, 15000)
}