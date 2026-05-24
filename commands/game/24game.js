// commands/game/24game.js
export const name = '24game'
export const alias = ['24', 'twentyfour', 'math24']
export const category = 'Game'
export const desc = '24Game: Use 4 numbers with + - * / to make 24'

const activeGames = new Map()

// Pre-solved puzzles with solutions for validation
const puzzles = [
  { nums: [3, 3, 8, 8], solution: '(8/(3-8/3))' },
  { nums: [1, 5, 5, 5], solution: '(5*(5-1/5))' },
  { nums: [2, 3, 5, 12], solution: '(3*5+12-2)' },
  { nums: [1, 3, 4, 6], solution: '(6/(1-3/4))' },
  { nums: [2, 2, 3, 9], solution: '((2+3)*2+9)' },
  { nums: [1, 1, 4, 6], solution: '(6*4*(1+1))' },
  { nums: [2, 4, 6, 8], solution: '((8+6)*2-4)' },
  { nums: [1, 2, 7], solution: '((7+7)*2-1)' },
  { nums: [2, 3, 7, 7], solution: '((7*3)-7+2)' },
  { nums: [1, 4, 5, 6], solution: '(6/(1-4/5))' },
  { nums: [3, 4, 5, 7], solution: '((7+5)*4/3)' },
  { nums: [2, 2, 5, 9], solution: '((9-2)*5-2)' },
  { nums: [3, 5, 7, 13], solution: '((13+7)/5*3)' },
  { nums: [1, 6, 6, 8], solution: '((8-6)*6*1)' },
  { nums: [2, 5, 5, 10], solution: '((5*5)-10/2)' }
]

function getRandomPuzzle() {
  return puzzles[Math.floor(Math.random() * puzzles.length)]
}

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    clearTimeout(game.roundTimer)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

