// commands/settings/setbotname.js
import { supabase } from '../../../lib/supabase.js'

export const name = 'setbotname'
export const alias = ['setname', 'botname']
export const category = 'Settings'
export const desc = 'Update the bot name in real-time without restart'

export default async function setbotname(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React processing 🐉
    await sock.sendMessage(from, {
      react: { text: '🐉', key: msg.key }
    })

    // 2. Get new name
    const newName = args.join(' ').trim()
    if (!newName) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, { 
        text: `> Usage: ${botSettings.prefix}setbotname <new_name>\n> Example: ${botSettings.prefix}setbotname BUNNY PRO\n> Current: ${botSettings.botname}` 
      }, { quoted: msg })
    }

    if (newName.length > 30) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, { 
        text: '> Bot name too long. Max 30 characters.' 
      }, { quoted: msg })
    }

    // 3. Prevent same name
    if (newName === botSettings.botname) {
      await sock.sendMessage(from, {
        react: { text: '⚠️', key: msg.key }
      })
      return await sock.sendMessage(from, { 
        text: `> Bot name is already set to: ${newName}` 
      }, { quoted: msg })
    }

    // 4. Update Supabase b_settings table
    const { data, error } = await supabase
      .from('b_settings')
      .update({ botname: newName })
      .eq('id', 'BUNNY_DEFAULT')
      .select()
      .maybeSingle()

    if (error) {
      console.error('Supabase update error:', error.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, { 
        text: '> Failed to update bot name. Database error.' 
      }, { quoted: msg })
    }

    if (!data) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, { 
        text: '> Failed to update bot name. Settings row not found in database.' 
      }, { quoted: msg })
    }

    // 5. ✅ UPDATE LOCAL botSettings - HII NDIO INAFANYA IFANYE KAZI BILA RESTART
    const oldName = botSettings.botname
    botSettings.botname = newName

    // 6. React done ✅
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

    const successPayload = 
`╭─⌈ ⚙️ *Settings Updated* ⌋
│ Bot name changed to: ${newName}
│ Old Name: ${oldName}
│ Status: Applied instantly
╰⊷ *${newName}*`

    await sock.sendMessage(from, { 
      text: successPayload 
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[SETBOTNAME ERROR]`, commandException.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, { 
      text: '> Failed to update bot name. Check database connection.' 
    }, { quoted: msg })
  }
}