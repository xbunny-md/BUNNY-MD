// commands/game/oddeven.js
export const name = 'oddeven'
export const alias = ['oe', 'odd', 'even']
export const category = 'Game'
export const desc = 'OddEven: Bot picks number, you guess odd or even'

const activeGames = new Map()

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    clearTimeout(game.roundTimer)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

function generateNumber(difficulty) {
  let max = 10
  if (difficulty === 'normal') max = 100
  if (difficulty === 'hard') max = 1000
  return Math.floor(Math.random() * max) + 1
}

export default async function oddeven(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🎲', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎲 *OddEven* ⌋
│ Bot picks secret number
│ Guess if it's ODD or EVEN
│
│ *Commands:*
│ ${botSettings.prefix}oe start - Easy 1-10
│ ${botSettings.prefix}oe start normal - Normal 1-100
│ ${botSettings.prefix}oe start hard - Hard 1-1000
│ ${botSettings.prefix}oe odd - Guess ODD
│ ${botSettings.prefix}oe even - Guess EVEN
│ ${botSettings.prefix}oe stop - End game
│ ${botSettings.prefix}oe score - Your score
│
│ *Scoring:*
│ Correct: +8 points
│ Wrong: -3 points
│ Streak 5+: +10 bonus
│ Fast <3s: +5 bonus
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
          const accuracy = data.attempts > 0? ((data.correct / data.attempts) * 100).toFixed(0) : 0
          scoreText += `│ ${medal} ${user.split('@')[0]}: ${data.points} pts\n`
          scoreText += `│ Wins: ${data.correct} | Streak: ${data.streak} 🔥 | ${accuracy}%\n`
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
      endText += `│ Number was: *${game.currentNumber}* - ${game.currentNumber % 2 === 0? 'EVEN' : 'ODD'}\n`
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
        return await sock.sendMessage(from, { text: '> Game running! Guess ODD or EVEN.' }, { quoted: msg })
      }

      const difficulty = args[1]?.toLowerCase() || 'easy'
      const number = generateNumber(difficulty)
      const isEven = number % 2 === 0

      const gameData = {
        currentNumber: number,
        isEven: isEven,
        difficulty: difficulty,
        scores: {},
        round: 1,
        startTime: Date.now(),
        timeout: null,
        roundTimer: null,
        winner: null
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const maxRange = difficulty === 'easy'? '1-10' : difficulty === 'normal'? '1-100' : '1-1000'
      const sent = await sock.sendMessage(from, {
        text: `╭─⌈ 🎲 *OddEven* ⌋
│ Round 1 - ${difficulty.toUpperCase()}
│
│ I picked a number: *${maxRange}*
│ Is it ODD or EVEN?
│
│ Type: ${botSettings.prefix}oe odd / even
│ Time: 15s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Round timeout 15s
      gameData.roundTimer = setTimeout(async () => {
        if (!gameData.winner) {
          await sock.sendMessage(from, {
            text: `╭─⌈ ⏰ *Time Up* ⌋
│ Number: *${number}* - ${isEven? 'EVEN' : 'ODD'}
│ No winner
│ Next round...
╰⊷ *Powered By Bunny Tech*`
          })
          nextRound(from, sock, botSettings)
        }
      }, 15000)

      // Game timeout 90s
      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Game ended! Total rounds: ${gameData.round}` })
      }, 90000)

      return
    }

    // 5. GUESS - ODD/EVEN
    if (action === 'odd' || action === 'even' || action === 'o' || action === 'e') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.oe start`' }, { quoted: msg })
      if (game.winner) return await sock.sendMessage(from, { text: '> Round already won! Wait for next...' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { points: 0, correct: 0, attempts: 0, streak: 0 }
      game.scores[sender].attempts++

      const guessEven = action === 'even' || action === 'e'
      const timeTaken = (Date.now() - game.startTime) / 1000

      if (guessEven === game.isEven) {
        // CORRECT
        game.winner = sender
        game.scores[sender].correct++
        game.scores[sender].streak++
        game.scores[sender].points += 8

        let bonus = 0
        if (game.scores[sender].streak >= 5) bonus += 10
        if (timeTaken < 3) bonus += 5
        game.scores[sender].points += bonus

        await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })

        clearTimeout(game.roundTimer)
        await sock.sendMessage(from, {
          text: `╭─⌈ 🎉 *CORRECT* ⌋
│ Number: *${game.currentNumber}* - ${game.isEven? 'EVEN' : 'ODD'} ✅
│ Your guess: ${guessEven? 'EVEN' : 'ODD'}
│ Winner: @${sender.split('@')[0]}
│ Time: ${timeTaken.toFixed(1)}s
│ +8 points ${bonus? `+${bonus} bonus` : ''}
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

        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        await sock.sendMessage(from, {
          text: `╭─⌈ ❌ *WRONG* ⌋
│ Your guess: ${guessEven? 'EVEN' : 'ODD'}
│ Number is: ${game.isEven? 'EVEN' : 'ODD'}
│ -3 points
│ Streak reset
│ Total: ${game.scores[sender].points} pts
│
│ Wait for next round!
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })
      }
      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, odd, even, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[ODDEVEN ERROR]', err.message)
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
  game.winner = null
  const number = generateNumber(game.difficulty)
  game.currentNumber = number
  game.isEven = number % 2 === 0

  const maxRange = game.difficulty === 'easy'? '1-10' : game.difficulty === 'normal'? '1-100' : '1-1000'

  await sock.sendMessage(chatJid, {
    text: `╭─⌈ 🎲 *Round ${game.round}* ⌋
│ I picked a number: *${maxRange}*
│ Is it ODD or EVEN?
│
│ Type: ${botSettings.prefix}oe odd / even
│ Time: 15s
╰⊷ *Powered By Bunny Tech*`
  })

  clearTimeout(game.roundTimer)
  game.roundTimer = setTimeout(async () => {
    if (!game.winner) {
      await sock.sendMessage(chatJid, {
        text: `╭─⌈ ⏰ *Time Up* ⌋
│ Number: *${number}* - ${game.isEven? 'EVEN' : 'ODD'}
│ No winner
│ Next round...
╰⊷ *Powered By Bunny Tech*`
      })
      nextRound(chatJid, sock, botSettings)
    }
  }, 15000)
}