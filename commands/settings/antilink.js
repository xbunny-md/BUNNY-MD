// commands/settings/antilink.js
import { supabase } from '../../lib/supabase.js'

export const name = 'antilink'
export const alias = ['antil', 'nolink']
export const category = 'Settings' // ✅ FIXED: Settings sio Owner
export const desc = 'Update antilink status for this group in real-time without restart'

export default async function antilink(sock, { msg, from, sender, isGroup }, botSettings) {
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

    // 3. Get current status - FIXED: maybeSingle() instead of single()
    const { data: currentSettings, error: fetchError } = await supabase
.from('group_settings')
.select('antilink')
.eq('group_jid', from)
.maybeSingle() // ✅ FIXED: Haitaleta error kama row haipo

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError.message)
      return await sock.sendMessage(from, {
        text: '> Failed to fetch current settings. Database error.'
      }, { quoted: msg })
    }

    const currentValue = currentSettings?.antilink || false

    if (!newStatus) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}antilink <on/off>\n> Example: ${botSettings.prefix}antilink on\n> Current: ${currentValue? 'on' : 'off'}`
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
        text: `> Antilink is already set to: ${newStatus}`
      }, { quoted: msg })
    }

    // 6. Update Supabase - SCHEMA COLUMNS: group_jid, antilink, updated_at
    const { data, error } = await supabase
.from('group_settings')
.upsert({
       group_jid: from,
       antilink: newValue,
       updated_at: new Date().toISOString()
     }, { onConflict: 'group_jid' })
.select()

    if (error) {
      console.error('Supabase update error:', error.message)
      return await sock.sendMessage(from, {
        text: '> Failed to update antilink. Database error.'
      }, { quoted: msg })
    }

    // 7. React + Success message
    await sock.sendMessage(from, {
      react: { text: '🦉', key: msg.key }
    })

    const successPayload =
`╭─⌈ 🧵 *Settings Updated* ⌋
│ Antilink changed to: ${newStatus}
│ Old Status: ${currentValue? 'on' : 'off'}
│ Status: Applied instantly
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[ANTILINK ERROR]`, commandException.message)
    await sock.sendMessage(from, {
      text: '> Failed to update antilink. Check database connection.'
    }, { quoted: msg })
  }
}