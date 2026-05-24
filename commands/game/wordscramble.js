// commands/game/wordscramble.js
export const name = 'wordscramble'
export const alias = ['ws', 'scramble', 'unscramble']
export const category = 'Game'
export const desc = 'WordScramble: Unscramble jumbled words. Example: NABANA → BANANA'

const activeGames = new Map()

const wordBank = [
  { word: 'BANANA', hint: 'Yellow fruit' },
  { word: 'ELEPHANT', hint: 'Largest land animal' },
  { word: 'COMPUTER', hint: 'You are using it now' },
  { word: 'WHATSAPP', hint: 'Messaging app' },
  { word: 'PYTHON', hint: 'Programming language' },
  { word: 'JAVASCRIPT', hint: 'Web language' },
  { word: 'BUNNY', hint: 'Cute furry animal' },
  { word: 'KEYBOARD', hint: 'Has many keys' },
  { word: 'INTERNET', hint: 'Global network' },
  { word: 'GIRAFFE', hint: 'Tallest animal' },
  { word: 'TANZANIA', hint: 'East African country' },
  { word: 'BICYCLE', hint: 'Two wheels' },
  { word: 'CHOCOLATE', hint: 'Sweet brown treat' },
  { word: 'MOUNTAIN', hint: 'Very high land' },
  { word: 'SUPABASE', hint: 'Database platform' }
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

export default async function wordscramble(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🔤', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔤 *WordScramble* ⌋
│ Unscramble jumbled words
│ Example: NABANA → BANANA
│
│ *Commands:*
│ ${botSettings.prefix}ws start - New word
│ ${botSettings.prefix}ws guess <word> - Submit answer
│ ${botSettings.prefix}ws hint - Get hint
│ ${botSettings.prefix}ws skip - Skip word
│ ${botSettings.prefix}ws stop - End game
│ ${botSettings.prefix}ws score - Your score
│
│ *Scoring:*
│ Correct: +10 points
│ Wrong: -2 points
│ Hint used: -3 points
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 2. SCORE
    if (action === 'score' || action === 'stats') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.ws start`' }, { quoted: msg })

      const playerScore = game.scores[sender] || { correct: 0, wrong: 0, points: 0 }

      return await sock.sendMessage(from, {
        text: `╭─⌈ 📊 *Your Score* ⌋
│ Player: @${sender.split('@')[0]}
│ Points: ${playerScore.points} ⭐
│ Correct: ${playerScore.correct} ✅
│ Wrong: ${playerScore.wrong} ❌
│ Words solved: ${game.solved}
╰⊷ *Powered By Bunny Tech*`,
        mentions: [sender]
      }, { quoted: msg })
    }

    // 3. STOP
    if (action === 'stop' || action === 'end') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      clearTimeout(game.timeout)
      activeGames.delete(from)
      await sock.sendMessage(from, { react: { text: '🛑', key: msg.key } })

      let endText = `╭─⌈ 🛑 *Game Ended* ⌋\n`
      endText += `│ Words solved: ${game.solved}\n│\n`

      const sorted = Object.entries(game.scores).sort((a, b) => b[1].points - a[1].points)
      if (sorted.length > 0) {
        endText += `│ *Final Scores:*\n`
        sorted.forEach(([user, data], i) => {
          const medal = i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : '🎯'
          endText += `│ ${medal} ${user.split('@')[0]}: ${data.points} pts\n`
        })
      }
      endText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: endText }, { quoted: msg })
    }

    // 4. START
    if (action === 'start') {
      if (activeGames.has(from)) {
        return await sock.sendMessage(from, { text: '> Game already running! Use `.ws guess <word>`' }, { quoted: msg })
      }

      const { word, hint } = getRandomWord()
      const scrambled = scrambleWord(word)

      const gameData = {
        currentWord: word,
        scrambled: scrambled,
        hint: hint,
        hintUsed: false,
        scores: {},
        solved: 0,
        timeout: null
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: `╭─⌈ 🔤 *Unscramble This* ⌋
│ Scrambled: *${scrambled}*
│ Letters: ${word.length}
│
│ Guess: ${botSettings.prefix}ws guess <word>
│ Hint: ${botSettings.prefix}ws hint (-3 pts)
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Auto timeout 60s
      gameData.timeout = setTimeout(() => {
        activeGames.delete(from)
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
      if (game.hintUsed) return await sock.sendMessage(from, { text: '> Hint already used!' }, { quoted: msg })

      game.hintUsed = true
      if (!game.scores[sender]) game.scores[sender] = { correct: 0, wrong: 0, points: 0 }
      game.scores[sender].points -= 3

      await sock.sendMessage(from, { react: { text: '💡', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *Hint* ⌋
│ ${game.hint}
│ First letter: *${game.currentWord[0]}*
│ -3 points
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SKIP
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

      await sock.sendMessage(from, { react: { text: '⏭️', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *Skipped* ⌋
│ Previous: *${oldWord}*
│
│ *New Word:*
│ Scrambled: *${scrambled}*
│ Letters: ${word.length}
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      game.timeout = setTimeout(() => {
        activeGames.delete(from)
        sock.sendMessage(from, { text: `> ⏰ Time up! Word was: *${word}*` })
      }, 60000)

      return
    }

    // 7. GUESS
    if (action === 'guess' || action === 'g') {
      const guess = args[1]?.toUpperCase()
      if (!guess) return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}ws guess <word>` }, { quoted: msg })

      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.ws start`' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { correct: 0, wrong: 0, points: 0 }

      if (guess === game.currentWord) {
        // CORRECT
        game.scores[sender].correct++
        game.scores[sender].points += 10
        game.solved++

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
│ +10 points @${sender.split('@')[0]}
│ Total: ${game.scores[sender].points} pts
│
│ *Next Word:*
│ Scrambled: *${scrambled}*
│ Letters: ${word.length}
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })

        game.timeout = setTimeout(() => {
          activeGames.delete(from)
          sock.sendMessage(from, { text: `> ⏰ Time up! Word was: *${word}*` })
        }, 60000)

      } else {
        // WRONG
        game.scores[sender].wrong++
        game.scores[sender].points -= 2

        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        await sock.sendMessage(from, {
          text: `╭─⌈ ❌ *WRONG* ⌋
│ Your guess: ${guess}
│ -2 points
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
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, guess, hint, skip, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[WORDSCRAMBLE ERROR]', err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error.' }, { quoted: msg })
  }
}