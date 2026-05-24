// commands/game/anagram.js
export const name = 'anagram'
export const alias = ['ana', 'anag', 'rearrange']
export const category = 'Game'
export const desc = 'Anagram: Rearrange letters to form correct word. Example: LISTEN → SILENT'

const activeGames = new Map()

const wordBank = [
  { word: 'LISTEN', hint: 'Pay attention with ears' },
  { word: 'SILENT', hint: 'No sound' },
  { word: 'EARTH', hint: 'Our planet' },
  { word: 'HEART', hint: 'Pumps blood' },
  { word: 'ANGEL', hint: 'Heavenly being' },
  { word: 'ANGLE', hint: 'Geometry term' },
  { word: 'NIGHT', hint: 'Opposite of day' },
  { word: 'THING', hint: 'An object' },
  { word: 'RACE', hint: 'Speed competition' },
  { word: 'CARE', hint: 'Look after' },
  { word: 'MEAT', hint: 'Animal flesh food' },
  { word: 'TEAM', hint: 'Group working together' },
  { word: 'BRAIN', hint: 'Think with this' },
  { word: 'TRAIN', hint: 'Railway vehicle' },
  { word: 'STONE', hint: 'Hard rock' },
  { word: 'NOTES', hint: 'Write them down' },
  { word: 'WATER', hint: 'H2O liquid' },
  { word: 'WRITE', hint: 'Put words on paper' },
  { word: 'LATER', hint: 'After now' },
  { word: 'ALERT', hint: 'Warning signal' }
]

function scrambleWord(word) {
  const arr = word.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const scrambled = arr.join('')
  return scrambled === word? scrambleWord(word) : scrambled
}

function getRandomWord() {
  return wordBank[Math.floor(Math.random() * wordBank.length)]
}

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

export default async function anagram(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🔄', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔄 *Anagram* ⌋
│ Rearrange letters to form word
│ Example: LISTEN → SILENT
│
│ *Commands:*
│ ${botSettings.prefix}ana start - New word
│ ${botSettings.prefix}ana guess <word> - Submit answer
│ ${botSettings.prefix}ana hint - Get hint
│ ${botSettings.prefix}ana shuffle - Reshuffle letters
│ ${botSettings.prefix}ana skip - Skip word
│ ${botSettings.prefix}ana stop - End game
│ ${botSettings.prefix}ana score - Your score
│
│ *Scoring:*
│ Correct: +12 points
│ Wrong: -2 points
│ Hint: -4 points
│ Shuffle: -1 point
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
      scoreText += `│\n│ Words solved: ${game.totalSolved}\n`
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
      endText += `│ Word was: *${game.currentWord}*\n`
      endText += `│ Solved: ${game.totalSolved} words\n│\n`

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
        return await sock.sendMessage(from, { text: '> Game running! Use `.ana guess <word>`' }, { quoted: msg })
      }

      const { word, hint } = getRandomWord()
      const scrambled = scrambleWord(word)

      const gameData = {
        currentWord: word,
        scrambled: scrambled,
        hint: hint,
        hintUsed: false,
        scores: {},
        totalSolved: 0,
        timeout: null
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: `╭─⌈ 🔄 *Anagram* ⌋
│ Scrambled: *${scrambled}*
│ Letters: ${word.length}
│
│ Rearrange to form word!
│ Guess: ${botSettings.prefix}ana guess <word>
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word was: *${word}*
│ Hint: ${hint}
╰⊷ *Powered By Bunny Tech*`
        })
      }, 90000)

      return
    }

    // 5. HINT
    if (action === 'hint') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })
      if (game.hintUsed) return await sock.sendMessage(from, { text: '> Hint already used!' }, { quoted: msg })

      game.hintUsed = true
      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, streak: 0 }
      game.scores[sender].points -= 4

      await sock.sendMessage(from, { react: { text: '💡', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *Hint* ⌋
│ ${game.hint}
│ First letter: *${game.currentWord[0]}*
│ Last letter: *${game.currentWord.slice(-1)}*
│ -4 points
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SHUFFLE
    if (action === 'shuffle' || action === 'reshuffle') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      game.scrambled = scrambleWord(game.currentWord)
      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, streak: 0 }
      game.scores[sender].points -= 1

      await sock.sendMessage(from, { react: { text: '🔄', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔄 *Reshuffled* ⌋
│ New: *${game.scrambled}*
│ -1 point
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 7. SKIP
    if (action === 'skip') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const oldWord = game.currentWord
      const { word, hint } = getRandomWord()
      const scrambled = scrambleWord(word)

      clearTimeout(game.timeout)
      game.currentWord = word
      game.scrambled = scrambled
      game.hint = hint
      game.hintUsed = false

      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, streak: 0 }
      game.scores[sender].streak = 0

      await sock.sendMessage(from, { react: { text: '⏭️', key: msg.key } })
      await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *Skipped* ⌋
│ Previous: *${oldWord}*
│
│ *New Word:*
│ Scrambled: *${scrambled}*
│ Letters: ${word.length}
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      game.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Time up! Word was: *${word}*` })
      }, 90000)

      return
    }

    // 8. GUESS
    if (action === 'guess' || action === 'g') {
      const guess = args[1]?.toUpperCase()
      if (!guess) return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}ana guess <word>` }, { quoted: msg })

      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.ana start`' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { points: 0, solved: 0, streak: 0 }

      if (guess === game.currentWord) {
        // CORRECT
        game.scores[sender].solved++
        game.scores[sender].streak++
        game.scores[sender].points += 12
        game.totalSolved++

        const bonus = game.scores[sender].streak >= 3? 5 : 0
        if (bonus) game.scores[sender].points += bonus

        await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })

        const { word, hint } = getRandomWord()
        const scrambled = scrambleWord(word)
        const oldWord = game.currentWord

        clearTimeout(game.timeout)
        game.currentWord = word
        game.scrambled = scrambled
        game.hint = hint
        game.hintUsed = false

        await sock.sendMessage(from, {
          text: `╭─⌈ 🎉 *CORRECT* ⌋
│ Answer: *${oldWord}*
│ +12 points @${sender.split('@')[0]}
│ Streak: ${game.scores[sender].streak} 🔥 ${bonus? `+${bonus} bonus` : ''}
│ Total: ${game.scores[sender].points} pts
│
│ *Next Word:*
│ Scrambled: *${scrambled}*
│ Letters: ${word.length}
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })

        game.timeout = setTimeout(() => {
          clearGame(from) // FUTA CACHE
          sock.sendMessage(from, { text: `> ⏰ Time up! Word was: *${word}*` })
        }, 90000)

      } else {
        // WRONG
        game.scores[sender].points -= 2
        game.scores[sender].streak = 0

        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        await sock.sendMessage(from, {
          text: `╭─⌈ ❌ *WRONG* ⌋
│ Your guess: ${guess}
│ -2 points
│ Streak broken
│ Total: ${game.scores[sender].points} pts
│
│ Scrambled: *${game.scrambled}*
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })
      }
      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, guess, hint, shuffle, skip, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[ANAGRAM ERROR]', err.message)
    clearGame(from) // FUTA CACHE KAMA ERROR
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error. Cache cleared.' }, { quoted: msg })
  }
}