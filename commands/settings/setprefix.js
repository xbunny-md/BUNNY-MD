// commands/settings/setprefix.js
import { supabase } from '../../lib/supabase.js'

export const name = 'setprefix'
export const alias = ['prefix', 'setp']
export const category = 'Owner'
export const desc = 'Update the bot command prefix in real-time without restart'

export default async function setprefix(sock, { msg, from, sender }, botSettings) {
  try {
    // 1. Owner check
    const ownerJid = `${botSettings.owner_number}@s.whatsapp.net`
    if (sender !== ownerJid) {
      return await sock.sendMessage(from, { 
        text: '> Access Denied. Only the owner can change settings.' 
      }, { quoted: msg })
    }

    // 2. Get new prefix from args
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const newPrefix = args.join(' ').trim()

    if (!newPrefix) {
      return await sock.sendMessage(from, { 
        text: `> Usage: ${botSettings.prefix}setprefix <new_prefix>\n> Example: ${botSettings.prefix}setprefix !\n> Current: ${botSettings.prefix}` 
      }, { quoted: msg })
    }

    if (newPrefix.length > 3) {
      return await sock.sendMessage(from, { 
        text: '> Prefix too long. Use 1-3 characters max.' 
      }, { quoted: msg })
    }

    // 3. Block dangerous prefixes
    const blockedPrefixes = ['/', '@', '#']
    if (blockedPrefixes.includes(newPrefix)) {
      return await sock.sendMessage(from, { 
        text: `> Prefix "${newPrefix}" is blocked. Use symbols like . ! $ % &` 
      }, { quoted: msg })
    }

    // 4. Prevent same prefix
    if (newPrefix === botSettings.prefix) {
      return await sock.sendMessage(from, { 
        text: `> Prefix is already set to: ${newPrefix}` 
      }, { quoted: msg })
    }

    // 5. Update Supabase b_settings table
    const { data, error } = await supabase
      .from('b_settings')
      .update({ prefix: newPrefix })
      .eq('id', 'BUNNY_DEFAULT')
      .select()

    if (error) {
      console.error('Supabase update error:', error.message)
      return await sock.sendMessage(from, { 
        text: '> Failed to update prefix. Database error.' 
      }, { quoted: msg })
    }

    // 6. React + Success message na 🧵 thread emoji
    await sock.sendMessage(from, {
      react: { text: '🌀', key: msg.key }
    })

    const successPayload = 
`╭─⌈ 🧵 *Settings Updated* ⌋
│ Prefix changed to: ${newPrefix}
│ Old Prefix: ${botSettings.prefix}
│ Status: Applied instantly
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      text: successPayload 
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[SETPREFIX ERROR]`, commandException.message)
    await sock.sendMessage(from, { 
      text: '> Failed to update prefix. Check database connection.' 
    }, { quoted: msg })
  }
}