// commands/settings/setprefix.js
import { supabase } from '../../lib/supabase.js'

export const name = 'setprefix'
export const alias = ['prefix', 'setp']
export const category = 'Settings'
export const desc = 'Update the bot command prefix in real-time without restart'

export default async function setprefix(sock, { msg, from, args, isGroup, isAdmin, sender }, botSettings) {
  try {
    // 1. ADMIN/OWNER CHECK
    const isOwner = sender === botSettings.owner_jid
    if (!isOwner && (!isGroup ||!isAdmin)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: '> Admin only command.'
      }, { quoted: msg })
    }

    // 2. React processing 🌀
    await sock.sendMessage(from, {
      react: { text: '🌀', key: msg.key }
    })

    // 3. Get new prefix from args
    const newPrefix = args[0]?.trim()
    const oldPrefix = botSettings.prefix

    if (!newPrefix) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}setprefix <new_prefix>\n> Example: ${botSettings.prefix}setprefix!\n> Current: ${botSettings.prefix}`
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

    // 4. Block dangerous prefixes
    const blockedPrefixes = ['/', '@', '#', ' ']
    if (blockedPrefixes.includes(newPrefix)) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Prefix "${newPrefix}" is blocked. Use symbols like.! $ % &`
      }, { quoted: msg })
    }

    // 5. Prevent same prefix
    if (newPrefix === oldPrefix) {
      await sock.sendMessage(from, {
        react: { text: '⚠️', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Prefix is already set to: ${newPrefix}`
      }, { quoted: msg })
    }

    // 6. Update Supabase b_settings table
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

    // 7. ✅ UPDATE LOCAL botSettings - HII NDIO INAFANYA IFANYE KAZI BILA RESTART
    botSettings.prefix = newPrefix

    // 8. React done ✅
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

    const successPayload = `╭─⌈ ⚙️ *Prefix Updated* ⌋
│ Old Prefix: ${oldPrefix}
│ New Prefix: ${newPrefix}
│ Status: Applied instantly
╰⊷ *Powered By Bunny Tech*`

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