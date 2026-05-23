// commands/general/uptime.js
import { supabase } from '../../lib/supabase.js'

export const name = 'uptime'
export const alias = ['runtime', 'up']
export const category = 'General'
export const desc = 'Shows bot uptime since first session was generated'

export default async function uptime(sock, { msg, from }, botSettings) {
  try {
    // 1. React kwanza
    await sock.sendMessage(from, {
      react: { text: '🎱', key: msg.key }
    })

    // 2. Chukua timestamp ya session kutoka Supabase - bu_sessions
    const { data, error } = await supabase
      .from('bu_sessions')
      .select('updated_at')
      .eq('id', 'full_session')
      .single()

    if (error || !data) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎱 *BUNNY UPTIME* ⌋\n│\n│ Session not found in database\n│ Please scan QR again\n│\n╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // 3. Check kama kuna 'first_start' - Uptime ya kudumu
    let sessionStart
    const { data: startData } = await supabase
      .from('bu_sessions')
      .select('updated_at')
      .eq('id', 'first_start')
      .single()

    if (startData?.updated_at) {
      // Tumia first_start kama ipo - HII HAIFUTWI UKIRESTART
      sessionStart = new Date(startData.updated_at)
    } else {
      // Kama hakuna, tengeneza first_start SASA na tumia updated_at ya session
      sessionStart = new Date(data.updated_at)
      await supabase.from('bu_sessions').upsert({
        id: 'first_start',
        data: 'BUNNY_MD_FIRST_BOOT',
        updated_at: sessionStart.toISOString()
      })
    }

    // 4. Calculate muda toka session ya kwanza
    const now = new Date()
    const diffMs = now - sessionStart

    const seconds = Math.floor(diffMs / 1000) % 60
    const minutes = Math.floor(diffMs / (1000 * 60)) % 60
    const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)

    // 5. Format tarehe ya session
    const sessionDate = sessionStart.toLocaleString('en-GB', {
      timeZone: 'Africa/Dar_es_Salaam',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    // 6. Format uptime smart
    let runtimeText = ''
    if (months > 0) runtimeText += `${months} Months, `
    if (weeks > 0 && months === 0) runtimeText += `${weeks} Weeks, `
    runtimeText += `${days % 30} Days, ${hours} Hours\n│ ${minutes} Minutes, ${seconds} Seconds`

    // 7. Tengeneza caption nzuri
    const uptimeText = `╭─⌈ 🎱 *BUNNY UPTIME* ⌋
│
│ *First Session Generated:*
│ ${sessionDate} EAT
│
│ *Total Runtime:*
│ ${runtimeText}
│
│ *Status:* Online & Stable 🐰
│ *Platform:* Render Cloud
│ *Version:* BUNNY MD v1.0
│ *Process Uptime:* ${Math.floor(process.uptime())}s
│
╰⊷ *${botSettings.botname}*`

    await sock.sendMessage(from, {
      text: uptimeText
    }, { quoted: msg })

  } catch (err) {
    console.error('[UPTIME ERROR]', err.message)
    await sock.sendMessage(from, {
      text: `╭─⌈ 🎱 *BUNNY UPTIME* ⌋\n│\n│ Failed to fetch uptime\n│ Error: ${err.message}\n│\n╰⊷ *${botSettings.botname}*`
    }, { quoted: msg })
  }
}