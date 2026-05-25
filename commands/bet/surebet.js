// commands/bet/surebet.js
import axios from 'axios'

export const name = 'surebet'
export const alias = ['bet', 'odds']
export const category = 'Bet'
export const desc = 'Advanced surebet & betting intelligence'

export default async function surebet(sock, { msg, from, sender }, botSettings) {
  const prefix = botSettings.prefix
  const ODDS_API_KEY = "b771e884a70de4db3c108e6cbbb9e233"
  const STAKE = 1000

  try {
    // 1. PARSE ARGS
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 2. HELP IF NO ARGS
    if (!action) {
      await sock.sendMessage(from, { react: { text: '💰', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💰 *Surebet Intelligence* ⌋
│ Scan live odds for surebet chances
│ Auto-calculate returns & edge
│
│ *Usage:*
│ ${prefix}surebet scan - Scan top matches
│ ${prefix}surebet stats - Show betting guide
│
│ *Legend:*
│ ✅ = Safer odds (1.50-2.50)
│ 🔥 = Surebet detected
│ ❌ = Risky market
│
│ *Default Stake:* ${STAKE} TSH
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 3. STATS COMMAND
    if (action === 'stats' || action === 'help') {
      await sock.sendMessage(from, { react: { text: '📊', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📊 *Betting Guide* ⌋
│ 💵 Default Stake: ${STAKE} TSH
│
│ *Rating System:*
│ ✅ Recommended: Odds 1.50-2.50
│ 🔥 Surebet: Guaranteed profit edge
│ ❌ Risky: Odds < 1.50 or > 2.50
│
│ *How It Works:*
│ Scans bookmakers for best odds
│ Calculates returns automatically
│ Detects arbitrage opportunities
│
│ *Command:* ${prefix}surebet scan
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 4. SCAN VALIDATION
    if (action!== 'scan' && action!== 'start') {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `> Invalid. Use: ${prefix}surebet scan or ${prefix}surebet stats`
      }, { quoted: msg })
    }

    // 5. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 6. SEND SCANNING MESSAGE
    await sock.sendMessage(from, {
      text: '⚡ Scanning global betting networks...'
    }, { quoted: msg })

    // 7. FETCH ODDS DATA
    const url = `https://api.the-odds-api.com/v4/sports/soccer/odds/?apiKey=${ODDS_API_KEY}&regions=eu,uk&markets=h2h`
    const { data } = await axios.get(url)

    if (!data || data.length === 0) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ⚠️ *No Data* ⌋
│ No betting data available right now
│ Try again later
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 8. BUILD REPORT
    let report = `╭─⌈ 💰 *SUREBET ANALYSIS* ⌋\n│\n│ 💵 *Default Stake:* ${STAKE} TSH\n│\n`

    let totalMatches = 0
    let surebetCount = 0

    for (const match of data.slice(0, 10)) {
      const home = match.home_team
      const away = match.away_team

      let bestHome = 0, bestDraw = 0, bestAway = 0
      let homeBook = "", drawBook = "", awayBook = ""

      match.bookmakers?.forEach(book => {
        book.markets?.forEach(market => {
          if (market.key === "h2h") {
            market.outcomes.forEach(o => {
              if (o.name === home && o.price > bestHome) {
                bestHome = o.price
                homeBook = book.title
              }
              if (o.name === away && o.price > bestAway) {
                bestAway = o.price
                awayBook = book.title
              }
              if (o.name === "Draw" && o.price > bestDraw) {
                bestDraw = o.price
                drawBook = book.title
              }
            })
          }
        })
      })

      if (!bestHome ||!bestDraw ||!bestAway) continue
      totalMatches++

      const homeReturn = (STAKE * bestHome).toFixed(0)
      const drawReturn = (STAKE * bestDraw).toFixed(0)
      const awayReturn = (STAKE * bestAway).toFixed(0)
      const sum = (1 / bestHome) + (1 / bestDraw) + (1 / bestAway)
      const surebet = sum < 1
      const edge = ((1 - sum) * 100).toFixed(2)

      if (surebet) surebetCount++

      let bestPick = "", bestOdd = 0
      if (bestHome > bestDraw && bestHome > bestAway) {
        bestPick = `🏠 ${home}`
        bestOdd = bestHome
      }
      if (bestDraw > bestHome && bestDraw > bestAway) {
        bestPick = `🤝 DRAW`
        bestOdd = bestDraw
      }
      if (bestAway > bestHome && bestAway > bestDraw) {
        bestPick = `🛫 ${away}`
        bestOdd = bestAway
      }

      let status = "❌"
      if (bestOdd >= 1.50 && bestOdd <= 2.50) status = "✅"
      if (surebet) status = "🔥"

      report += `│ ━━━━━━━━━━━━━━━━━━━━\n│\n│ ⚽ *${home} vs ${away}*\n│\n│ ${status} *Recommended:* ${bestPick}\n│\n│ 📊 *ODDS*\n│ 🏠 Home → ${bestHome}\n│ 🤝 Draw → ${bestDraw}\n│ 🛫 Away → ${bestAway}\n│\n│ 💰 *RETURNS*\n│ 🏠 ${home} → ${homeReturn} TSH\n│ 🤝 Draw → ${drawReturn} TSH\n│ 🛫 ${away} → ${awayReturn} TSH\n│\n│ 🏪 *BOOKMAKERS*\n│ 🏠 ${homeBook}\n│ 🤝 ${drawBook}\n│ 🛫 ${awayBook}\n│\n`

      if (surebet) {
        report += `│ 🔥 *SUREBET DETECTED*\n│ 📈 Edge Profit: ${edge}%\n│\n`
      }
    }

    report += `│ ━━━━━━━━━━━━━━━━━━━━\n│\n│ 📌 *Total Matches:* ${totalMatches}\n│ 🔥 *Surebets Found:* ${surebetCount}\n│\n│ 💡 Betting Guide:\n│ ✅ = safer odds\n│ 🔥 = surebet chance\n│ ❌ = risky market\n╰⊷ *Powered By Bunny Tech*`

    // 9. SEND REPORT
    await sock.sendMessage(from, {
      text: report
    }, { quoted: msg })

    // 10. REACT DONE
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[SUREBET ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Error* ⌋
│ Could not fetch odds data
│ Try again later
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}