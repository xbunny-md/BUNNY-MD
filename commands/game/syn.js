// commands/game/synonym.js
export const name = 'synonym'
export const alias = ['syn', 'similar', 'same']
export const category = 'Game'
export const desc = 'Synonym: Find word with same meaning. Example: Happy → Glad'

const activeGames = new Map()

const wordBank = [
  { word: 'HAPPY', synonyms: ['GLAD', 'JOYFUL', 'CHEERFUL', 'MERRY'] },
  { word: 'BIG', synonyms: ['LARGE', 'HUGE', 'GIANT', 'ENORMOUS'] },
  { word: 'FAST', synonyms: ['QUICK', 'RAPID', 'SWIFT', 'SPEEDY'] },
  { word: 'SMART', synonyms: ['CLEVER', 'INTELLIGENT', 'BRIGHT', 'GENIUS'] },
  { word: 'COLD', synonyms: ['CHILLY', 'FREEZING', 'ICY', 'FROSTY'] },
  { word: 'HOT', synonyms: ['WARM', 'BOILING', 'SCORCHING', 'BURNING'] },
  { word: 'EASY', synonyms: ['SIMPLE', 'EFFORTLESS', 'BASIC', 'STRAIGHTFORWARD'] },
  { word: 'HARD', synonyms: ['DIFFICULT', 'TOUGH', 'CHALLENGING', 'COMPLEX'] },
  { word: 'BEAUTIFUL', synonyms: ['PRETTY', 'GOREGEOUS', 'LOVELY', 'STUNNING'] },
  { word: 'UGLY', synonyms: ['HIDEOUS', 'UNATTRACTIVE', 'REPULSIVE'] },
  { word: 'STRONG', synonyms: ['POWERFUL', 'MIGHTY', 'TOUGH', 'ROBUST'] },
  { word: 'WEAK', synonyms: ['FRAGILE', 'FEEBLE', 'FRAIL', 'DELICATE'] },
  { word: 'ANGRY', synonyms: ['MAD', 'FURIOUS', 'IRATE', 'ENRAGED'] },
  { word: 'CALM', synonyms: ['PEACEFUL', 'SERENE', 'TRANQUIL', 'QUIET'] },
  { word: 'BRAVE', synonyms: ['COURAGEOUS', 'FEARLESS', 'HEROIC', 'BOLD'] },
  { word: 'SCARED', synonyms: ['AFRAID', 'FRIGHTENED', 'TERRIFIED', 'PANICKED'] },
  { word: 'FUNNY', synonyms: ['HILARIOUS', 'COMICAL', 'AMUSING', 'WITTY'] },
  { word: 'SAD', synonyms: ['UNHAPPY', 'DEPRESSED', 'GLOOMY', 'MISERABLE'] },
  { word: 'TIRED', synonyms: ['EXHAUSTED', 'WEARY', 'SLEEPY', 'FATIGUED'] },
  { word: 'RICH', synonyms: ['WEALTHY', 'AFFLUENT', 'PROSPEROUS'] }
]

function getRandomWord() {
  return wordBank[Math.floor(Math.random() * wordBank.length)]
}

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    clearTimeout(game.roundTimer)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

