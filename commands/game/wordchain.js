// commands/game/wordchain.js
import { supabase } from '../../lib/supabase.js'

export const name = 'wordchain'
export const alias = ['wc', 'chainword', 'chain']
export const category = 'Game'
export const desc = 'WordChain game: connect words by last letter. Supabase powered.'

const activeTimeouts = new Map()

export default async function wordchain(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 1. HELP MENU
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🔗', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔗 *WordChain Game* ⌋
│ Chain words by last letter
│ Example: Cat → Tiger → Rat
│
│ *Commands:*
│ ${botSettings.prefix}wordchain start - Start game
│ ${botSettings.prefix}wordchain stop - Stop game
│ ${botSettings.prefix}wordchain score - Show scores
│ ${botSettings.prefix}wordchain top - Leaderboard
│ ${botSettings.prefix}wordchain rules - Game rules
│
│ *How to play:*
│ Send a word starting with last letter
│
│ *Rules:*
│ • Min 3 letters per word
│ • No repeating words
│ • English only
│ • 30s per turn
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 2. RULES
    if (action === 'rules') {
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📜 *WordChain Rules* ⌋
│ 1. Start with any word
│ 2. Next word must start with last letter
│ 3. Example: Apple → Elephant → Tiger
│ 4. Min 3 letters, no repeats
│ 5. You have 30s to answer
│ 6. Wrong word = -1 point
│ 7. Correct word = +2 points
│ 8. Chain bonus: 5 words = +5 points
│ 9. Scores saved forever
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 3. LEADERBOARD
    if (action === 'top' || action === 'leaderboard') {
      const { data: topScores } = await supabase
  .from('wordchain_scores')
  .select('user_jid, score, wins, total_words')
  .eq('chat_jid', from)
  .order('score', { ascending: false })
  .limit(10)

      if (!topScores || topScores.length === 0) {
        return await sock.sendMessage(from, { text: '> No scores yet. Start playing!' }, { quoted: msg })
      }

      let topText = `╭─⌈ 🏆 *Leaderboard* ⌋\n`
      topScores.forEach((s, i) => {
        const medal = i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : '🎯'
        topText += `│ ${medal} ${s.user_jid.split('@')[0]}: ${s.score} pts\n`
        topText += `│ Words: ${s.total_words} | Wins: ${s.wins}\n`
      })
      topText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: topText }, { quoted: msg })
    }

    // 4. SHOW SCORE
    if (action === 'score' || action === 'scores') {
      const { data: game } = await supabase
  .from('wordchain_games')
  .select('*')
  .eq('chat_jid', from)
  .maybeSingle()

      if (!game) {
        return await sock.sendMessage(from, { text: '> No active game. Start with `.wordchain start`' }, { quoted: msg })
      }

      const { data: scores } = await supabase
  .from('wordchain_scores')
  .select('user_jid, score')
  .eq('chat_jid', from)
  .order('score', { ascending: false })

      let scoreText = `╭─⌈ 🏆 *Current Scores* ⌋\n`
      if (scores && scores.length > 0) {
        scores.forEach((s, i) => {
          const medal = i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : '🎯'
          scoreText += `│ ${medal} ${s.user_jid.split('@')[0]}: ${s.score} pts\n`
        })
      } else {
        scoreText += `│ No scores yet\n`
      }
      scoreText += `│\n│ Chain: ${game.chain.length} words\n`
      scoreText += `│ Last: ${game.last_word || 'None'}\n`
      scoreText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: scoreText }, { quoted: msg })
    }

    // 5. STOP GAME
    if (action === 'stop' || action === 'end') {
      const { data: game } = await supabase
  .from('wordchain_games')
  .select('*')
  .eq('chat_jid', from)
  .maybeSingle()

      if (!game) {
        return await sock.sendMessage(from, { text: '> No active game to stop.' }, { quoted: msg })
      }

      // Add win to last player
      if (game.last_player) {
        await supabase.rpc('increment_wordchain_wins', {
          p_chat_jid: from,
          p_user_jid: game.last_player
        })
      }

      await supabase.from('wordchain_games').delete().eq('chat_jid', from)
      clearTimeout(activeTimeouts.get(from))
      activeTimeouts.delete(from)

      await sock.sendMessage(from, { react: { text: '🛑', key: msg.key } })

      const { data: finalScores } = await supabase
  .from('wordchain_scores')
  .select('user_jid, score')
  .eq('chat_jid', from)
  .order('score', { ascending: false })
  .limit(3)

      let endText = `╭─⌈ 🛑 *Game Ended* ⌋\n`
      if (finalScores && finalScores.length > 0) {
        endText += `│ *Top Players:*\n`
        finalScores.forEach((s, i) => {
          const medal = i === 0? '🥇' : i === 1? '🥈' : '🥉'
          endText += `│ ${medal} ${s.user_jid.split('@')[0]}: ${s.score}\n`
        })
      }
      endText += `│\n│ Total Words: ${game.chain.length}\n`
      endText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: endText }, { quoted: msg })
    }

    // 6. START GAME
    if (action === 'start') {
      const { data: existing } = await supabase
  .from('wordchain_games')
  .select('id')
  .eq('chat_jid', from)
  .maybeSingle()

      if (existing) {
        return await sock.sendMessage(from, { text: '> Game already running! Use `.wordchain stop` to end.' }, { quoted: msg })
      }

      await supabase.from('wordchain_games').insert({
        chat_jid: from,
        chain: [],
        used_words: [],
        last_player: null
      })

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔗 *WordChain Started* ⌋
│ Send any word to begin!
│ Example: Apple, Cat, Dog
│
│ *Rules:* Min 3 letters, no repeats
│ *Time:* 30s per turn
│ *Points:* +2 correct, -1 wrong
│ *Database:* Scores saved forever
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, { text: `> Invalid. Use: start, stop, score, top, rules` }, { quoted: msg })

  } catch (err) {
    console.error('[WORDCHAIN ERROR]', err.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Game error. Check database.' }, { quoted: msg })
  }
}

