// commands/settings/setgoodbye.js
import { supabase } from '../../lib/supabase.js'

export const name = 'setgoodbye'
export const alias = ['goodbye', 'setbye']
export const category = 'Settings' // ✅ FIXED: Settings sio Owner
export const desc = 'Update goodbye message for this group in real-time without restart'

export default async function setgoodbye(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    // 1. GROUP ONLY CHECK
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command works in groups only.'
      }, { quoted: msg })
    }

    // 2. Get new goodbye message from args
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const newGoodbye = args.join(' ').trim()

    // 3. Get current goodbye - FIXED: maybeSingle() instead of single()
    const { data: currentSettings, error: fetchError } = await supabase
.from('group_settings')
.select('goodbye_msg')
.eq('group_jid', from)
.maybeSingle() // ✅ FIXED: Haitaleta error kama row haipo

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError.message)
      return await sock.sendMessage(from, {
        text: '> Failed to fetch current settings. Database error.'
      }, { quoted: msg })
    }

    const currentGoodbye = currentSettings?.goodbye_msg || 'Goodbye @user'

    if (!newGoodbye) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}setgoodbye <message>\n> Example: ${botSettings.prefix}setgoodbye Bye @user\n> Current: ${currentGoodbye}`
      }, { quoted: msg })
    }

    // 4. Block message too long - SCHEMA: TEXT type, limit 500 for safety
    if (newGoodbye.length > 500) {
      return await sock.sendMessage(from, {
        text: '> Goodbye message too long. Use 500 characters max.'
      }, { quoted: msg })
    }

    // 5. Prevent same goodbye
    if (newGoodbye === currentGoodbye) {
      return await sock.sendMessage(from, {
        text: `> Goodbye message is already set to: ${newGoodbye}`
      }, { quoted: msg })
    }

    // 6. Update Supabase - SCHEMA COLUMNS: group_jid, goodbye_msg, updated_at
    const { data, error } = await supabase
.from('group_settings')
.upsert({
       group_jid: from,
       goodbye_msg: newGoodbye,
       updated_at: new Date().toISOString()
     }, { onConflict: 'group_jid' })
.select()

    if (error) {
      console.error('Supabase update error:', error.message)
      return await sock.sendMessage(from, {
        text: '> Failed to update goodbye message. Database error.'
      }, { quoted: msg })
    }

    // 7. React + Success message
    await sock.sendMessage(from, {
      react: { text: '😢', key: msg.key }
    })

    const successPayload =
`╭─⌈ 🧵 *Settings Updated* ⌋
│ Goodbye changed to: ${newGoodbye}
│ Old Message: ${currentGoodbye}
│ Status: Applied instantly
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[SETGOODBYE ERROR]`, commandException.message)
    await sock.sendMessage(from, {
      text: '> Failed to update goodbye message. Check database connection.'
    }, { quoted: msg })
  }
}