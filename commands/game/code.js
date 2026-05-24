// commands/game/codenames.js
export const name = 'codenames'
export const alias = ['code', 'spymaster', 'spy']
export const category = 'Game'
export const desc = 'Codenames: Spymaster gives 1-word clue + number, team guesses words'

const activeGames = new Map()

// Word bank - 5x5 grid = 25 words
const wordPool = [
  'AFRICA', 'AGENT', 'AIR', 'ALIEN', 'ALPS', 'AMAZON', 'AMBULANCE', 'AMERICA', 'ANGEL', 'ANTARCTICA',
  'APPLE', 'ARM', 'ATLANTIS', 'AUSTRALIA', 'AZTEC', 'BACK', 'BALL', 'BAND', 'BANK', 'BAR',
  'BARK', 'BAT', 'BATTERY', 'BEACH', 'BEAR', 'BEAT', 'BED', 'BEIJING', 'BELL', 'BELT',
  'BERLIN', 'BERMUDA', 'BERRY', 'BILL', 'BLOCK', 'BOARD', 'BOLT', 'BOMB', 'BOND', 'BOOM',
  'BOOT', 'BOTTLE', 'BOW', 'BOX', 'BRIDGE', 'BRUSH', 'BUCK', 'BUFFALO', 'BUG', 'BUGLE',
  'BUTTON', 'CALF', 'CANADA', 'CAP', 'CAPITAL', 'CAR', 'CARD', 'CARROT', 'CASINO', 'CAST',
  'CAT', 'CELL', 'CENTAUR', 'CENTER', 'CHAIR', 'CHANGE', 'CHARGE', 'CHECK', 'CHEST', 'CHICK',
  'CHINA', 'CHOCOLATE', 'CHURCH', 'CIRCLE', 'CLIFF', 'CLOAK', 'CLUB', 'CODE', 'COLD', 'COMIC',
  'COMPOUND', 'CONCERT', 'CONDUCTOR', 'CONTRACT', 'COOK', 'COPPER', 'COTTON', 'COURT', 'COVER', 'CRANE',
  'CRASH', 'CRICKET', 'CROSS', 'CROWN', 'CYCLE', 'CZECH', 'DANCE', 'DATE', 'DAY', 'DEATH'
]

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    clearTimeout(game.turnTimer)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

function generateBoard() {
  // Shuffle and pick 25 words
  const shuffled = [...wordPool].sort(() => Math.random() - 0.5)
  const boardWords = shuffled.slice(0, 25)

  // Assign roles: 9 red, 8 blue, 7 neutral, 1 assassin
  const roles = [
   ...Array(9).fill('RED'),
   ...Array(8).fill('BLUE'),
   ...Array(7).fill('NEUTRAL'),
    'ASSASSIN'
  ].sort(() => Math.random() - 0.5)

  const board = boardWords.map((word, i) => ({
    word,
    role: roles[i],
    revealed: false
  }))

  return board
}

function displayBoard(board, team = 'all') {
  let display = ''
  for (let i = 0; i < 5; i++) {
    let row = '│ '
    for (let j = 0; j < 5; j++) {
      const idx = i * 5 + j
      const card = board[idx]
      if (card.revealed) {
        const icon = card.role === 'RED'? '🔴' : card.role === 'BLUE'? '🔵' : card.role === 'ASSASSIN'? '💀' : '⚪'
        row += `${icon}${card.word.padEnd(10)} `
      } else {
        row += `${card.word.padEnd(12)} `
      }
    }
    display += row + '\n'
  }
  return display
}

