// commands/settings/setbotname.js
import { supabase } from '../../../lib/supabase.js' // ✅ Path sahihi kama iko settings/

export const name = 'setbotname'
export const alias = ['setname', 'botname']
export const category = 'Settings' // ✅ FIXED: Settings sio Owner
export const desc = 'Update the bot name in real-time without restart'

export default async function setbotname(sock, { msg, from, args }, botSettings) {
  try {
    // 1. SHERIA IMEONDOKA ✅ - Hakuna owner check tena

    // 2. Get new name
    const newName = args.join(' ').trim()
    if (!newName) {
      return await sock.sendMessage(from, { 
        text: `> Usage: ${botSettings.prefix}setbotname <new_name>\n> Example: ${botSettings.prefix}setbotname BUNNY PRO\n> Current: ${botSettings.botname}` 
      }, { quoted: msg })
    }

    if (newName.length > 30) {
      return await sock.sendMessage(from, { 
        text: '> Bot name too long. Max 30 characters.' 
      }, { quoted: msg })
    }

    // 3. Prevent same name
    if (newName === botSettings.botname) {
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
.maybeSingle() // ✅ Safi hata kama haipo

    if (error) {
      console.error('Supabase update error:', error.message)
      return await sock.sendMessage(from, { 
        text: '> Failed to update bot name. Database error.' 
      }, { quoted: msg })
    }

    // 5. React + Success message
    await sock.sendMessage(from, {
      react: { text: '🐉', key: msg.key }
    })

    const successPayload = 
`╭─⌈ ⚙️ *Settings Updated* ⌋
│ Bot name changed to: ${newName}
│ Old Name: ${botSettings.botname}
│ Status: Applied instantly
╰⊷ *${newName}*`

    await sock.sendMessage(from, { 
      text: successPayload 
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[SETBOTNAME ERROR]`, commandException.message)
    await sock.sendMessage(from, { 
      text: '> Failed to update bot name. Check database connection.' 
    }, { quoted: msg })
  }
}