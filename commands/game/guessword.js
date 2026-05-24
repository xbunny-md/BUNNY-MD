// commands/game/guessword.js
export const name = 'guessword'
export const alias = ['gw', 'guess', 'wordguess']
export const category = 'Game'
export const desc = 'GuessWord: Bot gives hint, you guess the word'

const activeGames = new Map()

const wordBank = [
  { word: 'PYTHON', hints: ['Programming language', 'Named after a snake', 'Has pip'] },
  { word: 'WHATSAPP', hints: ['Messaging app', 'Green icon', 'Meta owned'] },
  { word: 'ELEPHANT', hints: ['Largest land animal', 'Has trunk', 'Big ears'] },
  { word: 'BANANA', hints: ['Yellow fruit', 'Monkeys love it', 'Peel it'] },
  { word: 'COMPUTER', hints: 'You use it daily', 'Has keyboard', 'Runs software' },
  { word: 'TANZANIA', hints: ['East African country', 'Kilimanjaro', 'Dodoma capital'] },
  { word: 'INTERNET', hints: ['Global network', 'www', 'You are on it'] },
  { word: 'BICYCLE', hints: ['Two wheels', 'Pedals', 'No fuel needed'] },
  { word: 'CHOCOLATE', hints: ['Sweet brown', 'Cocoa bean', 'Kids love it'] },
  { word: 'KEYBOARD', hints: ['Has QWERTY', 'Input device', 'Many keys'] },
  { word: 'GIRAFFE', hints: ['Tallest animal', 'Long neck', 'Yellow spots'] },
  { word: 'SUPABASE', hints: ['Database platform', 'PostgreSQL', 'Backend as service'] },
  { word: 'MOUNTAIN', hints: ['Very high land', 'Peak', 'Climbing'] },
  { word: 'JAVASCRIPT', hints: ['Web language', 'Runs in browser', 'Node.js'] },
  { word: 'BUNNY', hints: ['Cute animal', 'Long ears', 'Hops'] }
]

function getRandomWord() {
  return wordBank[Math.floor(Math.random() * wordBank.length)]
}

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    clearInterval(game.hintInterval)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

export default async function guessword(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '💡', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *GuessWord* ⌋
│ Bot gives hints, guess the word
│
│ *Commands:*
│ ${botSettings.prefix}gw start - New word
│ ${botSettings.prefix}gw guess <word> - Submit answer
│ ${botSettings.prefix}gw hint - Get another hint
│ ${botSettings.prefix}gw skip - Skip word
│ ${botSettings.prefix}gw stop - End game
│ ${botSettings.prefix}gw score - Your score
│
│ *Scoring:*
│ 1st guess: +15 pts
│ 2nd guess: +10 pts
│ 3rd guess: +5 pts
│ Wrong: -1 pt
│ Hint: -2 pts
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
          scoreText += `│ Solved: ${data.solved} | Attempts: ${data.attempts}\n`
        })
      }
      scoreText += `│\n│ Current word: ${game.hintCount}/3 hints used\n`
      scoreText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: scoreText }, { quoted: msg })
    }

    // 3. STOP
    if (action === 'stop' || action === 'end') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      clearGame(from) // FUTA CACHE
      await sock.sendMessage(from, { react: { text: '🛑', key: msg.key } })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 🛑 *Game Ended* ⌋