function getSpymasterView(board) {
  let display = ''
  for (let i = 0; i < 5; i++) {
    let row = '│ '
    for (let j = 0; j < 5; j++) {
      const idx = i * 5 + j
      const card = board[idx]
      const icon = card.role === 'RED'? '🔴' : card.role === 'BLUE'? '🔵' : card.role === 'ASSASSIN'? '💀' : '⚪'
      const status = card.revealed? '✓' : ' '
      row += `${icon}${status}${card.word.padEnd(9)} `
    }
    display += row + '\n'
  }
  return display
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

export default async function codenames(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '🕵️', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🕵️ *Codenames* ⌋
│ 5x5 grid: 9 RED, 8 BLUE, 7 NEUTRAL, 1 ASSASSIN
│ Spymaster gives 1-word clue + number
│ Team guesses words matching clue
│
│ *Commands:*
│ ${botSettings.prefix}code start - Start as RED team
│ ${botSettings.prefix}code start blue - Start as BLUE
│ ${botSettings.prefix}code clue <word> <num> - Spymaster clue
│ ${botSettings.prefix}code guess <word> - Guess word
│ ${botSettings.prefix}code pass - End turn
│ ${botSettings.prefix}code board - Show board
│ ${botSettings.prefix}code spy - Spymaster view (PM only)
│ ${botSettings.prefix}code stop - End game
│ ${botSettings.prefix}code score - Scores
│
│ *Scoring:*
│ Correct guess: +10 points
│ Wrong team: -5 points
│ Assassin: Game over
│ Win game: +30 points
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 2. SCORE
    if (action === 'score' || action === 'stats') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      await showTyping(sock, from)
      let scoreText = `╭─⌈ 📊 *Scores* ⌋\n`
      scoreText += `│ 🔴 RED: ${game.redScore}/9 words\n`
      scoreText += `│ 🔵 BLUE: ${game.blueScore}/8 words\n`
      scoreText += `│ ⚪ Neutral: ${game.neutralFound}\n`
      scoreText += `│ 💀 Assassin: ${game.assassinFound? 'Found' : 'Safe'}\n│\n`
      scoreText += `│ Turn: ${game.turn} TEAM\n`
      scoreText += `│ Phase: ${game.phase}\n`
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
      endText += `│ 🔴 RED: ${game.redScore}/9\n`
      endText += `│ 🔵 BLUE: ${game.blueScore}/8\n`
      endText += `│ Winner: ${game.winner || 'None'}\n`
      endText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: endText }, { quoted: msg })
    }

    // 4. START
    if (action === 'start') {
      if (activeGames.has(from)) {
        return await sock.sendMessage(from, { text: '> Game running! Use `.code board` to see board.' }, { quoted: msg })
      }

      const startTeam = args[1]?.toLowerCase() === 'blue'? 'BLUE' : 'RED'
      const board = generateBoard()

      const gameData = {
        board: board,
        turn: startTeam,
        phase: 'CLUE', // CLUE or GUESS
        spymaster: sender,
        redScore: 0,
        blueScore: 0,
        neutralFound: 0,
        assassinFound: false,
        currentClue: null,
        guessesLeft: 0,
        scores: {},
        timeout: null,
        turnTimer: null,
        winner: null
      }

      activeGames.set(from, gameData)
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      await sock.sendMessage(from, {
        text: `╭─⌈ 🕵️ *Codenames Started* ⌋
│ ${startTeam} team goes first
│ Spymaster: @${sender.split('@')[0]}
│
${displayBoard(board)}│
│ Spymaster: Give clue with.code clue <word> <num>
│ Example:.code clue ANIMAL 3
│
│ 🔴 RED: 9 words | 🔵 BLUE: 8 words
│ 💀 Assassin: 1 | ⚪ Neutral: 7
╰⊷ *Powered By Bunny Tech*`,
        mentions: [sender]
      }, { quoted: msg })

      // Game timeout 300s
      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Game ended! No winner.` })
      }, 300000)

      return
    }

    // 5. BOARD - Show current board
    if (action === 'board') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      await showTyping(sock, from)
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🕵️ *Board* ⌋
${displayBoard(game.board)}│
│ Turn: ${game.turn} | Phase: ${game.phase}
│ ${game.currentClue? `Clue: ${game.currentClue.word} (${game.currentClue.num})` : 'Waiting for clue'}
│ Guesses left: ${game.guessesLeft}
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SPY - Spymaster view (DM spymaster)
    if (action === 'spy' || action === 'spymaster') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })
      if (game.spymaster!== sender) return await sock.sendMessage(from, { text: '> Only spymaster can use this.' }, { quoted: msg })

      await showTyping(sock, sender)
      await sock.sendMessage(sender, {
        text: `╭─⌈ 🕵️ *Spymaster View* ⌋
${getSpymasterView(game.board)}│
│ 🔴 RED: 9 | 🔵 BLUE: 8
│ ⚪ Neutral: 7 | 💀 Assassin: 1
│
│ Give clue:.code clue <word> <number>
│ Number = how many words relate to clue
╰⊷ *Powered By Bunny Tech*`
      })

      return await sock.sendMessage(from, { text: '> Spymaster view sent to your DM.' }, { quoted: msg })
    }

    // 7. CLUE - Spymaster gives clue
    if (action === 'clue') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })
      if (game.spymaster!== sender) return await sock.sendMessage(from, { text: '> Only spymaster can give clues.' }, { quoted: msg })
      if (game.phase!== 'CLUE') return await sock.sendMessage(from, { text: '> Not clue phase. Wait for guesses.' }, { quoted: msg })

      const clueWord = args[1]?.toUpperCase()
      const clueNum = parseInt(args[2])

      if (!clueWord || isNaN(clueNum) || clueNum < 1 || clueNum > 9) {
        return await sock.sendMessage(from, { text: '> Usage:.code clue <word> <number>\n> Example:.code clue ANIMAL 3' }, { quoted: msg })
      }

      // Check if clue word is on board
      if (game.board.some(c => c.word === clueWord &&!c.revealed)) {
        return await sock.sendMessage(from, { text: '> Cannot use words from the board as clue!' }, { quoted: msg })
      }

      game.currentClue = { word: clueWord, num: clueNum, by: sender }
      game.guessesLeft = clueNum + 1
      game.phase = 'GUESS'

      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '💡', key: msg.key } })
      await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *CLUE* ⌋
│ Spymaster: @${sender.split('@')[0]}
│ Clue: *${clueWord}* (${clueNum})
│ Team ${game.turn}: ${game.guessesLeft} guesses
│
│ Guess with:.code guess <word>
│ Pass turn:.code pass
╰⊷ *Powered By Bunny Tech*`,
        mentions: [sender]
      }, { quoted: msg })

      // Turn timeout 60s
      clearTimeout(game.turnTimer)
      game.turnTimer = setTimeout(() => {
        game.phase = 'CLUE'
        game.turn = game.turn === 'RED'? 'BLUE' : 'RED'
        game.guessesLeft = 0
        game.currentClue = null
        sock.sendMessage(from, { text: `> ⏰ Time up! ${game.turn} team's turn to give clue.` })
      }, 60000)

      return
    }

    // 8. GUESS - Team guesses word
    if (action === 'guess') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })
      if (game.phase!== 'GUESS') return await sock.sendMessage(from, { text: '> Not guess phase. Wait for clue.' }, { quoted: msg })
      if (game.spymaster === sender) return await sock.sendMessage(from, { text: '> Spymaster cannot guess!' }, { quoted: msg })
      if (game.guessesLeft <= 0) return await sock.sendMessage(from, { text: '> No guesses left. Pass or wait.' }, { quoted: msg })

      const guessWord = args[1]?.toUpperCase()
      if (!guessWord) return await sock.sendMessage(from, { text: '> Usage:.code guess <word>' }, { quoted: msg })

      const cardIndex = game.board.findIndex(c => c.word === guessWord)
      if (cardIndex === -1) return await sock.sendMessage(from, { text: '> Word not on board!' }, { quoted: msg })
      if (game.board[cardIndex].revealed) return await sock.sendMessage(from, { text: '> Already revealed!' }, { quoted: msg })

      const card = game.board[cardIndex]
      card.revealed = true
      game.guessesLeft--

      if (!game.scores[sender]) game.scores[sender] = { points: 0, correct: 0 }

      await showTyping(sock, from)

      // Check result
      if (card.role === 'ASSASSIN') {
        // Game over - other team wins
        game.assassinFound = true
        game.winner = game.turn === 'RED'? 'BLUE' : 'RED'
        clearGame(from) // FUTA CACHE

        await sock.sendMessage(from, { react: { text: '💀', key: msg.key } })
        return await sock.sendMessage(from, {
          text: `╭─⌈ 💀 *ASSASSIN* ⌋
│ @${sender.split('@')[0]} found: *${guessWord}*
│ ASSASSIN HIT!
│
│ ${game.winner} TEAM WINS!
│ Game Over
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })
      }

      if (card.role === game.turn) {
        // Correct team
        game.scores[sender].points += 10
        game.scores[sender].correct++
        if (game.turn === 'RED') game.redScore++
        else game.blueScore++

        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

        // Check win condition
        if ((game.turn === 'RED' && game.redScore >= 9) || (game.turn === 'BLUE' && game.blueScore >= 8)) {
          game.winner = game.turn
          if (game.scores[sender]) game.scores[sender].points += 30
          clearGame(from) // FUTA CACHE

          return await sock.sendMessage(from, {
            text: `╭─⌈ 🎉 *${game.turn} WINS* ⌋
│ Found: *${guessWord}* ✅
│ ${game.turn === 'RED'? '🔴' : '🔵'} ${game.turn}: ${game.turn === 'RED'? game.redScore : game.blueScore} words
│
│ Winner: @${sender.split('@')[0]}
│ +30 win bonus
╰⊷ *Powered By Bunny Tech*`,
            mentions: [sender]
          }, { quoted: msg })
        }

        await sock.sendMessage(from, {
          text: `╭─⌈ ✅ *CORRECT* ⌋
│ @${sender.split('@')[0]}: *${guessWord}*
│ ${game.turn === 'RED'? '🔴 RED' : '🔵 BLUE'} word!
│ +10 points | ${game.guessesLeft} guesses left
│
│ Score: ${game.turn === 'RED'? game.redScore : game.blueScore}/${game.turn === 'RED'? '9' : '8'}
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })

        // If guesses left, continue. Else end turn
        if (game.guessesLeft <= 0) {
          game.phase = 'CLUE'
          game.turn = game.turn === 'RED'? 'BLUE' : 'RED'
          game.currentClue = null
          await sock.sendMessage(from, { text: `> Guesses done. ${game.turn} team's turn to give clue.` })
        }

      } else {
        // Wrong team or neutral
        if (card.role === 'NEUTRAL') game.neutralFound++
        else if (card.role === 'RED') game.redScore++
        else if (card.role === 'BLUE') game.blueScore++

        game.scores[sender].points -= 5
        game.guessesLeft = 0
        game.phase = 'CLUE'
        game.turn = game.turn === 'RED'? 'BLUE' : 'RED'
        game.currentClue = null

        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })

        const icon = card.role === 'RED'? '🔴' : card.role === 'BLUE'? '🔵' : '⚪'
        await sock.sendMessage(from, {
          text: `╭─⌈ ❌ *WRONG* ⌋
│ @${sender.split('@')[0]}: *${guessWord}*
│ ${icon} ${card.role} word
│ -5 points
│
│ Turn ends. ${game.turn} team's turn to give clue.
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender]
        }, { quoted: msg })
      }

      return
    }

    // 9. PASS - End turn early
    if (action === 'pass') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })
      if (game.phase!== 'GUESS') return await sock.sendMessage(from, { text: '> Not guess phase.' }, { quoted: msg })
      if (game.spymaster === sender) return await sock.sendMessage(from, { text: '> Spymaster cannot pass!' }, { quoted: msg })

      game.guessesLeft = 0
      game.phase = 'CLUE'
      game.turn = game.turn === 'RED'? 'BLUE' : 'RED'
      game.currentClue = null

      await showTyping(sock, from)
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *PASSED* ⌋
│ @${sender.split('@')[0]} passed turn
│ ${game.turn} team's turn to give clue
╰⊷ *Powered By Bunny Tech*`,
        mentions: [sender]
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, clue, guess, pass, board, spy, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[CODENAMES ERROR]', err.message)
    clearGame(from) // FUTA CACHE KAMA ERROR
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error. Cache cleared.' }, { quoted: msg })
  }
}