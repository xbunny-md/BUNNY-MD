// commands/game/limericks.js
export const name = 'limericks'
export const alias = ['lim', 'poem', 'rhyme5']
export const category = 'Game'
export const desc = 'Limericks: Complete 5-line funny poem with AABBA rhyme scheme'

const activeGames = new Map()

// Limerick templates - AABBA rhyme scheme
const templates = [
  {
    lines: [
      'There once was a cat from {place}',
      'Who loved to eat {food} with grace',
      'It danced all {time}',
      'In a coat of {color}',
      'That funny old cat from {place}'
    ],
    blanks: ['place', 'food', 'time', 'color'],
    hint: 'Lines 1,2,5 rhyme. Lines 3,4 rhyme.'
  },
  {
    lines: [
      'A {animal} who lived in {location}',
      'Had a strange fascination',
      'With {object} so {adj}',
      'It made others {verb}',
      'That {animal} from {location}'
    ],
    blanks: ['animal', 'location', 'object', 'adj', 'verb'],
    hint: 'AABBA: 1,2,5 must rhyme, 3,4 must rhyme'
  },
  {
    lines: [
      'There was a young {job} from {city}',
      'Whose {item} was rather {desc}',
      'When they tried to {action}',
      'It caused a {reaction}',
      'That silly young {job} from {city}'
    ],
    blanks: ['job', 'city', 'item', 'desc', 'action', 'reaction'],
    hint: 'Funny 5-line poem, AABBA rhyme'
  },
  {
    lines: [
      'An old {person} of {country}',
      'Who was known to be {trait}',
      'Once {past_action}',
      'With great {emotion}',
      'That {person} of {country}'
    ],
    blanks: ['person', 'country', 'trait', 'past_action', 'emotion'],
    hint: 'Lines 1,2,5 end same sound'
  },
  {
    lines: [
      'There once was a {creature} named {name}',
      'Who played the most curious {game}',
      'With {partner} at {time2}',
      'They climbed {place2}',
      'That {creature} named {name}'
    ],
    blanks: ['creature', 'name', 'game', 'partner', 'time2', 'place2'],
    hint: 'Make it funny! AABBA pattern'
  }
]

function getRandomTemplate() {
  return templates[Math.floor(Math.random() * templates.length)]
}

function clearGame(chatJid) {
  const game = activeGames.get(chatJid)
  if (game) {
    clearTimeout(game.timeout)
    clearTimeout(game.roundTimer)
    activeGames.delete(chatJid) // FUTA CACHE SAFI
  }
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

// Check if words rhyme - simple version
function checkRhyme(word1, word2) {
  if (!word1 ||!word2) return false
  const w1 = word1.toLowerCase().replace(/[^a-z]/g, '')
  const w2 = word2.toLowerCase().replace(/[^a-z]/g, '')
  if (w1 === w2) return true
  // Check last 2-3 letters match
  return w1.slice(-2) === w2.slice(-2) || w1.slice(-3) === w2.slice(-3)
}

export default async function limericks(sock, { msg, from, sender }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '🎭', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎭 *Limericks* ⌋
│ Complete 5-line funny poem
│ Rhyme scheme: AABBA
│ Lines 1,2,5 rhyme. Lines 3,4 rhyme
│
│ *Commands:*
│ ${botSettings.prefix}lim start - New poem
│ ${botSettings.prefix}lim fill <word1> <word2>... - Fill blanks
│ ${botSettings.prefix}lim hint - Show template (-5 pts)
│ ${botSettings.prefix}lim skip - Skip poem
│ ${botSettings.prefix}lim stop - End game
│ ${botSettings.prefix}lim score - Your score
│
│ *Scoring:*
│ Complete: +18 points
│ Good rhyme: +5 bonus
│ Wrong: -3 points
│ Hint: -5 points
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
          scoreText += `│ Completed: ${data.completed} | Rhymes: ${data.goodRhymes}\n`
        })
      }
      scoreText += `│\n│ Round: ${game.round}\n`
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
      endText += `│ Template: ${game.template.lines.join('\n│ ')}\n`
      endText += `│ Blanks: ${game.template.blanks.join(', ')}\n`
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
        return await sock.sendMessage(from, { text: '> Game running! Complete current poem.' }, { quoted: msg })
      }

      const template = getRandomTemplate()

      const gameData = {
        template: template,
        hintUsed: false,
        scores: {},
        round: 1,
        startTime: Date.now(),
        timeout: null,
        roundTimer: null,
        completed: false
      }

      activeGames.set(from, gameData)
      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      // Show template with blanks
      let poemText = template.lines.map(line => line.replace(/\{(\w+)\}/g, '_____')).join('\n')

      await sock.sendMessage(from, {
        text: `╭─⌈ 🎭 *Limericks Round 1* ⌋
│ Fill the blanks to complete poem
│ Rhyme: AABBA
│
│ ${poemText}
│
│ Blanks: ${template.blanks.join(', ')}
│ Type: ${botSettings.prefix}lim fill word1 word2...
│ Time: 90s
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      // Round timeout 90s
      gameData.roundTimer = setTimeout(async () => {
        await showTyping(sock, from)
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ ${template.hint}
│ Blanks: ${template.blanks.join(', ')}
│ Next round...
╰⊷ *Powered By Bunny Tech*`
        })
        nextRound(from, sock, botSettings)
      }, 90000)

      // Game timeout 240s
      gameData.timeout = setTimeout(() => {
        clearGame(from) // FUTA CACHE
        sock.sendMessage(from, { text: `> ⏰ Game ended! Total rounds: ${gameData.round}` })
      }, 240000)

      return
    }

    // 5. HINT
    if (action === 'hint') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })
      if (game.hintUsed) return await sock.sendMessage(from, { text: '> Hint already used!' }, { quoted: msg })

      game.hintUsed = true
      if (!game.scores[sender]) game.scores[sender] = { points: 0, completed: 0, goodRhymes: 0 }
      game.scores[sender].points -= 5

      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '💡', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *Hint* ⌋
