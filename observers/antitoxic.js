// observers/antitoxic.js
import { supabase } from '../lib/supabase.js'

const AUTO_CLEAN_HOURS = 24

// Basic toxic words - weka zako hapa
const toxicWords = [
  'tombwa', 'kuma', 'mkundu', 'malaya', 'takataka',
  'fuck', 'bitch', 'nigger', 'pussy', 'dick',
  'matako', 'kinyesi', 'mjinga'
]

export default async function antitoxic(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    if (msg.key.fromMe ||!isGroup) return

    const body = msg.message?.conversation ||
                 msg.message?.extendedTextMessage?.text ||
                 msg.message?.imageMessage?.caption ||
                 msg.message?.videoMessage?.caption || ''

    if (!body) return

    // 1. CHECK TOXIC CONTENT
    const lowerBody = body.toLowerCase()
    const foundToxic = toxicWords.find(word => lowerBody.includes(word.toLowerCase()))

    if (!foundToxic) return

    // 2. CHECK SETTINGS
    const { data: settings } = await supabase
.from('group_settings')
.select('antitoxic')
.eq('group_jid', from)
.single()

    if (!settings?.antitoxic) return

    // 3. DELETE MESSAGE
    await sock.sendMessage(from, { delete: msg.key })

    const senderTag = `@${sender.split('@')[0]}`

    // 4. UPDATE WARNINGS
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
.update({ count: warningCount, last_warning: new Date().toISOString() })
.eq('user_jid', sender)
.eq('group_jid', from)
.eq('warning_type', 'toxic')
    } else {
      await supabase.from('user_warnings').insert({
        user_jid: sender,
        group_jid: from,
        warning_type: 'toxic',
        count: 1
      })
    }

    // Auto clean after 24hrs
    await supabase
.from('user_warnings')
.delete()
.lt('last_warning', new Date(Date.now() - AUTO_CLEAN_HOURS * 3600000).toISOString())
.eq('warning_type', 'toxic')

    // 5. SEND CLEAN SHORT MESSAGE
    let warningText = `╭─⌈ ☢️ *AntiToxic* ⌋\n`
    warningText += `│ User: ${senderTag}\n`
    warningText += `│ Warn: ${warningCount}/3\n`
    warningText += `╰⊷ *Powered by Bunny Tech*`

    await sock.sendMessage(from, {
      text: warningText,
      mentions: [sender]
    })

    // 6. AUTO KICK AT 3 WARNINGS
    if (warningCount >= 3) {
      await sock.groupParticipantsUpdate(from, [sender], 'remove')

      let kickText = `╭─⌈ ⚠️ *Kicked* ⌋\n`
      kickText += `│ User: ${senderTag}\n`
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