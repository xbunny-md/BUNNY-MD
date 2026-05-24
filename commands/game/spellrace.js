// commands/game/spellrace.js
export const name = 'spellrace'
export const alias = ['sr', 'spell', 'typerace']
export const category = 'Game'
export const desc = 'SpellRace: Type the word fast before time runs out'

const activeGames = new Map()

const wordBank = {
  easy: ['CAT', 'DOG', 'SUN', 'MOON', 'STAR', 'FISH', 'BIRD', 'TREE', 'BOOK', 'BALL', 'FIRE', 'WATER', 'HOUSE', 'CHAIR', 'PHONE'],
  normal: ['BANANA', 'ELEPHANT', 'COMPUTER', 'KEYBOARD', 'INTERNET', 'WHATSAPP', 'GIRAFFE', 'BICYCLE', 'MOUNTAIN', 'CHOCOLATE', 'PYRAMID', 'DIAMOND', 'RAINBOW', 'KANGAROO'],
  hard: ['JAVASCRIPT', 'SUPABASE', 'TANZANIA', 'UNIVERSITY', 'ALGORITHM', 'DATABASE', 'FRAMEWORK', 'TECHNOLOGY', 'DEVELOPER', 'KEYBOARD', 'EXCELLENT', 'DIFFICULT', 'KNOWLEDGE']
}

function getRandomWord(difficulty) {
  const words = wordBank[difficulty] || wordBank.normal
  return words[Math.floor(Math.random() * words.length)]
}

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    clearTimeout(game.roundTimer)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

export default async function spellrace(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '⌨️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⌨️ *SpellRace* ⌋
│ Type the word as fast as you can
│ First to type correctly wins
│
│ *Commands:*
│ ${botSettings.prefix}sr start - Normal mode
│ ${botSettings.prefix}sr start easy - Easy words
│ ${botSettings.prefix}sr start hard - Hard words
│ ${botSettings.prefix}sr <word> - Type the word
│ ${botSettings.prefix}sr stop - End game
│ ${botSettings.prefix}sr score - Your score
│
│ *Scoring:*
│ <2s: +20 pts
│ 2-4s: +15 pts
│ 4-7s: +10 pts
│ 7s+: +5 pts
│ Wrong: -2 pts
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
          scoreText += `│ Solved: ${data.solved} | Best: ${data.bestTime.toFixed(1)}s\n`
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

      let endText = `╭─⌈ 🛑 *Race Ended* ⌋\n`
      endText += `│ Word was: *${game.currentWord}*\n`
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
        return await sock.sendMessage(from, { text: '> Race running! Type the word now!' }, { quoted: msg })
      }

      const difficulty = args[1]?.toLowerCase() || 'normal'
      const word = getRandomWord(difficulty)

      const gameData = {
        currentWord: word,
        difficulty: difficulty,
        round: 1,
        scores: {},
        startTime: Date.now(),
        timeout: null,
        roundTimer: null,
        winner: null
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: `╭─⌈ ⌨️ *SpellRace* ⌋
│ Round 1 - ${difficulty.toUpperCase()}
│
│ *${word}*
│
│ Type it: ${botSettings.prefix}sr ${word}
│ Time: 10s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Round timeout 10s
      gameData.roundTimer = setTimeout(async () => {
        if (!gameData.winner) {
          await sock.sendMessage(from, {
            text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word: *${word}*
│ No winner
│ Next round...
╰⊷ *Powered By Bunny Tech*`
          })
          nextRound(from, sock, botSettings)
        }
      }, 10000)

      // Game timeout 90s
      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Race ended! Total rounds: ${gameData.round}` })
      }, 90000)

      return
    }

    // 5. ANSWER - WORD DIRECT
    const guess = args[0]?.toUpperCase()
    if (guess) {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active race. Start with `.sr start`' }, { quoted: msg })
      if (game.winner) return await sock.sendMessage(from, { text: '> Round already won! Wait for next...' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, totalTime: 0, bestTime: 999 }

      if (guess === game.currentWord) {
        // CORRECT
        game.winner = sender
        const timeTaken = (Date.now() - game.startTime) / 1000

        let points = 5
        if (timeTaken < 2) points = 20
        else if (timeTaken < 4) points = 15
        else if (timeTaken < 7) points = 10

        game.scores[sender].points += points
        game.scores[sender].solved++
        game.scores[sender].totalTime += timeTaken

        if (timeTaken < game.scores[sender].bestTime) {
          game.scores[sender].bestTime = timeTaken
        }

        await sock.sendMessage(from, { react: { text: '🏆', key: msg.key } })

        clearTimeout(game.roundTimer)
        await sock.sendMessage(from, {
          text: `╭─⌈ 🏆 *WINNER* ⌋
│ Word: *${game.currentWord}*
│ Winner: @${sender.split('@')[0]}
│ Time: ${timeTaken.toFixed(2)}s ⚡
│ +${points} points
│ Total: ${game.scores[sender].points} pts
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })

        setTimeout(() => nextRound(from, sock, botSettings), 2000)

      } else {
        // WRONG
        game.scores[sender].points -= 2

        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        await sock.sendMessage(from, {
          text: `╭─⌈ ❌ *WRONG* ⌋
│ You typed: ${guess}
│ Correct: *${game.currentWord}*
│ -2 points
│ Total: ${game.scores[sender].points} pts
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })
      }
      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, <word>, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[SPELLRACE ERROR]', err.message)
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
  const word = getRandomWord(game.difficulty)
  game.currentWord = word

  await sock.sendMessage(chatJid, {
    text: `╭─⌈ ⌨️ *Round ${game.round}* ⌋
│ *${word}*
│
│ Type it: ${botSettings.prefix}sr ${word}
│ Time: 10s
╰⊷ *Powered By Bunny Tech*`
  })

  clearTimeout(game.roundTimer)
  game.roundTimer = setTimeout(async () => {
    if (!game.winner) {
      await sock.sendMessage(chatJid, {
        text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word: *${word}*
│ No winner
│ Next round...
╰⊷ *Powered By Bunny Tech*`
      })
      nextRound(chatJid, sock, botSettings)
    }
  }, 10000)
}