│ ${game.template.hint}
│ Blanks needed: ${game.template.blanks.join(', ')}
│ Example: Kenya, rice, night, white
│ -5 points
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. SKIP
    if (action === 'skip') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const oldTemplate = game.template
      const newTemplate = getRandomTemplate()

      clearTimeout(game.roundTimer)
      game.template = newTemplate
      game.hintUsed = false
      game.completed = false
      game.startTime = Date.now()

      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '⏭️', key: msg.key } })

      let poemText = newTemplate.lines.map(line => line.replace(/\{(\w+)\}/g, '_____')).join('\n')

      await sock.sendMessage(from, {
        text: `╭─⌈ ⏭️ *Skipped* ⌋
│ Previous template cleared
│
│ *New Poem:*
│ ${poemText}
│
│ Blanks: ${newTemplate.blanks.join(', ')}
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })

      game.roundTimer = setTimeout(async () => {
        await showTyping(sock, from)
        await sock.sendMessage(from, {
          text: `╭─⌈ ⏰ *Time Up* ⌋
│ ${newTemplate.hint}
│ Next round...
╰⊷ *Powered By Bunny Tech*`
        })
        nextRound(from, sock, botSettings)
      }, 90000)

      return
    }

    // 7. FILL - Submit words
    if (action === 'fill') {
      const game = activeGames.get(from)
      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.lim start`' }, { quoted: msg })
      if (game.completed) return await sock.sendMessage(from, { text: '> Poem already completed! Wait for next...' }, { quoted: msg })

      const words = args.slice(1)
      if (words.length!== game.template.blanks.length) {
        return await sock.sendMessage(from, {
          text: `> Need ${game.template.blanks.length} words for: ${game.template.blanks.join(', ')}\n> You gave: ${words.length}`
        }, { quoted: msg })
      }

      if (!game.scores[sender]) game.scores[sender] = { points: 0, completed: 0, goodRhymes: 0 }
      game.scores[sender].points += 18
      game.scores[sender].completed++
      game.completed = true
      const timeTaken = (Date.now() - game.startTime) / 1000

      // Fill template
      let filledPoem = game.template.lines[0]
      let wordIndex = 0
      game.template.blanks.forEach(blank => {
        const regex = new RegExp(`\\{${blank}\\}`, 'g')
        game.template.lines = game.template.lines.map(line =>
          line.replace(regex, words[wordIndex])
        )
        wordIndex++
      })

      // Check rhyme quality - AABBA
      const line1End = words[0]
      const line2End = words[1]
      const line5End = words[0] // Should match line 1
      const line3End = words[2]
      const line4End = words[3]

      let rhymeBonus = 0
      if (checkRhyme(line1End, line2End)) rhymeBonus += 3
      if (checkRhyme(line3End, line4End)) rhymeBonus += 2

      if (rhymeBonus > 0) {
        game.scores[sender].points += rhymeBonus
        game.scores[sender].goodRhymes++
      }

      await showTyping(sock, from)
      await sock.sendMessage(from, { react: { text: '🎉', key: msg.key } })

      clearTimeout(game.roundTimer)
      await sock.sendMessage(from, {
        text: `╭─⌈ 🎉 *POEM COMPLETE* ⌋
│ ${game.template.lines.join('\n│ ')}
│
│ Time: ${timeTaken.toFixed(1)}s
│ +18 points ${rhymeBonus? `+${rhymeBonus} rhyme bonus` : ''}
│ Total: ${game.scores[sender].points} pts
│
│ Well done @${sender.split('@')[0]}!
╰⊷ *Powered By Bunny Tech*`,
        mentions: [sender]
      }, { quoted: msg })

      setTimeout(() => nextRound(from, sock, botSettings), 3000)

      return
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, fill <words>, hint, skip, stop, score` }, { quoted: msg })

  } catch (err) {
    console.error('[LIMERICKS ERROR]', err.message)
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
  game.completed = false
  game.startTime = Date.now()
  const template = getRandomTemplate()
  game.template = template

  let poemText = template.lines.map(line => line.replace(/\{(\w+)\}/g, '_____')).join('\n')

  await showTyping(sock, chatJid)
  await sock.sendMessage(chatJid, {
    text: `╭─⌈ 🎭 *Round ${game.round}* ⌋
│ Fill the blanks to complete poem
│ Rhyme: AABBA
│
│ ${poemText}
│
│ Blanks: ${template.blanks.join(', ')}
│ Type: ${botSettings.prefix}lim fill word1 word2...
│ Time: 90s
╰⊷ *Powered By Bunny Tech*`
  })

  clearTimeout(game.roundTimer)
  game.roundTimer = setTimeout(async () => {
    await showTyping(sock, chatJid)
    await sock.sendMessage(chatJid, {
      text: `╭─⌈ ⏰ *Time Up* ⌋
│ ${template.hint}
│ Blanks: ${template.blanks.join(', ')}
│ Next round...
╰⊷ *Powered By Bunny Tech*`
    })
    nextRound(chatJid, sock, botSettings)
  }, 90000)
}