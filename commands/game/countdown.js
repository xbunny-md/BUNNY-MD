// commands/game/countdown.js
export const name = 'countdown'
export const alias = ['cd', 'count', 'down']
export const category = 'Game'
export const desc = 'Countdown: Start 20, minus 1-3 each turn, avoid hitting 0'

const activeGames = new Map()

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    clearTimeout(game.turnTimer)
    clearTimeout(game.botTimer)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

// ANTI-BAN: Random delay
function antiBanDelay() {
  return Math.floor(Math.random() * 1200) + 800 // 0.8s - 2s
}

// ANTI-BAN: Typing indicator
async function showTyping(sock, from) {
  await sock.presenceSubscribe(from)
  await sock.sendPresenceUpdate('composing', from)
  await new Promise(r => setTimeout(r, antiBanDelay()))
}

function getBotMove(current) {
  // Bot strategy: Always try to leave opponent with 4n+1
  const target = Math.floor((current - 1) / 4) * 4 + 1
  let move = current - target

  if (move < 1 || move > 3) {
    move = Math.min(3, current - 1) // Safe move
  }
  if (move < 1) move = 1

  return Math.min(move, 3)
}

// ANIMATED SEQUENCE
async function animateBotMove(sock, from, move, current, sender, botSettings) {
  const frames = [
    `🤖 *Bot thinking...*`,
    `🤖 Analyzing: ${current}...`,
    `🤖 Calculating best move...`,
    `🤖 *Bot plays -${move}*`
  ]

  const key = await sock.sendMessage(from, { text: frames[0] })

  for (let i = 1; i < frames.length; i++) {
    await new Promise(r => setTimeout(r, 600))
    await sock.sendMessage(from, { text: frames[i], edit: key.key })
  }

  await new Promise(r => setTimeout(r, 800))
  return key
}

