// commands/game/fibonacci.js
export const name = 'fibonacci'
export const alias = ['fib', 'fibo', 'seq']
export const category = 'Game'
export const desc = 'Fibonacci: Continue the sequence. Each number = sum of previous two'

const activeGames = new Map()

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    clearTimeout(game.roundTimer)
    clearTimeout(game.hintTimer)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

// Generate Fibonacci sequence starting from random seeds
function generateSequence(length = 5) {
  const start1 = Math.floor(Math.random() * 5) + 1 // 1-5
  const start2 = Math.floor(Math.random() * 5) + 1 // 1-5
  const seq = [start1, start2]

  for (let i = 2; i < length + 1; i++) {
    seq.push(seq[i - 1] + seq[i - 2])
  }

  return {
    sequence: seq.slice(0, length),
    next: seq[length]
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

// ANIMATED SEQUENCE
async function animateSequence(sock, from, sequence) {
  const frames = [
    `🌀 *Generating sequence...*`,
    `🌀 ${sequence[0]}`,
    `🌀 ${sequence[0]}, ${sequence[1]}`,
    `🌀 ${sequence[0]}, ${sequence[1]}, ${sequence[2]}`,
    `🌀 ${sequence[0]}, ${sequence[1]}, ${sequence[2]}, ${sequence[3]}`,
    `🌀 ${sequence.join(', ')},?`
  ]

  const key = await sock.sendMessage(from, { text: frames[0] })

  for (let i = 1; i < frames.length; i++) {
    await new Promise(r => setTimeout(r, 700))
    await sock.sendMessage(from, { text: frames[i], edit: key.key })
  }

  return key
}

export default async function fibonacci(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '🌀', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🌀 *Fibonacci* ⌋
│ Continue the sequence
│ Each number = sum of previous two
│ Example: 1,1,2,3,5 → 8
│
│ *Commands:*
│ ${botSettings.prefix}fib start - Easy 5 nums
│ ${botSettings.prefix}fib start hard - Hard 6 nums
│ ${botSettings.prefix}fib <number> - Submit answer
│ ${botSettings.prefix}fib hint - Get hint (-5 pts)
│ ${botSettings.prefix}fib skip - Skip sequence
│ ${botSettings.prefix}fib stop - End game
│ ${botSettings.prefix}fib score - Your score
│
│ *Scoring:*
│ Correct: +15 points
│ Wrong: -3 points
│ Hint: -5 points
│ Streak 3+: +8 bonus
│ Fast <10s: +5 bonus
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
          const accuracy = data.attempts > 0? ((data.correct / data.attempts) * 100).toFixed(0) : 0
          scoreText += `│ ${medal} ${user.split('@')[0]}: ${data.points} pts\n`
          scoreText += `│ Solved: ${data.correct} | Streak: ${data.streak} 🔥 | ${accuracy}%\n`
        })
      }
      scoreText += `│\n│ Round: ${game.round} | Current: ${game.sequence.join(', ')},?\n`
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
      endText += `│ Sequence was: ${game.sequence.join(', ')},?\n`
      endText += `│ Answer: *${game.answer}*\n`
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
        return await sock.sendMessage(from, { text: '> Game running! Current: ' + activeGames.get(from).sequence.join(', ') + ',?' }, { quoted: msg })
      }

      const difficulty = args[1]?.toLowerCase() === 'hard'? 6 : 5
      const { sequence, next } = generateSequence(difficulty)

      const gameData = {
        sequence: sequence,
        answer: next,
        hintUsed: false,
        scores: {},
        round: 1,
        startTime: Date.now(),
        timeout: null,
        roundTimer: null,
        hintTimer: null
      }

      activeGames.set(from, gameData)
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      // ANIMATED SEQUENCE
      await animateSequence(sock, from, sequence)

      await new Promise(r => setTimeout(r, 500))
      await sock.sendMessage(from, {
        text: `╭─⌈ 🌀 *Fibonacci Round 1* ⌋
│ Sequence: *${sequence.join(', ')},?*
│
│ What comes next?
│ Type: ${botSettings.prefix}fib <number>
│ Hint: ${botSettings.prefix}fib hint
│ Time: 30s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Round timeout 30s
      gameData.roundTimer = setTimeout(async () => {
        await showTyping(sock, from)
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Sequence: ${sequence.join(', ')}, *${next}*
│ ${sequence[sequence.length-2]} + ${sequence[sequence.length-1]} = ${next}
│ Next round...
╰⊷ *Powered By Bunny Tech*`
        })
        nextRound(from, sock, botSettings)
      }, 30000)

      // Game timeout 120s
      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Game ended! Total rounds: ${gameData.round}` })
      }, 120000)

      return
    }

    // 5. HINT
    if (action === 'hint') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })
      if (game.hintUsed) return await sock.sendMessage(from, { text: '> Hint already used!' }, { quoted: msg })

      game.hintUsed = true
      if (!game.scores[sender]) game.scores[sender] = { points: 0, correct: 0, attempts: 0, streak: 0 }
      game.scores[sender].points -= 5

      const lastTwo = game.sequence.slice(-2)
      const sum = lastTwo[0] + lastTwo[1]

      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '💡', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *Hint* ⌋
│ Add last two numbers:
│ ${lastTwo[0]} + ${lastTwo[1]} =?
│ -5 points
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SKIP
    if (action === 'skip') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const oldSeq = game.sequence
      const oldAns = game.answer
      const { sequence, next } = generateSequence(oldSeq.length)

      clearTimeout(game.roundTimer)
      game.sequence = sequence
      game.answer = next
      game.hintUsed = false
      game.startTime = Date.now()

      if (!game.scores[sender]) game.scores[sender] = { points: 0, correct: 0, attempts: 0, streak: 0 }
      game.scores[sender].streak = 0

      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '⏭️', key: msg.key } })
      await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *Skipped* ⌋
│ Previous: ${oldSeq.join(', ')}, *${oldAns}*
│
│ *New Sequence:*
│ ${sequence.join(', ')},?
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      game.roundTimer = setTimeout(async () => {
        await showTyping(sock, from)
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Sequence: ${sequence.join(', ')}, *${next}*
│ ${sequence[sequence.length-2]} + ${sequence[sequence.length-1]} = ${next}
│ Next round...
╰⊷ *Powered By Bunny Tech*`
        })
        nextRound(from, sock, botSettings)
      }, 30000)

      return
    }

    // 7. GUESS - NUMBER DIRECT
    const guess = parseInt(args[0])
    if (!isNaN(guess)) {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.fib start`' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { points: 0, correct: 0, attempts: 0, streak: 0 }
      game.scores[sender].attempts++
      const timeTaken = (Date.now() - game.startTime) / 1000

      if (guess === game.answer) {
        // CORRECT
        game.scores[sender].correct++
        game.scores[sender].streak++
        game.scores[sender].points += 15

        let bonus = 0
        if (game.scores[sender].streak >= 3) bonus += 8
        if (timeTaken < 10) bonus += 5
        if (bonus) game.scores[sender].points += bonus

        await showTyping(sock, from)
        await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })

        clearTimeout(game.roundTimer)
        await sock.sendMessage(from, {
          text: `╭─⌈ 🎉 *CORRECT* ⌋
│ Sequence: ${game.sequence.join(', ')}, *${guess}* ✅
│ ${game.sequence[game.sequence.length-2]} + ${game.sequence[game.sequence.length-1]} = ${guess}
│ Time: ${timeTaken.toFixed(1)}s
│ +15 points ${bonus? `+${bonus} bonus` : ''}
│ Streak: ${game.scores[sender].streak} 🔥
│ Total: ${game.scores[sender].points} pts
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })

        setTimeout(() => nextRound(from, sock, botSettings), 2000)

      } else {
        // WRONG
        game.scores[sender].points -= 3
        game.scores[sender].streak = 0

        await showTyping(sock, from)
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        await sock.sendMessage(from, {
          text: `╭─⌈ ❌ *WRONG* ⌋
│ Your answer: ${guess}
│ Correct: ${game.sequence[game.sequence.length-2]} + ${game.sequence[game.sequence.length-1]} = ${game.answer}
│ -3 points
│ Streak reset
│ Total: ${game.scores[sender].points} pts
│
│ Try next sequence!
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })

        setTimeout(() => nextRound(from, sock, botSettings), 2000)
      }
      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, <number>, hint, skip, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[FIBONACCI ERROR]', err.message)
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
  const { sequence, next } = generateSequence(game.sequence.length)
  game.sequence = sequence
  game.answer = next

  await showTyping(sock, chatJid)
  await sock.sendMessage(chatJid, {
    text: `╭─⌈ 🌀 *Round ${game.round}* ⌋
│ Sequence: *${sequence.join(', ')},?*
│
│ What comes next?
│ Type: ${botSettings.prefix}fib <number>
│ Time: 30s
╰⊷ *Powered By Bunny Tech*`
  })

  clearTimeout(game.roundTimer)
  game.roundTimer = setTimeout(async () => {
    await showTyping(sock, chatJid)
    await sock.sendMessage(chatJid, {
      text: `╭─⌈ ⏰ *Time Up* ⌋
│ Sequence: ${sequence.join(', ')}, *${next}*
│ ${sequence[sequence.length-2]} + ${sequence[sequence.length-1]} = ${next}
│ Next round...
╰⊷ *Powered By Bunny Tech*`
    })
    nextRound(chatJid, sock, botSettings)
  }, 30000)
}