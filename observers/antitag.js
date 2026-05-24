// observers/antitag.js
import { supabase } from '../lib/supabase.js'

const TAG_LIMIT = 10 // Max mentions allowed
const AUTO_CLEAN_HOURS = 24

export default async function antitag(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    if (msg.key.fromMe ||!isGroup) return

    // 1. GET MENTIONS
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''

    // Check for hidetag - mentions but no @ in text
    const hasHiddenTag = mentions.length > 0 &&!body.includes('@')

    // Check mass tag
    const isMassTag = mentions.length >= TAG_LIMIT

    if (!hasHiddenTag &&!isMassTag) return

    // 2. CHECK SETTINGS
    const { data: settings } = await supabase
.from('group_settings')
.select('antitag')
.eq('group_jid', from)
.single()

    if (!settings?.antitag) return

    // 3. DELETE MESSAGE
    await sock.sendMessage(from, { delete: msg.key })

    const senderTag = `@${sender.split('@')[0]}`
    const tagType = hasHiddenTag? 'Hidetag' : 'Mass Tag'

    // 4. UPDATE WARNINGS
    const { data: existingWarning } = await supabase
.from('user_warnings')
.select('count')
.eq('user_jid', sender)
.eq('group_jid', from)
.eq('warning_type', 'tag')
.single()

    let warningCount = 1

    if (existingWarning) {
      warningCount = existingWarning.count + 1
      await supabase
.from('user_warnings')
.update({ count: warningCount, last_warning: new Date().toISOString() })
.eq('user_jid', sender)
.eq('group_jid', from)
.eq('warning_type', 'tag')
    } else {
      await supabase.from('user_warnings').insert({
        user_jid: sender,
        group_jid: from,
        warning_type: 'tag',
        count: 1
      })
    }

    // Auto clean after 24hrs
    await supabase
.from('user_warnings')
.delete()
.lt('last_warning', new Date(Date.now() - AUTO_CLEAN_HOURS * 3600000).toISOString())
.eq('warning_type', 'tag')

    // 5. SEND CLEAN SHORT MESSAGE
    let warningText = `╭─⌈ 🏷️ *AntiTag* ⌋\n`
    warningText += `│ User: ${senderTag}\n`
    warningText += `│ Type: ${tagType}\n`
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
    console.log('[ANTITAG ERROR]', err.message)
  }
}