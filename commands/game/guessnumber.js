// commands/game/guessnumber.js
export const name = 'guessnumber'
export const alias = ['gn', 'number', 'guessnum']
export const category = 'Game'
export const desc = 'GuessNumber: Guess 1-100, bot says higher/lower'

const activeGames = new Map()

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

function getRangeText(difficulty) {
  switch(difficulty) {
    case 'easy': return '1-50'
    case 'hard': return '1-500'
    default: return '1-100'
  }
}

function getMaxNumber(difficulty) {
  switch(difficulty) {
    case 'easy': return 50
    case 'hard': return 500
    default: return 100
  }
}

export default async function guessnumber(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🔢', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔢 *GuessNumber* ⌋
│ Guess the secret number
│ Bot says higher or lower
│
│ *Commands:*
│ ${botSettings.prefix}gn start - Normal 1-100
│ ${botSettings.prefix}gn start easy - Easy 1-50
│ ${botSettings.prefix}gn start hard - Hard 1-500
│ ${botSettings.prefix}gn <number> - Make guess
│ ${botSettings.prefix}gn stop - End game
│ ${botSettings.prefix}gn score - Your score
│
│ *Scoring:*
│ 1-3 tries: +20 pts
│ 4-6 tries: +15 pts
│ 7-10 tries: +10 pts
│ 10+ tries: +5 pts
│ Wrong: -1 pt
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
          scoreText += `│ Wins: ${data.wins} | Best: ${data.bestTries || '-'} tries\n`
        })
      }
      scoreText += `│\n│ Range: ${getRangeText(game.difficulty)}\n`
      scoreText += `│ Attempts: ${game.attempts}\n`
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
      endText += `│ Number was: *${game.secretNumber}*\n`
      endText += `│ Range: ${getRangeText(game.difficulty)}\n`
      endText += `│ Attempts: ${game.attempts}\n│\n`

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
        return await sock.sendMessage(from, { text: '> Game running! Use `.gn <number>`' }, { quoted: msg })
      }

      const difficulty = args[1]?.toLowerCase() || 'normal'
      const maxNum = getMaxNumber(difficulty)
      const secretNumber = Math.floor(Math.random() * maxNum) + 1

      const gameData = {
        secretNumber: secretNumber,
        difficulty: difficulty,
        attempts: 0,
        scores: {},
        timeout: null,
        players: new Set()
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: `╭─⌈ 🔢 *GuessNumber* ⌋
│ I'm thinking of ${getRangeText(difficulty)}
│
│ Guess: ${botSettings.prefix}gn <number>
│ Difficulty: ${difficulty.toUpperCase()}
│ Time: 180s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Number was: *${secretNumber}*
│ Game ended
╰⊷ *Powered By Bunny Tech*`
        })
      }, 180000)

      return
    }

    // 5. GUESS - NUMBER DIRECT
    const guess = parseInt(action)
    if (!isNaN(guess)) {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.gn start`' }, { quoted: msg })

      const maxNum = getMaxNumber(game.difficulty)
      if (guess < 1 || guess > maxNum) {
        return await sock.sendMessage(from, { text: `> Number must be ${getRangeText(game.difficulty)}` }, { quoted: msg })
      }

      if (!game.scores[sender]) game.scores[sender] = { points: 0, wins: 0, bestTries: null }
      game.attempts++
      game.players.add(sender)

      if (guess === game.secretNumber) {
        // CORRECT
        let points = 5
        if (game.attempts <= 3) points = 20
        else if (game.attempts <= 6) points = 15
        else if (game.attempts <= 10) points = 10

        game.scores[sender].points += points
        game.scores[sender].wins++

        if (!game.scores[sender].bestTries || game.attempts < game.scores[sender].bestTries) {
          game.scores[sender].bestTries = game.attempts
        }

        await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })

        const newNumber = Math.floor(Math.random() * maxNum) + 1
        const oldNumber = game.secretNumber
        const oldAttempts = game.attempts

        clearTimeout(game.timeout)
        game.secretNumber = newNumber
        game.attempts = 0

        await sock.sendMessage(from, {
          text: `╭─⌈ 🎉 *CORRECT* ⌋
│ Number: *${oldNumber}*
│ Guessed in: ${oldAttempts} tries
│ +${points} points @${sender.split('@')[0]}
│ Total: ${game.scores[sender].points} pts
│
│ *New Round:*
│ I'm thinking of ${getRangeText(game.difficulty)}
│ Guess again!
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })

        game.timeout = setTimeout(() => {
          clearGame(from) // FUTA CACHE
          sock.sendMessage(from, { text: `> ⏰ Time up! Number was: *${newNumber}*` })
        }, 180000)

      } else {
        // WRONG
        game.scores[sender].points -= 1
        const hint = guess < game.secretNumber? 'HIGHER ⬆️' : 'LOWER ⬇️'
        const diff = Math.abs(guess - game.secretNumber)
        let temp = ''

        if (diff <= 5) temp = '🔥 VERY HOT'
        else if (diff <= 10) temp = '♨️ HOT'
        else if (diff <= 20) temp = '🌡️ WARM'
        else if (diff <= 50) temp = '❄️ COLD'
        else temp = '🧊 VERY COLD'

        await sock.sendMessage(from, { react: { text: guess < game.secretNumber? '⬆️' : '⬇️', key: msg.key } })
        await sock.sendMessage(from, {
          text: `╭─⌈ ${hint} ⌋
│ Your guess: ${guess}
│ ${temp}
│ Attempts: ${game.attempts}
│ -1 point
│ Total: ${game.scores[sender].points} pts
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })
      }
      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, <number>, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[GUESSNUMBER ERROR]', err.message)
    clearGame(from) // FUTA CACHE KAMA ERROR
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error. Cache cleared.' }, { quoted: msg })
  }
}