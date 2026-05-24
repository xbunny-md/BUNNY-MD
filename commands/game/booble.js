// commands/game/boggle.js
export const name = 'boggle'
export const alias = ['bog', 'wordgrid', 'grid']
export const category = 'Game'
export const desc = 'Boggle: Find as many words as possible in 4x4 letter grid'

const activeGames = new Map()

// 4x4 Boggle dice - each die has 6 letters
const dice = [
  ['A', 'A', 'E', 'E', 'G', 'N'],
  ['E', 'L', 'R', 'T', 'Y'],
  ['A', 'O', 'O', 'T', 'T', 'W'],
  ['A', 'B', 'B', 'J', 'O', 'O'],
  ['E', 'H', 'R', 'T', 'V', 'W'],
  ['C', 'I', 'M', 'O', 'T', 'U'],
  ['D', 'I', 'S', 'T', 'T', 'Y'],
  ['E', 'I', 'O', 'S', 'S', 'T'],
  ['D', 'E', 'L', 'R', 'V', 'Y'],
  ['A', 'C', 'H', 'O', 'P', 'S'],
  ['H', 'I', 'M', 'N', 'Q', 'U'],
  ['E', 'E', 'I', 'N', 'S', 'U'],
  ['E', 'E', 'G', 'H', 'N', 'W'],
  ['A', 'F', 'F', 'K', 'P', 'S'],
  ['H', 'L', 'N', 'N', 'R', 'Z'],
  ['D', 'E', 'I', 'L', 'R', 'X']
]

// Common 3-8 letter words for validation - basic set
const validWords = new Set([
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'ANY', 'CAN', 'HAD', 'HER', 'WAS', 'ONE', 'OUR',
  'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO',
  'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'CAT', 'DOG', 'RUN', 'SUN', 'FUN',
  'GAME', 'TIME', 'LIFE', 'LOVE', 'WORD', 'WORK', 'PLAY', 'HELP', 'MOVE', 'TURN', 'CALL', 'LOOK', 'FIND',
  'GIVE', 'TAKE', 'KEEP', 'MAKE', 'COME', 'KNOW', 'WANT', 'NEED', 'FEEL', 'TELL', 'ASK', 'SEEM', 'TRY',
  'LEAVE', 'RIGHT', 'THINK', 'WHERE', 'BEING', 'EVERY', 'GREAT', 'MIGHT', 'SHALL', 'STILL', 'THOSE', 'WORLD',
  'AFTER', 'FIRST', 'NEVER', 'THESE', 'THREE', 'UNDER', 'WATER', 'WHITE', 'ABOUT', 'AGAIN', 'WOULD', 'THERE',
  'THEIR', 'COULD', 'OTHER', 'AFTER', 'FIRST', 'NEVER', 'THESE', 'THINK', 'WHERE', 'BEING', 'HAPPY', 'MONEY',
  'MUSIC', 'PARTY', 'DANCE', 'SMILE', 'LAUGH', 'DREAM', 'LIGHT', 'NIGHT', 'HEART', 'HOUSE', 'PLACE', 'STORY',
  'FRIEND', 'FAMILY', 'PEOPLE', 'PERSON', 'SCHOOL', 'COUNTRY', 'ANIMAL', 'PLANET', 'NATURE', 'FUTURE'
])

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    clearTimeout(game.roundTimer)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
}

// Generate 4x4 grid by rolling dice
function generateGrid() {
  const grid = []
  const shuffledDice = [...dice].sort(() => Math.random() - 0.5)

  for (let i = 0; i < 16; i++) {
    const die = shuffledDice[i]
    const letter = die[Math.floor(Math.random() * 6)]
    grid.push(letter === 'Q'? 'Qu' : letter)
  }

  return grid
}

// Display grid as 4x4
function displayGrid(grid) {
  let display = ''
  for (let i = 0; i < 4; i++) {
    display += '│ '
    for (let j = 0; j < 4; j++) {
      const idx = i * 4 + j
      display += grid[idx].padEnd(3) + ' '
    }
    display += '\n'
  }
  return display
}