// WORD LISTENER - SUPABASE VERSION
export async function wordchainListener(sock, { msg, from, sender }) {
  try {
    const { data: game } = await supabase
.from('wordchain_games')
.select('*')
.eq('chat_jid', from)
.maybeSingle()

    if (!game) return

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const word = body.trim().toLowerCase()

    if (word.startsWith('.') || word.startsWith('!') || word.startsWith('/')) return
    if (word.length < 3) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return
    }
    if (!/^[a-z]+$/.test(word)) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return
    }

    // Check if used
    if (game.used_words.includes(word)) {
      await supabase.rpc('update_wordchain_score', {
        p_chat_jid: from,
        p_user_jid: sender,
        p_points: -1
      })
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return
    }

    // Check last letter
    if (game.last_word && word[0]!== game.last_word.slice(-1)) {
      await supabase.rpc('update_wordchain_score', {
        p_chat_jid: from,
        p_user_jid: sender,
        p_points: -1
      })
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return
    }

    // Valid word - update game
    const newChain = [...game.chain, word]
    const newUsed = [...game.used_words, word]
    let points = 2

    // Chain bonus
    if (newChain.length % 5 === 0) {
      points += 5
      await sock.sendMessage(from, { react: { text: '🔥', key: msg.key } })
    } else {
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    }

    await supabase.from('wordchain_games').update({
      chain: newChain,
      last_word: word,
      used_words: newUsed,
      last_player: sender
    }).eq('chat_jid', from)

    await supabase.rpc('update_wordchain_score', {
      p_chat_jid: from,
      p_user_jid: sender,
      p_points: points
    })

    // Reset timeout
    clearTimeout(activeTimeouts.get(from))
    const timeout = setTimeout(async () => {
      await supabase.from('wordchain_games').delete().eq('chat_jid', from)
      activeTimeouts.delete(from)
      sock.sendMessage(from, {
        text: `╭─⌈ ⏰ *Time Up* ⌋
│ Game ended - 30s no answer
│ Last word: ${word}
│ Total: ${newChain.length} words
╰⊷ *Powered By Bunny Tech*`
      })
    }, 30000)
    activeTimeouts.set(from, timeout)

  } catch (err) {
    console.log('[WORDCHAIN LISTENER ERROR]', err.message)
  }
}