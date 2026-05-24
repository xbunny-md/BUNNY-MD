// commands/settings/setwelcome.js
import { supabase } from '../../lib/supabase.js'

export const name = 'setwelcome'
export const alias = ['welcome', 'setwlcm']
export const category = 'Settings' // ✅ FIXED: Settings sio Owner
export const desc = 'Update welcome message for this group in real-time without restart'

export default async function setwelcome(sock, { msg, from, isGroup }, botSettings) {
  try {
    // 1. GROUP ONLY CHECK
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command works in groups only.'
      }, { quoted: msg })
    }

    // 2. Get new welcome message from args
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const newWelcome = args.join(' ').trim()

    // 3. Get current welcome - FIXED: maybeSingle() instead of single()
    const { data: currentSettings, error: fetchError } = await supabase
.from('group_settings')
.select('welcome_msg')
.eq('group_jid', from)
.maybeSingle() // ✅ FIXED: Haitaleta error kama row haipo

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError.message)
      return await sock.sendMessage(from, {
        text: '> Failed to fetch current settings. Database error.'
      }, { quoted: msg })
    }

    const currentWelcome = currentSettings?.welcome_msg || 'Welcome @user to @group!'

    if (!newWelcome) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}setwelcome <message>\n> Example: ${botSettings.prefix}setwelcome Hello @user\n> Current: ${currentWelcome}`
      }, { quoted: msg })
    }

    // 4. Block message too long - SCHEMA: TEXT type, limit 500 for safety
    if (newWelcome.length > 500) {
      return await sock.sendMessage(from, {
        text: '> Welcome message too long. Use 500 characters max.'
      }, { quoted: msg })
    }

    // 5. Prevent same welcome
    if (newWelcome === currentWelcome) {
      return await sock.sendMessage(from, {
        text: `> Welcome message is already set to: ${newWelcome}`
      }, { quoted: msg })
    }

    // 6. Update Supabase - SCHEMA COLUMNS: group_jid, welcome_msg, updated_at
    const { data, error } = await supabase
.from('group_settings')
.upsert({
       group_jid: from,
       welcome_msg: newWelcome,
       updated_at: new Date().toISOString()
     }, { onConflict: 'group_jid' })
.select()

    if (error) {
      console.error('Supabase update error:', error.message)
      return await sock.sendMessage(from, {
        text: '> Failed to update welcome message. Database error.'
      }, { quoted: msg })
    }

    // 7. React + Success message
    await sock.sendMessage(from, {
      react: { text: '👋', key: msg.key }
    })

    const successPayload =
`╭─⌈ 🧵 *Settings Updated* ⌋
│ Welcome changed to: ${newWelcome}
│ Old Message: ${currentWelcome}
│ Status: Applied instantly
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[SETWELCOME ERROR]`, commandException.message)
    await sock.sendMessage(from, {
      text: '> Failed to update welcome message. Check database connection.'
    }, { quoted: msg })
  }
}