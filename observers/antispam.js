// observers/antispam.js
import { supabase } from '../lib/supabase.js'

const spamCache = new Map()
const SPAM_LIMIT = 5 // 5 messages in 10 seconds
const SPAM_WINDOW = 10000 // 10 seconds
const AUTO_CLEAN_HOURS = 24

export default async function antispam(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    if (msg.key.fromMe ||!isGroup) return

    const body = msg.message?.conversation ||
                 msg.message?.extendedTextMessage?.text ||
                 msg.message?.imageMessage?.caption ||
                 msg.message?.videoMessage?.caption || ''

    if (!body) return

    // 1. CHECK SETTINGS
    const { data: settings } = await supabase
 .from('group_settings')
 .select('antispam')
 .eq('group_jid', from)
 .single()

    if (!settings?.antispam) return

    // 2. TRACK USER MESSAGES
    const now = Date.now()
    const userKey = `${from}:${sender}`

    if (!spamCache.has(userKey)) {
      spamCache.set(userKey, [])
    }

    const userMessages = spamCache.get(userKey)
    userMessages.push(now)

    // Remove old messages outside window
    const validMessages = userMessages.filter(time => now - time < SPAM_WINDOW)
    spamCache.set(userKey, validMessages)

    // 3. CHECK SPAM
    if (validMessages.length < SPAM_LIMIT) return

    // 4. DELETE LAST MESSAGE
    await sock.sendMessage(from, { delete: msg.key })

    const senderTag = `@${sender.split('@')[0]}`

    // 5. UPDATE WARNINGS
    const { data: existingWarning } = await supabase
 .from('user_warnings')
 .select('count')
 .eq('user_jid', sender)
 .eq('group_jid', from)
 .eq('warning_type', 'spam')
 .single()

    let warningCount = 1

    if (existingWarning) {
      warningCount = existingWarning.count + 1
      await supabase
   .from('user_warnings')
   .update({ count: warningCount, last_warning: new Date().toISOString() })
   .eq('user_jid', sender)
   .eq('group_jid', from)
   .eq('warning_type', 'spam')
    } else {
      await supabase.from('user_warnings').insert({
        user_jid: sender,
        group_jid: from,
        warning_type: 'spam',
        count: 1
      })
    }

    // Auto clean after 24hrs
    await supabase
 .from('user_warnings')
 .delete()
 .lt('last_warning', new Date(Date.now() - AUTO_CLEAN_HOURS * 3600000).toISOString())
 .eq('warning_type', 'spam')

    // Clear spam cache for user
    spamCache.delete(userKey)

    // 6. SEND CLEAN SHORT MESSAGE
    let warningText = `╭─⌈ 🚫 *AntiSpam* ⌋\n`
    warningText += `│ User: ${senderTag}\n`
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
      kickText += `╰⊷ *Powered by Bunny Tech*`

      await sock.sendMessage(from, {
        text: kickText,
        mentions: [sender]
      })
    }

  } catch (err) {
    console.log('[ANTISPAM ERROR]', err.message)
  }
}