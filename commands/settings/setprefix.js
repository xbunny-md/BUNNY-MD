// commands/settings/setprefix.js
import { supabase } from '../../../lib/supabase.js'

export const name = 'setprefix'
export const alias = ['prefix', 'setp']
export const category = 'Settings'
export const desc = 'Update the bot command prefix in real-time without restart'

export default async function setprefix(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React processing 🌀
    await sock.sendMessage(from, {
      react: { text: '🌀', key: msg.key }
    })

    // 2. Get new prefix from args
    const newPrefix = args.join(' ').trim()

    if (!newPrefix) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}setprefix <new_prefix>\n> Example: ${botSettings.prefix}setprefix !\n> Current: ${botSettings.prefix}`
      }, { quoted: msg })
    }

    if (newPrefix.length > 3) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: '> Prefix too long. Use 1-3 characters max.'
      }, { quoted: msg })
    }

    // 3. Block dangerous prefixes
    const blockedPrefixes = ['/', '@', '#', ' ']
    if (blockedPrefixes.includes(newPrefix)) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Prefix "${newPrefix}" is blocked. Use symbols like . ! $ % &`
      }, { quoted: msg })
    }

    // 4. Prevent same prefix
    if (newPrefix === botSettings.prefix) {
      await sock.sendMessage(from, {
        react: { text: '⚠️', key: msg.key }
      })
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
      .maybeSingle()

    if (error) {
      console.error('Supabase update error:', error.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: '> Failed to update prefix. Database error.'
      }, { quoted: msg })
    }

    if (!data) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: '> Failed to update prefix. Settings row not found in database.'
      }, { quoted: msg })
    }

    // 6. ✅ UPDATE LOCAL botSettings - HII NDIO INAFANYA IFANYE KAZI BILA RESTART
    botSettings.prefix = newPrefix

    // 7. React done ✅
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

    const successPayload =
`╭─⌈ 🧵 *Settings Updated* ⌋
│ Prefix changed to: ${newPrefix}
│ Old Prefix: ${args.length > 1 ? args[1] : botSettings.prefix}
│ Status: Applied instantly
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[SETPREFIX ERROR]`, commandException.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, {
      text: '> Failed to update prefix. Check database connection.'
    }, { quoted: msg })
  }
}