// commands/settings/antitoxic.js
import { supabase } from '../../lib/supabase.js'

export const name = 'antitoxic'
export const alias = ['antit', 'notoxic', 'badword']
export const category = 'Settings' // ✅ FIXED: Settings sio Owner
export const desc = 'Update badword filter status for this group in real-time without restart'

export default async function antitoxic(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    // 1. GROUP ONLY CHECK
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command works in groups only.'
      }, { quoted: msg })
    }

    // 2. Get new status from args
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const newStatus = args[0]?.toLowerCase()

    // 3. Get current status - ✅ FIXED: Tumia badword_filter kama schema
    const { data: currentSettings, error: fetchError } = await supabase
.from('group_settings')
.select('badword_filter') // ✅ SCHEMA COLUMN: badword_filter
.eq('group_jid', from)
.maybeSingle() // ✅ FIXED: Haitaleta error kama row haipo

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError.message)
      return await sock.sendMessage(from, {
        text: '> Failed to fetch current settings. Database error.'
      }, { quoted: msg })
    }

    const currentValue = currentSettings?.badword_filter || false

    if (!newStatus) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}antitoxic <on/off>\n> Example: ${botSettings.prefix}antitoxic on\n> Current: ${currentValue? 'on' : 'off'}`
      }, { quoted: msg })
    }

    // 4. Block invalid options
    const validOptions = ['on', 'off']
    if (!validOptions.includes(newStatus)) {
      return await sock.sendMessage(from, {
        text: `> Status "${newStatus}" is invalid. Use: on or off`
      }, { quoted: msg })
    }

    // 5. Prevent same status
    const newValue = newStatus === 'on'? true : false
    if (newValue === currentValue) {
      return await sock.sendMessage(from, {
        text: `> Antitoxic is already set to: ${newStatus}`
      }, { quoted: msg })
    }

    // 6. Update Supabase - ✅ FIXED: Tumia badword_filter column
    const { data, error } = await supabase
.from('group_settings')
.upsert({
       group_jid: from,
       badword_filter: newValue, // ✅ SCHEMA COLUMN: badword_filter
       updated_at: new Date().toISOString()
     }, { onConflict: 'group_jid' })
.select()

    if (error) {
      console.error('Supabase update error:', error.message)
      return await sock.sendMessage(from, {
        text: '> Failed to update antitoxic. Database error.'
      }, { quoted: msg })
    }

    // 7. React + Success message
    await sock.sendMessage(from, {
      react: { text: '🐲', key: msg.key }
    })

    const successPayload =
`╭─⌈ 🧵 *Settings Updated* ⌋
│ Antitoxic changed to: ${newStatus}
│ Old Status: ${currentValue? 'on' : 'off'}
│ Status: Applied instantly
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[ANTITOXIC ERROR]`, commandException.message)
    await sock.sendMessage(from, {
      text: '> Failed to update antitoxic. Check database connection.'
    }, { quoted: msg })
  }
}