export default async function countdown(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '🔢', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔢 *Countdown* ⌋
│ Start at 20, minus 1-3 each turn
│ Player who hits 0 LOSES
│
│ *Commands:*
│ ${botSettings.prefix}cd start - Play vs Bot
│ ${botSettings.prefix}cd pvp - Play vs Players
│ ${botSettings.prefix}cd 1 - Minus 1
│ ${botSettings.prefix}cd 2 - Minus 2
│ ${botSettings.prefix}cd 3 - Minus 3
│ ${botSettings.prefix}cd stop - End game
│ ${botSettings.prefix}cd score - Your score
│
│ *Scoring:*
│ Win: +15 points
│ Lose: -5 points
│ Perfect game: +10 bonus
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 2. SCORE
    if (action === 'score' || action === 'stats') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      await showTyping(sock, from)
      let scoreText = `╭─⌈ 📊 *Scores* ⌋\n`
      const sorted = Object.entries(game.scores).sort((a, b) => b[1].points - a[1].points)

      if (sorted.length === 0) {
        scoreText += `│ No scores yet\n`
      } else {
        sorted.forEach(([user, data], i) => {
          const medal = i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : '🎯'
          const winRate = data.games > 0? ((data.wins / data.games) * 100).toFixed(0) : 0
          scoreText += `│ ${medal} ${user.split('@')[0]}: ${data.points} pts\n`
          scoreText += `│ Wins: ${data.wins}/${data.games} | Rate: ${winRate}%\n`
        })
      }
      scoreText += `│\n│ Current: ${game.current} | Mode: ${game.mode.toUpperCase()}\n`
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
      endText += `│ Stopped at: *${game.current}*\n`
      endText += `│ Turn: ${game.currentTurn === 'bot'? 'Bot' : '@' + game.currentTurn.split('@')[0]}\n│\n`

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

    // 4. START - VS BOT
    if (action === 'start') {
      if (activeGames.has(from)) {
        return await sock.sendMessage(from, { text: '> Game running! Current: ' + activeGames.get(from).current }, { quoted: msg })
      }

      const gameData = {
        current: 20,
        mode: 'bot',
        scores: {},
        currentTurn: sender,
        timeout: null,
        turnTimer: null,
        botTimer: null,
        moves: 0
      }

      activeGames.set(from, gameData)
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      await sock.sendMessage(from, {
        text: `╭─⌈ 🔢 *Countdown vs Bot* ⌋
│ Start: *20*
│ Your turn @${sender.split('@')[0]}
│
│ Minus: ${botSettings.prefix}cd 1/2/3
│ Avoid hitting 0!
│ Time: 20s per turn
╰⊷ *Powered By Bunny Tech*`,
        mentions: [sender]
      }, { quoted: msg })

      // Turn timeout 20s
      gameData.turnTimer = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Time up! You lose. Current was: ${gameData.current}` })
      }, 20000)

      // Game timeout 180s
      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Game ended! Stopped at: ${gameData.current}` })
      }, 180000)

      return
    }

    // 5. START - PVP
    if (action === 'pvp') {
      if (activeGames.has(from)) {
        return await sock.sendMessage(from, { text: '> Game running! Current: ' + activeGames.get(from).current }, { quoted: msg })
      }

      const gameData = {
        current: 20,
        mode: 'pvp',
        scores: {},
        players: [sender],
        currentTurn: sender,
        timeout: null,
        turnTimer: null,
        botTimer: null,
        moves: 0
      }

      activeGames.set(from, gameData)
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      await sock.sendMessage(from, {
        text: `╭─⌈ 🔢 *Countdown PVP* ⌋
│ Start: *20*
│ Players: @${sender.split('@')[0]}
│
│ Waiting for P2... Others join by typing 1/2/3
│ Avoid hitting 0!
╰⊷ *Powered By Bunny Tech*`,
        mentions: [sender]
      }, { quoted: msg })

      // Game timeout 300s for PVP
      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Game ended! Stopped at: ${gameData.current}` })
      }, 300000)

      return
    }

    // 6. MOVE - 1/2/3
    const move = parseInt(action)
    if (!isNaN(move) && move >= 1 && move <= 3) {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.cd start`' }, { quoted: msg })

      // PVP: Add player if new
      if (game.mode === 'pvp' &&!game.players.includes(sender)) {
        game.players.push(sender)
      }

      // Check turn
      if (game.mode === 'bot' && game.currentTurn!== sender) {
        return await sock.sendMessage(from, { text: '> Not your turn! Wait for bot.' }, { quoted: msg })
      }
      if (game.mode === 'pvp' && game.currentTurn!== sender) {
        return await sock.sendMessage(from, {
          text: `> Not your turn! Waiting for @${game.currentTurn.split('@')[0]}`,
          mentions: [game.currentTurn]
        }, { quoted: msg })
      }

      if (!game.scores[sender]) game.scores[sender] = { points: 0, wins: 0, games: 0 }
      if (move >= game.current) {
        return await sock.sendMessage(from, { text: `> Can't minus ${move}! Current is ${game.current}. Choose 1-${Math.min(3, game.current - 1)}` }, { quoted: msg })
      }

      clearTimeout(game.turnTimer)
      game.current -= move
      game.moves++

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      // Check win/lose
      if (game.current <= 0) {
        // Current player LOSES
        game.scores[sender].games++
        game.scores[sender].points -= 5

        let winner = null
        if (game.mode === 'bot') {
          winner = 'Bot'
        } else {
          winner = game.players.find(p => p!== sender) || 'Other'
        }

        if (game.scores[winner] && winner!== 'Bot') {
          game.scores[winner].wins++
          game.scores[winner].games++
          game.scores[winner].points += 15
          if (game.moves <= 6) game.scores[winner].points += 10 // Perfect game
        }

        clearGame(from) // FUTA CACHE
        await showTyping(sock, from)
        return await sock.sendMessage(from, {
          text: `╭─⌈ 💀 *YOU LOSE* ⌋
│ @${sender.split('@')[0]} hit 0!
│ -5 points
│
│ Winner: ${winner === 'Bot'? '🤖 Bot' : '@' + winner.split('@')[0]}
│ +15 points ${game.moves <= 6? '+10 perfect' : ''}
│ Total moves: ${game.moves}
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender, winner!== 'Bot'? winner : null].filter(Boolean)
        }, { quoted: msg })
      }

      // Continue game
      if (game.mode === 'bot') {
        // Bot turn - ANIMATED + ANTI-BAN
        game.currentTurn = 'bot'
        const botMove = getBotMove(game.current)

        // Show animated thinking
        game.botTimer = setTimeout(async () => {
          await animateBotMove(sock, from, botMove, game.current, sender, botSettings)

          game.current -= botMove
          game.moves++

          if (game.current <= 0) {
            // Bot LOSES = Player WINS
            game.scores[sender].wins++
            game.scores[sender].games++
            game.scores[sender].points += 15
            if (game.moves <= 6) game.scores[sender].points += 10

            clearGame(from) // FUTA CACHE
            await showTyping(sock, from)
            return await sock.sendMessage(from, {
              text: `╭─⌈ 🎉 *YOU WIN* ⌋
│ Bot hit 0!
│ Bot played: -${botMove}
│ +15 points ${game.moves <= 6? '+10 perfect' : ''}
│ Total: ${game.scores[sender].points} pts
│ Total moves: ${game.moves}
╰⊷ *Powered By Bunny Tech*`,
              mentions: [sender]
            }, { quoted: msg })
          }

          game.currentTurn = sender
          await showTyping(sock, from)
          await sock.sendMessage(from, {
            text: `╭─⌈ 🔢 *Bot played -${botMove}* ⌋
│ Current: *${game.current}*
│ Your turn @${sender.split('@')[0]}
│
│ Minus: ${botSettings.prefix}cd 1/2/3
│ Time: 20s
╰⊷ *Powered By Bunny Tech*`,
            mentions: [sender]
          }, { quoted: msg })

          game.turnTimer = setTimeout(() => {
            clearGame(from) // FUTA CACHE
            sock.sendMessage(from, { text: `> ⏰ Time up! You lose. Current was: ${game.current}` })
          }, 20000)
        }, 1000) // Bot delay 1s for realism

      } else {
        // PVP turn switch
        const nextPlayer = game.players.find(p => p!== sender) || sender
        game.currentTurn = nextPlayer

        await showTyping(sock, from)
        await sock.sendMessage(from, {
          text: `╭─⌈ 🔢 *${sender.split('@')[0]} played -${move}* ⌋
│ Current: *${game.current}*
│ Turn: @${nextPlayer.split('@')[0]}
│
│ Minus: ${botSettings.prefix}cd 1/2/3
│ Time: 20s
╰⊷ *Powered By Bunny Tech*`,
          mentions: [sender, nextPlayer]
        }, { quoted: msg })

        game.turnTimer = setTimeout(() => {
          clearGame(from) // FUTA CACHE
          sock.sendMessage(from, { text: `> ⏰ Time up! @${nextPlayer.split('@')[0]} loses.`, mentions: [nextPlayer] })
        }, 20000)
      }

      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, pvp, 1/2/3, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[COUNTDOWN ERROR]', err.message)
    clearGame(from) // FUTA CACHE KAMA ERROR
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error. Cache cleared.' }, { quoted: msg })
  }
}