export default async function synonym(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '📝', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📝 *Synonym* ⌋
│ Find word with same meaning
│ Example: HAPPY → GLAD
│
│ *Commands:*
│ ${botSettings.prefix}syn start - New word
│ ${botSettings.prefix}syn <word> - Submit synonym
│ ${botSettings.prefix}syn hint - Get hint (-3 pts)
│ ${botSettings.prefix}syn skip - Skip word
│ ${botSettings.prefix}syn stop - End game
│ ${botSettings.prefix}syn score - Your score
│
│ *Scoring:*
│ Correct: +12 points
│ Wrong: -2 points
│ Hint: -3 points
│ First try: +5 bonus
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
          scoreText += `│ Solved: ${data.correct} | Accuracy: ${accuracy}%\n`
        })
      }
      scoreText += `│\n│ Round: ${game.round} | Current: ${game.currentWord}\n`
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
      endText += `│ Synonyms: ${game.synonyms.join(', ')}\n`
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
        return await sock.sendMessage(from, { text: '> Game running! Find synonym for current word.' }, { quoted: msg })
      }

      const { word, synonyms } = getRandomWord()

      const gameData = {
        currentWord: word,
        synonyms: synonyms,
        hintUsed: false,
        attempts: 0,
        scores: {},
        round: 1,
        timeout: null,
        roundTimer: null
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: `╭─⌈ 📝 *Synonym* ⌋
│ Round 1
│
│ Find synonym for: *${word}*
│
│ Type: ${botSettings.prefix}syn <word>
│ Hint: ${botSettings.prefix}syn hint
│ Time: 20s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Round timeout 20s
      gameData.roundTimer = setTimeout(async () => {
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word: *${word}*
│ Synonyms: ${synonyms.join(', ')}
│ Next round...
╰⊷ *Powered By Bunny Tech*`
        })
        nextRound(from, sock, botSettings)
      }, 20000)

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
      if (!game.scores[sender]) game.scores[sender] = { points: 0, correct: 0, attempts: 0 }
      game.scores[sender].points -= 3

      const randomSyn = game.synonyms[Math.floor(Math.random() * game.synonyms.length)]
      const firstLetter = randomSyn[0]
      const length = randomSyn.length

      await sock.sendMessage(from, { react: { text: '💡', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *Hint* ⌋
│ One synonym starts with: *${firstLetter}*
│ Length: ${length} letters
│ -3 points
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SKIP
    if (action === 'skip') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const oldWord = game.currentWord
      const oldSyns = game.synonyms
      const { word, synonyms } = getRandomWord()

      clearTimeout(game.roundTimer)
      game.currentWord = word
      game.synonyms = synonyms
      game.hintUsed = false
      game.attempts = 0

      await sock.sendMessage(from, { react: { text: '⏭️', key: msg.key } })
      await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *Skipped* ⌋
│ Previous: *${oldWord}*
│ Synonyms: ${oldSyns.join(', ')}
│
│ *New Word:*
│ Find synonym for: *${word}*
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      game.roundTimer = setTimeout(async () => {
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word: *${word}*
│ Synonyms: ${synonyms.join(', ')}
│ Next round...
╰⊷ *Powered By Bunny Tech*`
        })
        nextRound(from, sock, botSettings)
      }, 20000)

      return
    }

    // 7. GUESS - WORD DIRECT
    const guess = args[0]?.toUpperCase()
    if (guess) {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.syn start`' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { points: 0, correct: 0, attempts: 0 }
      game.attempts++
      game.scores[sender].attempts++

      if (game.synonyms.includes(guess)) {
        // CORRECT
        game.scores[sender].correct++
        game.scores[sender].points += 12

        const bonus = game.attempts === 1? 5 : 0
        if (bonus) game.scores[sender].points += bonus

        await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })

        clearTimeout(game.roundTimer)
        await sock.sendMessage(from, {
          text: `╭─⌈ 🎉 *CORRECT* ⌋
│ Word: *${game.currentWord}*
│ Synonym: *${guess}* ✅
│ +12 points ${bonus? `+${bonus} bonus` : ''}
│ Total: ${game.scores[sender].points} pts
│
│ All synonyms: ${game.synonyms.join(', ')}
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
│ Your answer: ${guess}
│ Not a synonym for *${game.currentWord}*
│ -2 points
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
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, <word>, hint, skip, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[SYNONYM ERROR]', err.message)
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
  game.attempts = 0
  const { word, synonyms } = getRandomWord()
  game.currentWord = word
  game.synonyms = synonyms

  await sock.sendMessage(chatJid, {
    text: `╭─⌈ 📝 *Round ${game.round}* ⌋
│ Find synonym for: *${word}*
│
│ Type: ${botSettings.prefix}syn <word>
│ Time: 20s
╰⊷ *Powered By Bunny Tech*`
  })

  clearTimeout(game.roundTimer)
  game.roundTimer = setTimeout(async () => {
    await sock.sendMessage(chatJid, {
      text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word: *${word}*
│ Synonyms: ${synonyms.join(', ')}
│ Next round...
╰⊷ *Powered By Bunny Tech*`
    })
    nextRound(chatJid, sock, botSettings)
  }, 20000)
}