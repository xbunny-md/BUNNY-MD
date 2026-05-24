// commands/antibot.js
import { supabase } from '../lib/supabase.js'

export const name = 'antibot'
export const alias = ['antib', 'nobots']
export const category = 'Owner'
export const desc = 'Update antibot status for this group in real-time without restart'

export default async function antibot(sock, { msg, from, sender, isGroup }, botSettings) {
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

    // 3. Get current status
    const { data: currentSettings } = await supabase
.from('group_settings')
.select('antibot')
.eq('group_jid', from)
.single()

    const currentValue = currentSettings?.antibot || false

    if (!newStatus) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}antibot <on/off>\n> Example: ${botSettings.prefix}antibot on\n> Current: ${currentValue? 'on' : 'off'}`
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
        text: `> Antibot is already set to: ${newStatus}`
      }, { quoted: msg })
    }

    // 6. Update Supabase group_settings table
    const { data, error } = await supabase
.from('group_settings')
.upsert({
       group_jid: from,
       antibot: newValue,
       updated_at: new Date().toISOString()
     }, { onConflict: 'group_jid' })
.select()

    if (error) {
      console.error('Supabase update error:', error.message)
      return await sock.sendMessage(from, {
        text: '> Failed to update antibot. Database error.'
      }, { quoted: msg })
    }

    // 7. React + Success message
    await sock.sendMessage(from, {
      react: { text: '🤖', key: msg.key }
    })

    const successPayload =
`╭─⌈ 🧵 *Settings Updated* ⌋
│ Antibot changed to: ${newStatus}
│ Old Status: ${currentValue? 'on' : 'off'}
│ Status: Applied instantly
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[ANTIBOT ERROR]`, commandException.message)
    await sock.sendMessage(from, {
      text: '> Failed to update antibot. Check database connection.'
    }, { quoted: msg })
  }
}