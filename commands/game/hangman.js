// commands/game/hangman.js
import { supabase } from '../../lib/supabase.js'

export const name = 'hangman'
export const alias = ['hm', 'hang', 'hman']
export const category = 'Game'
export const desc = 'Hangman game: guess the word letter by letter. Supabase powered.'

const hangmanStages = [
  '```\n +---+\n | |\n |\n |\n |\n |\n=========```',
  '```\n +---+\n | |\n O |\n |\n |\n |\n=========```',
  '```\n +---+\n | |\n O |\n | |\n |\n |\n=========```',
  '```\n +---+\n | |\n O |\n /| |\n |\n |\n=========```',
  '```\n +---+\n | |\n O |\n /|\\ |\n |\n |\n=========```',
  '```\n +---+\n | |\n O |\n /|\\ |\n / |\n |\n=========```',
  '```\n +---+\n | |\n O |\n /|\\ |\n / \\ |\n |\n=========```'
]

export default async function hangman(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🎯', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎯 *Hangman Game* ⌋
│ Guess the hidden word
│ You have 6 lives
│
│ *Commands:*
│ ${botSettings.prefix}hangman start - New game
│ ${botSettings.prefix}hangman guess <letter> - Guess letter
│ ${botSettings.prefix}hangman word <word> - Guess full word
│ ${botSettings.prefix}hangman stop - End game
│ ${botSettings.prefix}hangman score - Your stats
│ ${botSettings.prefix}hangman top - Leaderboard
│ ${botSettings.prefix}hangman hint - Get hint
│
│ *Categories:*
│ animals, fruits, tech, countries
│ Example: ${botSettings.prefix}hangman start animals
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 2. SCORE
    if (action === 'score' || action === 'stats') {
      const { data: score } = await supabase
.from('hangman_scores')
.select('*')
.eq('chat_jid', from)
.eq('user_jid', sender)
.maybeSingle()

      if (!score) {
        return await sock.sendMessage(from, { text: `> @${sender.split('@')[0]} no games played yet.`, mentions: [sender] }, { quoted: msg })
      }

      const winRate = score.total_games > 0? ((score.wins / score.total_games) * 100).toFixed(1) : 0

      return await sock.sendMessage(from, {
        text: `╭─⌈ 📊 *Your Stats* ⌋
│ Player: @${sender.split('@')[0]}
│ Wins: ${score.wins} 🏆
│ Losses: ${score.losses} 💀
│ Win Rate: ${winRate}%
│ Words Guessed: ${score.words_guessed}
│ Best Streak: ${score.best_streak} 🔥
│ Current Streak: ${score.current_streak}
╰⊷ *Powered By Bunny Tech*`,
        mentions: [sender]
      }, { quoted: msg })
    }

    // 3. LEADERBOARD
    if (action === 'top' || action === 'leaderboard') {
      const { data: topScores } = await supabase
.from('hangman_scores')
.select('user_jid, wins, losses, words_guessed, best_streak')
.eq('chat_jid', from)
.order('wins', { ascending: false })
.limit(10)

      if (!topScores || topScores.length === 0) {
        return await sock.sendMessage(from, { text: '> No scores yet. Start playing!' }, { quoted: msg })
      }

      let topText = `╭─⌈ 🏆 *Hangman Leaders* ⌋\n`
      topScores.forEach((s, i) => {
        const medal = i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : '🎯'
        const rate = s.wins + s.losses > 0? ((s.wins / (s.wins + s.losses)) * 100).toFixed(0) : 0
        topText += `│ ${medal} ${s.user_jid.split('@')[0]}\n`
        topText += `│ Wins: ${s.wins} | Rate: ${rate}%\n`
        topText += `│ Streak: ${s.best_streak} 🔥\n`
      })
      topText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: topText }, { quoted: msg })
    }

    // 4. HINT
    if (action === 'hint') {
      const { data: game } = await supabase
.from('hangman_games')
.select('*')
.eq('chat_jid', from)
.maybeSingle()

      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 💡 *Hint* ⌋
│ Category: ${game.category}
│ Hint: ${game.hint || 'No hint available'}
│ Lives: ${game.lives} ❤️
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. STOP
    if (action === 'stop' || action === 'end') {
      const { data: game } = await supabase
.from('hangman_games')
.select('*')
.eq('chat_jid', from)
.maybeSingle()

      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      await supabase.from('hangman_games').delete().eq('chat_jid', from)
      await sock.sendMessage(from, { react: { text: '🛑', key: msg.key } })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 🛑 *Game Ended* ⌋
│ Word was: *${game.word.toUpperCase()}*
│ Progress: ${game.current_state}
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. START GAME
    if (action === 'start') {
      const { data: existing } = await supabase
.from('hangman_games')
.select('id')
.eq('chat_jid', from)
.maybeSingle()

      if (existing) return await sock.sendMessage(from, { text: '> Game already running! Use `.hangman guess <letter>`' }, { quoted: msg })

      const category = args[1]?.toLowerCase() || null
      const { data: wordData } = await supabase.rpc('get_random_hangman_word', { p_category: category })

      if (!wordData || wordData.length === 0) {
        return await sock.sendMessage(from, { text: '> No words found. Try another category.' }, { quoted: msg })
      }

      const { word, hint, category: cat } = wordData[0]
      const currentState = '_ '.repeat(word.length).trim()

      await supabase.from('hangman_games').insert({
        chat_jid: from,
        word: word.toLowerCase(),
        hint: hint,
        category: cat,
        current_state: currentState,
        started_by: sender
      })

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎯 *Hangman Started* ⌋
│ Category: ${cat}
│ Hint: ${hint || 'No hint'}
│
${hangmanStages[0]}
│
│ Word: ${currentState}
│ Lives: 6 ❤️
│
│ Guess: ${botSettings.prefix}hangman guess <letter>
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 7. GUESS LETTER
    if (action === 'guess' || action === 'g') {
      const letter = args[1]?.toLowerCase()
      if (!letter || letter.length!== 1 ||!/^[a-z]$/.test(letter)) {
        return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}hangman guess <letter>` }, { quoted: msg })
      }

      const { data: game } = await supabase
.from('hangman_games')
.select('*')
.eq('chat_jid', from)
.maybeSingle()

      if (!game) return await sock.sendMessage(from, { text: '> No active game. Start with `.hangman start`' }, { quoted: msg })

      if (game.guessed_letters.includes(letter)) {
        return await sock.sendMessage(from, { text: `> Letter "${letter}" already guessed!` }, { quoted: msg })
      }

      let newGuessed = [...game.guessed_letters, letter]
      let newWrong = [...game.wrong_guesses]
      let newLives = game.lives
      let newState = game.current_state.split(' ')

      if (game.word.includes(letter)) {
        // Correct guess
        game.word.split('').forEach((char, i) => {
          if (char === letter) newState[i] = letter
        })
        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      } else {
        // Wrong guess
        newWrong.push(letter)
        newLives--
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      }

      const finalState = newState.join(' ')
      const isWin =!finalState.includes('_')
      const isLose = newLives <= 0

      await supabase.from('hangman_games').update({
        guessed_letters: newGuessed,
        wrong_guesses: newWrong,
        lives: newLives,
        current_state: finalState
      }).eq('chat_jid', from)

      // Check win/lose
      if (isWin || isLose) {
        await supabase.rpc('update_hangman_score', {
          p_chat_jid: from,
          p_user_jid: sender,
          p_won: isWin
        })
        await supabase.from('hangman_games').delete().eq('chat_jid', from)

        const resultText = isWin?
          `╭─⌈ 🎉 *YOU WON* ⌋\n│ Word: *${game.word.toUpperCase()}*\n│ Lives left: ${newLives} ❤️\n│ Guessed by: @${sender.split('@')[0]}\n╰⊷ *Powered By Bunny Tech*` :
          `╭─⌈ 💀 *GAME OVER* ⌋\n${hangmanStages[6]}\n│ Word was: *${game.word.toUpperCase()}*\n│ Better luck next time!\n╰⊷ *Powered By Bunny Tech*`

        return await sock.sendMessage(from, { text: resultText, mentions: [sender] }, { quoted: msg })
      }

      // Continue game
      const stage = hangmanStages[6 - newLives]
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎯 *Hangman* ⌋
${stage}
│ Word: ${finalState}
│ Lives: ${newLives} ❤️
│ Wrong: ${newWrong.join(', ') || 'None'}
│
│ Guess: ${botSettings.prefix}hangman guess <letter>
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 8. GUESS FULL WORD
    if (action === 'word' || action === 'w') {
      const guessWord = args[1]?.toLowerCase()
      if (!guessWord) return await sock.sendMessage(from, { text: `> Usage: ${botSettings.prefix}hangman word <word>` }, { quoted: msg })

      const { data: game } = await supabase
.from('hangman_games')
.select('*')
.eq('chat_jid', from)
.maybeSingle()

      if (!game) return await sock.sendMessage(from, { text: '> No active game.' }, { quoted: msg })

      const isWin = guessWord === game.word
      await supabase.rpc('update_hangman_score', {
        p_chat_jid: from,
        p_user_jid: sender,
        p_won: isWin
      })
      await supabase.from('hangman_games').delete().eq('chat_jid', from)

      const resultText = isWin?
        `╭─⌈ 🎉 *CORRECT* ⌋\n│ Word: *${game.word.toUpperCase()}*\n│ Winner: @${sender.split('@')[0]}\n╰⊷ *Powered By Bunny Tech*` :
        `╭─⌈ ❌ *WRONG* ⌋\n│ Your guess: ${guessWord}\n│ Correct: *${game.word.toUpperCase()}*\n╰⊷ *Powered By Bunny Tech*`

      await sock.sendMessage(from, { react: { text: isWin? '🎉' : '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: resultText, mentions: [sender] }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, guess, word, stop, score, top, hint` }, { quoted: msg })

  } catch (err) {
    console.error('[HANGMAN ERROR]', err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error. Check database.' }, { quoted: msg })
  }
}