// commands/profile/pphistory.js
import { supabase } from '../../lib/supabase.js'

export const name = 'pphistory'
export const alias = ['pph', 'pplog', 'pppast']
export const category = 'Profile'
export const desc = 'Saves and shows profile picture history from database'

export default async function pphistory(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 📚
    await sock.sendMessage(from, {
      react: { text: '📚', key: msg.key }
    })

    // 2. Extract target - 4 super ways
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    const mentioned = quoted?.mentionedJid?.[0]
    const replied = quoted?.participant
    const textAfterCmd = args.join(' ').trim()

    let target = null

    // Way 1: Args - number direct (any country)
    if (textAfterCmd) {
      const cleanNum = textAfterCmd.replace(/[^0-9]/g, '')
      if (cleanNum.length >= 7 && cleanNum.length <= 15) {
        target = cleanNum + '@s.whatsapp.net'
      } else {
        throw new Error('INVALID_NUMBER')
      }
    }
    // Way 2: Mentioned user
    else if (mentioned) {
      target = mentioned
    }
    // Way 3: Replied user
    else if (replied) {
      target = replied
    }
    // Way 4: Sender default
    else {
      target = msg.key.participant || from
    }

    if (!target) throw new Error('NO_TARGET')

    // 3. Check if number exists on WhatsApp
    const [result] = await sock.onWhatsApp(target)
    if (!result?.exists) throw new Error('NOT_REGISTERED')

    target = result.jid
    const targetNumber = target.split('@')[0]

    // 4. Get current PP from WA
    let currentPP = null
    try {
      currentPP = await sock.profilePictureUrl(target, 'image')
    } catch (error) {
      if (error.output?.statusCode!== 404 && error.output?.statusCode!== 403) throw error
    }

    // 5. Save new PP if exists - unique constraint inazuia duplicates
    if (currentPP) {
      const { error: insertError } = await supabase
      .from('profile_pictures')
      .insert({
          jid: target,
          number: targetNumber,
          pp_url: currentPP
        })
      
      // Ignore duplicate error 23505 - means PP tayari ipo
      if (insertError && insertError.code!== '23505') {
        console.error('Supabase insert error:', insertError.message)
        throw new Error('DB_ERROR')
      }
    }

    // 6. Get history limit from bot_settings
    const { data: settings } = await supabase
    .from('bot_settings')
    .select('value')
    .eq('key', 'pp_history_limit')
    .single()
    
    const limit = parseInt(settings?.value || '10')

    // 7. Fetch history - latest first
    const { data: history, error: fetchError } = await supabase
    .from('profile_pictures')
    .select('pp_url, created_at')
    .eq('jid', target)
    .order('created_at', { ascending: false })
    .limit(limit)

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError.message)
      throw new Error('DB_ERROR')
    }
    
    if (!history || history.length === 0) throw new Error('NO_HISTORY')

    // 8. Delete za zamani ukizidi limit
    const { error: deleteError } = await supabase
    .from('profile_pictures')
    .delete()
    .eq('jid', target)
    .not('id', 'in', `(${history.map(h => h.id).join(',')})`)
    .order('created_at', { ascending: false })
    .range(limit, 1000)

    // 9. Build message
    let historyText = `╭─⌈ 📚 *PP HISTORY* ⌋
│ Number: +${targetNumber}
│ Total: ${history.length} PPs
├─────────────────────\n`

    history.forEach((item, i) => {
      const date = new Date(item.created_at).toLocaleDateString('en-GB')
      const time = new Date(item.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      historyText += `│ ${i + 1}. ${date} ${time}\n`
    })

    historyText += `╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    // 10. Send latest PP + history
    await sock.sendMessage(from, {
      image: { url: history[0].pp_url },
      caption: historyText
    }, { quoted: msg })

    // 11. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PPHISTORY ERROR]', error)

    let errorMsg = '> Failed to fetch PP history'
    
    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = '> Could not identify target user'
    } else if (error.message === 'NOT_REGISTERED') {
      errorMsg = '> Number not registered on WhatsApp'
    } else if (error.message === 'NO_HISTORY') {
      errorMsg = '> No profile picture history found for this user'
    } else if (error.message === 'DB_ERROR') {
      errorMsg = '> Database error. Check Supabase connection.'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}