│ Word was: *${game.currentWord}*
│ Solved: ${game.totalSolved} words
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 4. START
    if (action === 'start') {
      if (activeGames.has(from)) {
        return await sock.sendMessage(from, { text: '> Game running! Use `.gw guess <word>`' }, { quoted: msg })
      }

      const { word, hints } = getRandomWord()

      const gameData = {
        currentWord: word,
        hints: hints,
        hintIndex: 0,
        hintCount: 1,
        attempts: 0,
        scores: {},
        totalSolved: 0,
        timeout: null,
        hintInterval: null
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *Guess The Word* ⌋
│ Hint 1: ${hints[0]}
│ Letters: ${word.length}
│
│ Guess: ${botSettings.prefix}gw guess <word>
│ More hint: ${botSettings.prefix}gw hint
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Auto hint every 15s
      gameData.hintInterval = setInterval(async () => {
        if (gameData.hintIndex < 2) {
          gameData.hintIndex++
          gameData.hintCount++
          await sock.sendMessage(from, {
            text: `╭─⌈ 💡 *Hint ${gameData.hintCount}* ⌋
│ ${hints[gameData.hintIndex]}
╰⊷ *Powered By Bunny Tech*`
          })
        }
      }, 15000)

      // Auto timeout 60s
      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word was: *${word}*
│ Game ended
╰⊷ *Powered By Bunny Tech*`
        })
      }, 60000)

      return
    }

    // 5. HINT
    if (action === 'hint') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })
      if (game.hintIndex >= 2) return await sock.sendMessage(from, { text: '> All hints used!' }, { quoted: msg })

      game.hintIndex++
      game.hintCount++

      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, attempts: 0 }
      game.scores[sender].points -= 2

      await sock.sendMessage(from, { react: { text: '💡', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *Hint ${game.hintCount}* ⌋
│ ${game.hints[game.hintIndex]}
│ -2 points
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SKIP
    if (action === 'skip') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const oldWord = game.currentWord
      const { word, hints } = getRandomWord()

      clearTimeout(game.timeout)
      clearInterval(game.hintInterval)

      game.currentWord = word
      game.hints = hints
      game.hintIndex = 0
      game.hintCount = 1
      game.attempts = 0

      await sock.sendMessage(from, { react: { text: '⏭️', key: msg.key } })
      await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *Skipped* ⌋
│ Previous: *${oldWord}*
│
│ *New Word:*
│ Hint 1: ${hints[0]}
│ Letters: ${word.length}
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // New intervals
      game.hintInterval = setInterval(async () => {
        if (game.hintIndex < 2) {
          game.hintIndex++
          game.hintCount++
          await sock.sendMessage(from, { text: `> 💡 Hint ${game.hintCount}: ${hints[game.hintIndex]}` })
        }
      }, 15000)

      game.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Time up! Word was: *${word}*` })
      }, 60000)

      return
    }

    // 7. GUESS
    if (action === 'guess' || action === 'g') {
      const guess = args[1]?.toUpperCase()
      if (!guess) return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}gw guess <word>` }, { quoted: msg })

      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.gw start`' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, attempts: 0 }
      game.attempts++
      game.scores[sender].attempts++

      if (guess === game.currentWord) {
        // CORRECT
        const points = game.attempts === 1? 15 : game.attempts === 2? 10 : 5
        game.scores[sender].points += points
        game.scores[sender].solved++
        game.totalSolved++

        await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })

        const { word, hints } = getRandomWord()
        const oldWord = game.currentWord

        clearTimeout(game.timeout)
        clearInterval(game.hintInterval)

        game.currentWord = word
        game.hints = hints
        game.hintIndex = 0
        game.hintCount = 1
        game.attempts = 0

        await sock.sendMessage(from, {
          text: `╭─⌈ 🎉 *CORRECT* ⌋
│ Answer: *${oldWord}*
│ +${points} points @${sender.split('@')[0]}
│ Total: ${game.scores[sender].points} pts
│
│ *Next Word:*
│ Hint 1: ${hints[0]}
│ Letters: ${word.length}
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })

        // New intervals
        game.hintInterval = setInterval(async () => {
          if (game.hintIndex < 2) {
            game.hintIndex++
            game.hintCount++
            await sock.sendMessage(from, { text: `> 💡 Hint ${game.hintCount}: ${hints[game.hintIndex]}` })
          }
        }, 15000)

        game.timeout = setTimeout(() => {
          clearGame(from) // FUTA CACHE
          sock.sendMessage(from, { text: `> ⏰ Time up! Word was: *${word}*` })
        }, 60000)

      } else {
        // WRONG
        game.scores[sender].points -= 1

        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        await sock.sendMessage(from, {
          text: `╭─⌈ ❌ *WRONG* ⌋
│ Your guess: ${guess}
│ -1 point
│ Attempts: ${game.attempts}
│ Total: ${game.scores[sender].points} pts
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })
      }
      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, guess, hint, skip, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[GUESSWORD ERROR]', err.message)
    clearGame(from) // FUTA CACHE KAMA ERROR
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error. Cache cleared.' }, { quoted: msg })
  }
}