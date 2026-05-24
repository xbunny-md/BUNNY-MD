// observers/antitoxic.js
import { supabase } from '../lib/supabase.js'

const AUTO_CLEAN_HOURS = 24

export default async function antitoxic(sock, { msg, from, sender, isGroup, isAdmin, isBotAdmin }, botSettings) {
  try {
    // ✅ FIX: Skip bot, private, admin, au kama bot sio admin
    if (msg.key.fromMe ||!isGroup || isAdmin ||!isBotAdmin) return

    const body = msg.message?.conversation ||
                 msg.message?.extendedTextMessage?.text ||
                 msg.message?.imageMessage?.caption ||
                 msg.message?.videoMessage?.caption || ''

    if (!body) return

    // 1. CHECK SETTINGS - kama antitoxic imewashwa
    const { data: settings } = await supabase
     .from('group_settings')
     .select('antitoxic, badword_filter')
     .eq('group_jid', from)
     .single()

    if (!settings?.antitoxic &&!settings?.badword_filter) return

    // 2. ✅ GET TOXIC WORDS FROM DATABASE
    const { data: badWords } = await supabase
     .from('bad_words')
     .select('word')
     .eq('group_jid', from)

    // Kama group haina words zake, tumia global defaults
    let toxicWords = []
    if (badWords && badWords.length > 0) {
      toxicWords = badWords.map(w => w.word.toLowerCase())
    } else {
      // Global defaults kama group haijaweka zake
      const { data: globalWords } = await supabase
       .from('bad_words')
       .select('word')
       .eq('group_jid', 'global')

      toxicWords = globalWords? globalWords.map(w => w.word.toLowerCase()) : []
    }

    if (toxicWords.length === 0) return

    // 3. CHECK TOXIC CONTENT
    const lowerBody = body.toLowerCase()
    const foundToxic = toxicWords.find(word => {
      // Match whole word only - kuzuia "class" itrigge "ass"
      const regex = new RegExp(`\\b${word}\\b`, 'i')
      return regex.test(lowerBody)
    })

    if (!foundToxic) return

    // 4. DELETE MESSAGE
    await sock.sendMessage(from, { delete: msg.key })

    const senderTag = `@${sender.split('@')[0]}`

    // 5. UPDATE WARNINGS
    const { data: existingWarning } = await supabase
     .from('user_warnings')
     .select('count')
     .eq('user_jid', sender)
     .eq('group_jid', from)
     .eq('warning_type', 'toxic')
     .single()

    let warningCount = 1

    if (existingWarning) {
      warningCount = existingWarning.count + 1
      await supabase
       .from('user_warnings')
       .update({
          count: warningCount,
          last_warning: new Date().toISOString(),
          reason: foundToxic
        })
       .eq('user_jid', sender)
       .eq('group_jid', from)
       .eq('warning_type', 'toxic')
    } else {
      await supabase.from('user_warnings').insert({
        user_jid: sender,
        group_jid: from,
        warning_type: 'toxic',
        reason: foundToxic,
        count: 1
      })
    }

    // Auto clean after 24hrs
    await supabase
     .from('user_warnings')
     .delete()
     .lt('last_warning', new Date(Date.now() - AUTO_CLEAN_HOURS * 3600000).toISOString())
     .eq('warning_type', 'toxic')

    // 6. SEND CLEAN SHORT MESSAGE
    let warningText = `╭─⌈ ☢️ *AntiToxic* ⌋\n`
    warningText += `│ User: ${senderTag}\n`
    warningText += `│ Word: ${foundToxic}\n`
    warningText += `│ Warn: ${warningCount}/3\n`
    warningText += `╰⊷ *Powered by Bunny Tech*`

    await sock.sendMessage(from, {
      text: warningText,
      mentions: [sender]
    })

    // 7. AUTO KICK AT 3 WARNINGS
    if (warningCount >= 3) {
      await sock.groupParticipantsUpdate(from, [sender], 'remove')

      let kickText = `╭─⌈ ⚠️ *Kicked* ⌋\n`
      kickText += `│ User: ${senderTag}\n`
      kickText += `│ Reason: 3 Toxic Warnings\n`
      kickText += `╰⊷ *Powered by Bunny Tech*`

      await sock.sendMessage(from, {
        text: kickText,
        mentions: [sender]
      })
    }

  } catch (err) {
    console.log('[ANTITOXIC ERROR]', err.message)
  }
}