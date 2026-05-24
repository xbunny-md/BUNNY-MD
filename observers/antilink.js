// observers/antilink.js
import { supabase } from '../lib/supabase.js'

const linkRegex = /https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|chat\.whatsapp\.com\/[^\s]+/gi
const AUTO_CLEAN_HOURS = 24

export default async function antilink(sock, { msg, from, sender, isGroup, isAdmin, isBotAdmin }, botSettings) {
  try {
    // 1. IGNORE: bot messages, private chat, admin, au kama bot sio admin
    if (msg.key.fromMe ||!isGroup || isAdmin ||!isBotAdmin) return

    const body = msg.message?.conversation ||
                 msg.message?.extendedTextMessage?.text ||
                 msg.message?.imageMessage?.caption ||
                 msg.message?.videoMessage?.caption || ''

    if (!body) return

    // 2. CHECK LINK
    const links = body.match(linkRegex)
    if (!links) return

    // 3. CHECK SETTINGS
    const { data: settings } = await supabase
    .from('group_settings')
    .select('antilink')
    .eq('group_jid', from)
    .single()

    if (!settings?.antilink) return

    // 4. CHECK WHITELIST
    const { data: whitelist } = await supabase
    .from('whitelist_links')
    .select('domain')
    .eq('group_jid', from)

    const whitelistedDomains = whitelist? whitelist.map(w => w.domain.toLowerCase()) : []

    const isAllowed = links.every(link => {
      const domain = link.toLowerCase().replace(/https?:\/\//, '').replace(/www\./, '').split('/')[0]
      return whitelistedDomains.some(allowed => domain.includes(allowed))
    })

    if (isAllowed) return

    // 5. DELETE MESSAGE
    await sock.sendMessage(from, { delete: msg.key })

    const senderTag = `@${sender.split('@')[0]}`

    // 6. UPDATE WARNINGS
    const { data: existingWarning } = await supabase
    .from('user_warnings')
    .select('count')
    .eq('user_jid', sender)
    .eq('group_jid', from)
    .eq('warning_type', 'link')
    .single()

    let warningCount = 1

    if (existingWarning) {
      warningCount = existingWarning.count + 1
      await supabase
      .from('user_warnings')
      .update({ count: warningCount, last_warning: new Date().toISOString() })
      .eq('user_jid', sender)
      .eq('group_jid', from)
      .eq('warning_type', 'link')
    } else {
      await supabase.from('user_warnings').insert({
        user_jid: sender,
        group_jid: from,
        warning_type: 'link',
        count: 1
      })
    }

    // Auto clean after 24hrs
    await supabase
    .from('user_warnings')
    .delete()
    .lt('last_warning', new Date(Date.now() - AUTO_CLEAN_HOURS * 3600000).toISOString())
    .eq('warning_type', 'link')

    // 7. SEND CLEAN SHORT MESSAGE
    let warningText = `╭─⌈ 🔗 *AntiLink* ⌋\n`
    warningText += `│ User: ${senderTag}\n`
    warningText += `│ Warn: ${warningCount}/3\n`
    warningText += `╰⊷ *Powered by Bunny Tech*`

    await sock.sendMessage(from, {
      text: warningText,
      mentions: [sender]
    })

    // 8. AUTO KICK AT 3 WARNINGS - BOT LAZIMA AWE ADMIN
    if (warningCount >= 3) {
      await sock.groupParticipantsUpdate(from, [sender], 'remove')

      let kickText = `╭─⌈ ⚠️ *Kicked* ⌋\n`
      kickText += `│ User: ${senderTag}\n`
      kickText += `│ Reason: 3 Link Warnings\n`
      kickText += `╰⊷ *Powered by Bunny Tech*`

      await sock.sendMessage(from, {
        text: kickText,
        mentions: [sender]
      })
    }

  } catch (err) {
    console.log('[ANTILINK ERROR]', err.message)
  }
}