// Check if word exists in grid - basic DFS
function canFormWord(grid, word) {
  word = word.toUpperCase().replace('QU', 'Q')
  const visited = Array(16).fill(false)

  function dfs(idx, wordIdx) {
    if (wordIdx === word.length) return true
    if (idx < 0 || idx >= 16 || visited[idx]) return false

    const letter = grid[idx].toUpperCase().replace('QU', 'Q')
    if (letter!== word[wordIdx]) return false

    visited[idx] = true
    const row = Math.floor(idx / 4)
    const col = idx % 4

    // Check all 8 directions
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const newRow = row + dr
        const newCol = col + dc
        if (newRow >= 0 && newRow < 4 && newCol >= 0 && newCol < 4) {
          const newIdx = newRow * 4 + newCol
          if (dfs(newIdx, wordIdx + 1)) return true
        }
      }
    }

    visited[idx] = false
    return false
  }

  // Try starting from each position
  for (let i = 0; i < 16; i++) {
    if (dfs(i, 0)) return true
  }
  return false
}

// Score word by length
function scoreWord(word) {
  const len = word.length
  if (len < 3) return 0
  if (len <= 4) return 1
  if (len === 5) return 2
  if (len === 6) return 3
  if (len === 7) return 5
  return 11 // 8+ letters
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

// ANIMATED GRID REVEAL
async function animateGrid(sock, from, grid) {
  const frames = [
    '🔤 *Shaking dice...*',
    '🔤 *Rolling...*',
    displayGrid(grid.map((_, i) => '?')),
    displayGrid(grid.map((l, i) => i < 8? l : '?')),
    displayGrid(grid)
  ]

  const key = await sock.sendMessage(from, { text: frames[0] })

  for (let i = 1; i < frames.length; i++) {
    await new Promise(r => setTimeout(r, 600))
    await sock.sendMessage(from, { text: frames[i], edit: key.key })
  }

  return key
}

export default async function boggle(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '🔤', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔤 *Boggle* ⌋
│ Find words in 4x4 letter grid
│ Letters must connect (adjacent)
│ Min 3 letters, no reuse per word
│
│ *Commands:*
│ ${botSettings.prefix}bog start - New grid
│ ${botSettings.prefix}bog <word> - Submit word
│ ${botSettings.prefix}bog list - Your words
│ ${botSettings.prefix}bog skip - Skip grid
│ ${botSettings.prefix}bog stop - End game
│ ${botSettings.prefix}bog score - Scores
│
│ *Scoring:*
│ 3-4 letters: 1 pt
│ 5 letters: 2 pts
│ 6 letters: 3 pts
│ 7 letters: 5 pts
│ 8+ letters: 11 pts
│ Longest word: +10 bonus
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
          scoreText += `│ ${medal} ${user.split('@')[0]}: ${data.points} pts\n`
          scoreText += `│ Words: ${data.words.length} | Longest: ${data.longest || 'None'}\n`
        })
      }
      scoreText += `│\n│ Round: ${game.round} | Time left: ${Math.max(0, Math.floor((game.endTime - Date.now()) / 1000))}s\n`
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
      endText += displayGrid(game.grid)
      endText += `│ Rounds: ${game.round}\n│\n`

      const sorted = Object.entries(game.scores).sort((a, b) => b[1].points - a[1].points)
      if (sorted.length > 0) {
        endText += `│ *Final Scores:*\n`
        sorted.forEach(([user, data], i) => {
          const medal = i === 0? '🥇' : i === 1? '🥈' : '🥉'
          endText += `│ ${medal} ${user.split('@')[0]}: ${data.points} pts (${data.words.length} words)\n`
        })
      }
      endText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: endText }, { quoted: msg })
    }

    // 4. START
    if (action === 'start') {
      if (activeGames.has(from)) {
        return await sock.sendMessage(from, { text: '> Game running! Find words in current grid.' }, { quoted: msg })
      }

      const grid = generateGrid()

      const gameData = {
        grid: grid,
        scores: {},
        round: 1,
        startTime: Date.now(),
        endTime: Date.now() + 120000, // 2 minutes
        timeout: null,
        roundTimer: null
      }

      activeGames.set(from, gameData)
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      // ANIMATED GRID
      await animateGrid(sock, from, grid)

      await new Promise(r => setTimeout(r, 500))
      await sock.sendMessage(from, {
        text: `╭─⌈ 🔤 *Boggle Round 1* ⌋
${displayGrid(grid)}│
│ Find words (min 3 letters)
│ Letters must connect
│ Type:.bog <word>
│ Time: 120s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Round timeout 120s
      gameData.roundTimer = setTimeout(async () => {
        await showTyping(sock, from)
        let resultText = `╭─⌈ ⏰ *Time Up* ⌋\n`
        resultText += displayGrid(grid)

        const sorted = Object.entries(gameData.scores).sort((a, b) => b[1].points - a[1].points)
        if (sorted.length > 0) {
          resultText += `│\n│ *Results:*\n`
          sorted.forEach(([user, data], i) => {
            const medal = i === 0? '🥇' : i === 1? '🥈' : '🥉'
            resultText += `│ ${medal} ${user.split('@')[0]}: ${data.points} pts (${data.words.length} words)\n`
            if (data.longest) resultText += `│ Longest: ${data.longest}\n`
          })
        }
        resultText += `╰⊷ *Powered By Bunny Tech*`

        await sock.sendMessage(from, { text: resultText })
        clearGame(from) // FUTA CACHE
      }, 120000)

      // Game timeout 120s
      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
      }, 120000)

      return
    }

    // 5. LIST - Show user's words
    if (action === 'list' || action === 'words') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const userData = game.scores[sender]
      if (!userData || userData.words.length === 0) {
        return await sock.sendMessage(from, { text: '> You haven\'t found any words yet.' }, { quoted: msg })
      }

      await showTyping(sock, from)
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📝 *Your Words* ⌋
│ Total: ${userData.words.length} words
│ Points: ${userData.points}
│
│ ${userData.words.join(', ')}
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SKIP
    if (action === 'skip') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const oldGrid = game.grid
      const newGrid = generateGrid()

      clearTimeout(game.roundTimer)
      game.grid = newGrid
      game.startTime = Date.now()
      game.endTime = Date.now() + 120000
      // Reset player words but keep scores
      Object.keys(game.scores).forEach(user => {
        game.scores[user].words = []
        game.scores[user].longest = ''
      })

      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '⏭️', key: msg.key } })

      await animateGrid(sock, from, newGrid)
      await new Promise(r => setTimeout(r, 500))

      await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *Skipped* ⌋
${displayGrid(newGrid)}│
│ Find words in new grid
│ Type:.bog <word>
│ Time: 120s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      game.roundTimer = setTimeout(async () => {
        await showTyping(sock, from)
        await sock.sendMessage(from, { text: `> ⏰ Time up! New round...` })
        clearGame(from) // FUTA CACHE
      }, 120000)

      return
    }

    // 7. GUESS - Submit word
    const word = args[0]?.toUpperCase()
    if (word) {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.bog start`' }, { quoted: msg })

      if (Date.now() > game.endTime) {
        return await sock.sendMessage(from, { text: '> Time up! Start new game.' }, { quoted: msg })
      }

      if (!game.scores[sender]) {
        game.scores[sender] = { points: 0, words: [], longest: '' }
      }

      const userData = game.scores[sender]

      // Validate word
      if (word.length < 3) {
        return await sock.sendMessage(from, { text: '> Word must be 3+ letters!' }, { quoted: msg })
      }

      if (userData.words.includes(word)) {
        return await sock.sendMessage(from, { text: '> You already found that word!' }, { quoted: msg })
      }

      if (!validWords.has(word) && word.length > 3) {
        // For demo, accept if can be formed in grid
        if (!canFormWord(game.grid, word)) {
          return await sock.sendMessage(from, { text: '> Cannot form that word from grid!' }, { quoted: msg })
        }
      }

      if (!canFormWord(game.grid, word)) {
        return await sock.sendMessage(from, { text: '> Cannot form that word from grid!' }, { quoted: msg })
      }

      // Valid word
      const points = scoreWord(word)
      userData.points += points
      userData.words.push(word)

      if (!userData.longest || word.length > userData.longest.length) {
        userData.longest = word
        if (word.length >= 6) userData.points += 10 // Longest bonus
      }

      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Found* ⌋
│ Word: *${word}* (+${points} pts)
│ Total: ${userData.points} pts
│ Words: ${userData.words.length}
│ ${userData.longest && word === userData.longest? `Longest: ${userData.longest} ${word.length >= 6? '+10 bonus' : ''}` : ''}
╰⊷ *Powered By Bunny Tech*`,
        mentions: [sender]
      }, { quoted: msg })

      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, <word>, list, skip, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[BOGGLE ERROR]', err.message)
    clearGame(from) // FUTA CACHE KAMA ERROR
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error. Cache cleared.' }, { quoted: msg })
  }
}