// Validate if expression uses all numbers once and equals 24
function validateExpression(expr, nums) {
  try {
    // Extract numbers from expression
    const usedNums = expr.match(/\d+/g)?.map(Number).sort((a, b) => a - b) || []
    const targetNums = [...nums].sort((a, b) => a - b)

    // Check if same numbers used
    if (JSON.stringify(usedNums)!== JSON.stringify(targetNums)) {
      return { valid: false, error: 'Must use all 4 numbers once' }
    }

    // Check for invalid characters
    if (!/^[0-9+\-*/()\s]+$/.test(expr)) {
      return { valid: false, error: 'Only +, -, *, /, () allowed' }
    }

    // Evaluate safely
    const result = Function(`"use strict"; return (${expr})`)()

    if (Math.abs(result - 24) < 0.0001) {
      return { valid: true, result: 24 }
    }
    return { valid: false, error: `Result is ${result}, need 24` }
  } catch (e) {
    return { valid: false, error: 'Invalid expression' }
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

export default async function game24(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '🧮', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🧮 *24Game* ⌋
│ Use 4 numbers with + - * / to make 24
│ Example: 3,3,8,8 → (8/(3-8/3)) = 24
│
│ *Commands:*
│ ${botSettings.prefix}24 start - New puzzle
│ ${botSettings.prefix}24 <expression> - Submit answer
│ ${botSettings.prefix}24 hint - Show solution (-8 pts)
│ ${botSettings.prefix}24 skip - Skip puzzle
│ ${botSettings.prefix}24 stop - End game
│ ${botSettings.prefix}24 score - Your score
│
│ *Scoring:*
│ Correct: +20 points
│ Wrong: -3 points
│ Hint: -8 points
│ Fast <30s: +10 bonus
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
          const avgTime = data.totalTime / data.solved
          scoreText += `│ ${medal} ${user.split('@')[0]}: ${data.points} pts\n`
          scoreText += `│ Solved: ${data.solved} | Avg: ${avgTime.toFixed(0)}s\n`
        })
      }
      scoreText += `│\n│ Round: ${game.round} | Numbers: [${game.currentNums.join(', ')}]\n`
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
      endText += `│ Numbers were: [${game.currentNums.join(', ')}]\n`
      endText += `│ Solution: ${game.solution}\n`
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
        return await sock.sendMessage(from, { text: '> Game running! Current: [' + activeGames.get(from).currentNums.join(', ') + ']' }, { quoted: msg })
      }

      const { nums, solution } = getRandomPuzzle()

      const gameData = {
        currentNums: nums,
        solution: solution,
        hintUsed: false,
        scores: {},
        round: 1,
        startTime: Date.now(),
        timeout: null,
        roundTimer: null
      }

      activeGames.set(from, gameData)
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      await sock.sendMessage(from, {
        text: `╭─⌈ 🧮 *24Game* ⌋
│ Round 1
│
│ Use these numbers: *[${nums.join(', ')}]*
│ Make 24 using + - * /
│
│ Example: ${botSettings.prefix}24 (8/(3-8/3))
│ Hint: ${botSettings.prefix}24 hint
│ Time: 60s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Round timeout 60s
      gameData.roundTimer = setTimeout(async () => {
        await showTyping(sock, from)
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Numbers: [${nums.join(', ')}]
│ Solution: ${solution} = 24
│ Next round...
╰⊷ *Powered By Bunny Tech*`
        })
        nextRound(from, sock, botSettings)
      }, 60000)

      // Game timeout 180s
      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Game ended! Total rounds: ${gameData.round}` })
      }, 180000)

      return
    }

    // 5. HINT
    if (action === 'hint') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })
      if (game.hintUsed) return await sock.sendMessage(from, { text: '> Hint already used!' }, { quoted: msg })

      game.hintUsed = true
      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, totalTime: 0 }
      game.scores[sender].points -= 8

      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '💡', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *Hint* ⌋
│ Solution: ${game.solution} = 24
│ -8 points
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SKIP
    if (action === 'skip') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const oldNums = game.currentNums
      const oldSol = game.solution
      const { nums, solution } = getRandomPuzzle()

      clearTimeout(game.roundTimer)
      game.currentNums = nums
      game.solution = solution
      game.hintUsed = false
      game.startTime = Date.now()

      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '⏭️', key: msg.key } })
      await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *Skipped* ⌋
│ Previous: [${oldNums.join(', ')}]
│ Solution: ${oldSol} = 24
│
│ *New Puzzle:*
│ Use: *[${nums.join(', ')}]*
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      game.roundTimer = setTimeout(async () => {
        await showTyping(sock, from)
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Numbers: [${nums.join(', ')}]
│ Solution: ${solution} = 24
│ Next round...
╰⊷ *Powered By Bunny Tech*`
        })
        nextRound(from, sock, botSettings)
      }, 60000)

      return
    }

    // 7. ANSWER - EXPRESSION
    const expr = args.join(' ')
    if (expr) {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.24 start`' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, totalTime: 0 }

      const validation = validateExpression(expr, game.currentNums)
      const timeTaken = (Date.now() - game.startTime) / 1000

      if (validation.valid) {
        // CORRECT
        game.scores[sender].solved++
        game.scores[sender].totalTime += timeTaken
        game.scores[sender].points += 20

        const bonus = timeTaken < 30? 10 : 0
        if (bonus) game.scores[sender].points += bonus

        await showTyping(sock, from)
        await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })

        clearTimeout(game.roundTimer)
        await sock.sendMessage(from, {
          text: `╭─⌈ 🎉 *CORRECT* ⌋
│ Expression: *${expr}* = 24 ✅
│ Time: ${timeTaken.toFixed(1)}s
│ +20 points ${bonus? `+${bonus} fast bonus` : ''}
│ Total: ${game.scores[sender].points} pts
│
│ Solution: ${game.solution}
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })

        setTimeout(() => nextRound(from, sock, botSettings), 2000)

      } else {
        // WRONG
        game.scores[sender].points -= 3

        await showTyping(sock, from)
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        await sock.sendMessage(from, {
          text: `╭─⌈ ❌ *WRONG* ⌋
│ Your answer: ${expr}
│ Error: ${validation.error}
│ -3 points
│ Total: ${game.scores[sender].points} pts
│
│ Try again! Numbers: [${game.currentNums.join(', ')}]
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })
      }
      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, <expression>, hint, skip, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[24GAME ERROR]', err.message)
    clearGame(from) // FUTA CACHE KAMA ERROR
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error. Cache cleared.' }, { quoted: msg })
  }
}

async function nextRound(chatJid, sock, botSettings) {
  const game = activeGames.get(chatJid)
  if (!game) return

  game.round++
  game.hintUsed = false
  game.startTime = Date.now()
  const { nums, solution } = getRandomPuzzle()
  game.currentNums = nums
  game.solution = solution

  await showTyping(sock, chatJid)
  await sock.sendMessage(chatJid, {
    text: `╭─⌈ 🧮 *Round ${game.round}* ⌋
│ Use these numbers: *[${nums.join(', ')}]*
│ Make 24 using + - * /
│
│ Type: ${botSettings.prefix}24 <expression>
│ Time: 60s
╰⊷ *Powered By Bunny Tech*`
  })

  clearTimeout(game.roundTimer)
  game.roundTimer = setTimeout(async () => {
    await showTyping(sock, chatJid)
    await sock.sendMessage(chatJid, {
      text: `╭─⌈ ⏰ *Time Up* ⌋
│ Numbers: [${nums.join(', ')}]
│ Solution: ${solution} = 24
│ Next round...
╰⊷ *Powered By Bunny Tech*`
    })
    nextRound(chatJid, sock, botSettings)
  }, 60000)
}