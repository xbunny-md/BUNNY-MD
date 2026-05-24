// commands/game/rhyming.js
export const name = 'rhyming'
export const alias = ['rhyme', 'rap', 'rhy']
export const category = 'Game'
export const desc = 'Rhyming: Say word that rhymes with given word. Example: Cat → Hat'

const activeGames = new Map()

const wordBank = [
  { word: 'CAT', rhymes: ['HAT', 'BAT', 'MAT', 'RAT', 'SAT', 'FAT', 'PAT'] },
  { word: 'DOG', rhymes: ['LOG', 'FOG', 'HOG', 'BOG', 'JOG', 'COG'] },
  { word: 'BALL', rhymes: ['CALL', 'FALL', 'HALL', 'WALL', 'TALL', 'MALL'] },
  { word: 'BOOK', rhymes: ['LOOK', 'HOOK', 'COOK', 'TOOK', 'SHOOK'] },
  { word: 'STAR', rhymes: ['CAR', 'FAR', 'BAR', 'JAR', 'TAR', 'WAR'] },
  { word: 'FISH', rhymes: ['DISH', 'WISH', 'SWISH'] },
  { word: 'CAKE', rhymes: ['MAKE', 'TAKE', 'LAKE', 'BAKE', 'RAKE', 'SAKE'] },
  { word: 'TREE', rhymes: ['FREE', 'SEE', 'BEE', 'KEY', 'SEA', 'TEE'] },
  { word: 'HOUSE', rhymes: ['MOUSE', 'BLOUSE', 'SPOUSE'] },
  { word: 'PHONE', rhymes: ['STONE', 'BONE', 'ALONE', 'THRONE', 'ZONE'] },
  { word: 'NIGHT', rhymes: ['LIGHT', 'SIGHT', 'FIGHT', 'RIGHT', 'MIGHT'] },
  { word: 'DAY', rhymes: ['SAY', 'PLAY', 'WAY', 'MAY', 'BAY', 'CLAY'] },
  { word: 'RAIN', rhymes: ['PAIN', 'MAIN', 'GAIN', 'TRAIN', 'CHAIN'] },
  { word: 'FIRE', rhymes: ['TIRE', 'WIRE', 'HIRE', 'INSPIRE'] },
  { word: 'MOON', rhymes: ['SOON', 'NOON', 'TUNE', 'SPOON', 'BALLOON'] },
  { word: 'KING', rhymes: ['RING', 'SING', 'WING', 'THING', 'STRING'] },
  { word: 'BLUE', rhymes: ['TRUE', 'CLUE', 'GLUE', 'SHOE', 'NEW'] },
  { word: 'GREEN', rhymes: ['SEEN', 'QUEEN', 'BEAN', 'MEAN', 'CLEAN'] },
  { word: 'HEART', rhymes: ['START', 'PART', 'SMART', 'CHART', 'ART'] },
  { word: 'LOVE', rhymes: ['DOVE', 'GLOVE', 'ABOVE'] }
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

export default async function rhyming(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🎵', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎵 *Rhyming* ⌋
│ Say word that rhymes
│ Example: CAT → HAT
│
│ *Commands:*
│ ${botSettings.prefix}rhy start - New word
│ ${botSettings.prefix}rhy <word> - Submit rhyme
│ ${botSettings.prefix}rhy hint - Get hint (-3 pts)
│ ${botSettings.prefix}rhy skip - Skip word
│ ${botSettings.prefix}rhy stop - End game
│ ${botSettings.prefix}rhy score - Your score
│
│ *Scoring:*
│ Correct: +10 points
│ Wrong: -2 points
│ Hint: -3 points
│ Streak 3+: +5 bonus
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
          scoreText += `│ Solved: ${data.correct} | Streak: ${data.streak} 🔥\n`
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
      endText += `│ Rhymes: ${game.rhymes.join(', ')}\n`
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
        return await sock.sendMessage(from, { text: '> Game running! Find rhyme for current word.' }, { quoted: msg })
      }

      const { word, rhymes } = getRandomWord()

      const gameData = {
        currentWord: word,
        rhymes: rhymes,
        hintUsed: false,
        scores: {},
        round: 1,
        timeout: null,
        roundTimer: null
      }

      activeGames.set(from, gameData)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      const sent = await sock.sendMessage(from, {
        text: `╭─⌈ 🎵 *Rhyming* ⌋
│ Round 1
│
│ Find rhyme for: *${word}*
│
│ Type: ${botSettings.prefix}rhy <word>
│ Hint: ${botSettings.prefix}rhy hint
│ Time: 20s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Round timeout 20s
      gameData.roundTimer = setTimeout(async () => {
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word: *${word}*
│ Rhymes: ${rhymes.join(', ')}
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
      if (!game.scores[sender]) game.scores[sender] = { points: 0, correct: 0, streak: 0 }
      game.scores[sender].points -= 3

      const randomRhyme = game.rhymes[Math.floor(Math.random() * game.rhymes.length)]
      const firstLetter = randomRhyme[0]
      const lastLetters = randomRhyme.slice(-2)

      await sock.sendMessage(from, { react: { text: '💡', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *Hint* ⌋
│ One rhyme starts with: *${firstLetter}*
│ Ends with: *${lastLetters}*
│ -3 points
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SKIP
    if (action === 'skip') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const oldWord = game.currentWord
      const oldRhymes = game.rhymes
      const { word, rhymes } = getRandomWord()

      clearTimeout(game.roundTimer)
      game.currentWord = word
      game.rhymes = rhymes
      game.hintUsed = false

      if (!game.scores[sender]) game.scores[sender] = { points: 0, correct: 0, streak: 0 }
      game.scores[sender].streak = 0

      await sock.sendMessage(from, { react: { text: '⏭️', key: msg.key } })
      await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *Skipped* ⌋
│ Previous: *${oldWord}*
│ Rhymes: ${oldRhymes.join(', ')}
│
│ *New Word:*
│ Find rhyme for: *${word}*
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      game.roundTimer = setTimeout(async () => {
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word: *${word}*
│ Rhymes: ${rhymes.join(', ')}
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
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.rhy start`' }, { quoted: msg })

      if (!game.scores[sender]) game.scores[sender] = { points: 0, correct: 0, streak: 0 }

      if (game.rhymes.includes(guess)) {
        // CORRECT
        game.scores[sender].correct++
        game.scores[sender].streak++
        game.scores[sender].points += 10

        const bonus = game.scores[sender].streak >= 3? 5 : 0
        if (bonus) game.scores[sender].points += bonus

        await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })

        clearTimeout(game.roundTimer)
        await sock.sendMessage(from, {
          text: `╭─⌈ 🎉 *CORRECT* ⌋
│ Word: *${game.currentWord}*
│ Rhyme: *${guess}* ✅
│ +10 points ${bonus? `+${bonus} streak bonus` : ''}
│ Streak: ${game.scores[sender].streak} 🔥
│ Total: ${game.scores[sender].points} pts
│
│ All rhymes: ${game.rhymes.join(', ')}
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })

        setTimeout(() => nextRound(from, sock, botSettings), 2000)

      } else {
        // WRONG
        game.scores[sender].points -= 2
        game.scores[sender].streak = 0

        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        await sock.sendMessage(from, {
          text: `╭─⌈ ❌ *WRONG* ⌋
│ Your answer: ${guess}
│ Doesn't rhyme with *${game.currentWord}*
│ -2 points
│ Streak reset
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
    console.error('[RHYMING ERROR]', err.message)
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
  const { word, rhymes } = getRandomWord()
  game.currentWord = word
  game.rhymes = rhymes

  await sock.sendMessage(chatJid, {
    text: `╭─⌈ 🎵 *Round ${game.round}* ⌋
│ Find rhyme for: *${word}*
│
│ Type: ${botSettings.prefix}rhy <word>
│ Time: 20s
╰⊷ *Powered By Bunny Tech*`
  })

  clearTimeout(game.roundTimer)
  game.roundTimer = setTimeout(async () => {
    await sock.sendMessage(chatJid, {
      text: `╭─⌈ ⏰ *Time Up* ⌋
│ Word: *${word}*
│ Rhymes: ${rhymes.join(', ')}
│ Next round...
╰⊷ *Powered By Bunny Tech*`
    })
    nextRound(chatJid, sock, botSettings)
  }, 20000)
}