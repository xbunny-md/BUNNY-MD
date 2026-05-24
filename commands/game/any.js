// commands/game/antonym.js
export const name = 'antonym'
export const alias = ['ant', 'opposite', 'opp']
export const category = 'Game'
export const desc = 'Antonym: Find word with opposite meaning. Example: Hot → Cold'

const activeGames = new Map()

const wordBank = [
  { word: 'HOT', antonyms: ['COLD', 'CHILLY', 'FREEZING', 'ICY'] },
  { word: 'COLD', antonyms: ['HOT', 'WARM', 'BOILING', 'SCORCHING'] },
  { word: 'BIG', antonyms: ['SMALL', 'TINY', 'LITTLE', 'MINI'] },
  { word: 'SMALL', antonyms: ['BIG', 'LARGE', 'HUGE', 'GIANT'] },
  { word: 'FAST', antonyms: ['SLOW', 'SLUGGISH', 'LAZY'] },
  { word: 'SLOW', antonyms: ['FAST', 'QUICK', 'RAPID', 'SPEEDY'] },
  { word: 'HAPPY', antonyms: ['SAD', 'UNHAPPY', 'MISERABLE', 'GLOOMY'] },
  { word: 'SAD', antonyms: ['HAPPY', 'GLAD', 'JOYFUL', 'CHEERFUL'] },
  { word: 'STRONG', antonyms: ['WEAK', 'FRAGILE', 'FEEBLE', 'FRAIL'] },
  { word: 'WEAK', antonyms: ['STRONG', 'POWERFUL', 'MIGHTY', 'TOUGH'] },
  { word: 'LIGHT', antonyms: ['DARK', 'HEAVY', 'DIM', 'BLACK'] },
  { word: 'DARK', antonyms: ['LIGHT', 'BRIGHT', 'WHITE', 'CLEAR'] },
  { word: 'EASY', antonyms: ['HARD', 'DIFFICULT', 'TOUGH', 'COMPLEX'] },
  { word: 'HARD', antonyms: ['EASY', 'SIMPLE', 'SOFT', 'GENTLE'] },
  { word: 'RICH', antonyms: ['POOR', 'BROKE', 'PENNILESS', 'DESTITUTE'] },
  { word: 'POOR', antonyms: ['RICH', 'WEALTHY', 'AFFLUENT', 'PROSPEROUS'] },
  { word: 'BRAVE', antonyms: ['COWARDLY', 'SCARED', 'AFRAID', 'FEARFUL'] },
  { word: 'COWARD', antonyms: ['BRAVE', 'HEROIC', 'COURAGEOUS', 'BOLD'] },
  { word: 'EARLY', antonyms: ['LATE', 'TARDY', 'DELAYED', 'BEHIND'] },
  { word: 'LATE', antonyms: ['EARLY', 'PUNCTUAL', 'ON TIME', 'PROMPT'] },
  { word: 'OLD', antonyms: ['NEW', 'YOUNG', 'FRESH', 'MODERN'] },
  { word: 'NEW', antonyms: ['OLD', 'ANCIENT', 'OUTDATED', 'USED'] }
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

export default async function antonym(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🔄', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔄 *Antonym* ⌋
│ Find word with opposite meaning
│ Example: HOT → COLD
│
│ *Commands:*
│ ${botSettings.prefix}ant start - New word
│ ${botSettings.prefix}ant <word> - Submit opposite
│ ${botSettings.prefix}ant hint - Get hint (-3 pts)
│ ${botSettings.prefix}ant skip - Skip word
│ ${botSettings.prefix}ant stop - End game
│ ${botSettings.prefix}ant score - Your score
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
      endText += `│ Opposites: ${game.antonyms.join(', ')}\n`
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
        return await sock.sendMessage(from, { text: '> Game running! Find opposite for current word.' }, { quoted: msg })
      }

      const { word, antonyms } = getRandomWord()

      const gameData = {
        currentWord: word,
        antonyms: antonyms,
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
        text: `╭─⌈ 🔄 *Antonym* ⌋
│ Round 1
│
│ Find opposite of: *${word}*
│
│ Type: ${botSettings.prefix}ant <word>
│ Hint: ${botSettings.prefix}ant hint
│ Time: 20s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Round timeout 20s
      gameData.roundTimer = setTimeout(async () => {
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word: *${word}*
│ Opposites: ${antonyms.join(', ')}
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

      const randomAnt = game.antonyms[Math.floor(Math.random() * game.antonyms.length)]
      const firstLetter = randomAnt[0]
      const length = randomAnt.length

      await sock.sendMessage(from, { react: { text: '💡', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *Hint* ⌋
│ One opposite starts with: *${firstLetter}*
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
      const oldAnts = game.antonyms
      const { word, antonyms } = getRandomWord()

      clearTimeout(game.roundTimer)
      game.currentWord = word
      game.antonyms = antonyms
      game.hintUsed = false
      game.attempts = 0

      await sock.sendMessage(from, { react: { text: '⏭️', key: msg.key } })
      await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *Skipped* ⌋
│ Previous: *${oldWord}*
│ Opposites: ${oldAnts.join(', ')}
│
│ *New Word:*
│ Find opposite of: *${word}*
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      game.roundTimer = setTimeout(async () => {
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word: *${word}*
│ Opposites: ${antonyms.join(', ')}
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
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.ant start`' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { points: 0, correct: 0, attempts: 0 }
      game.attempts++
      game.scores[sender].attempts++

      if (game.antonyms.includes(guess)) {
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
│ Opposite: *${guess}* ✅
│ +12 points ${bonus? `+${bonus} bonus` : ''}
│ Total: ${game.scores[sender].points} pts
│
│ All opposites: ${game.antonyms.join(', ')}
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
│ Not opposite of *${game.currentWord}*
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
    console.error('[ANTONYM ERROR]', err.message)
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
  const { word, antonyms } = getRandomWord()
  game.currentWord = word
  game.antonyms = antonyms

  await sock.sendMessage(chatJid, {
    text: `╭─⌈ 🔄 *Round ${game.round}* ⌋
│ Find opposite of: *${word}*
│
│ Type: ${botSettings.prefix}ant <word>
│ Time: 20s
╰⊷ *Powered By Bunny Tech*`
  })

  clearTimeout(game.roundTimer)
  game.roundTimer = setTimeout(async () => {
    await sock.sendMessage(chatJid, {
      text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word: *${word}*
│ Opposites: ${antonyms.join(', ')}
│ Next round...
╰⊷ *Powered By Bunny Tech*`
    })
    nextRound(chatJid, sock, botSettings)
  }, 20000)
}