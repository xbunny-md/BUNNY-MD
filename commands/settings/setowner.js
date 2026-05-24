// commands/settings/setowner.js
import { supabase } from '../../../lib/supabase.js'

export const name = 'setowner'
export const alias = ['sowner', 'newowner']
export const category = 'Settings'
export const desc = 'Update the bot owner number in real-time without restart'

export default async function setowner(sock, { msg, from, args, sender }, botSettings) {
  try {
    // 1. React processing 🏵️
    await sock.sendMessage(from, {
      react: { text: '🏵️', key: msg.key }
    })

    // 2. Get new owner - 4 ways: args, mention, reply, sender
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    const mentioned = quoted?.mentionedJid?.[0] // Router tayari imeresolve LID
    const replied = quoted?.participant // Router tayari imeresolve LID
    const textAfterCmd = args.join(' ').trim()

    let newOwner = null

    // Way 1: Args - number direct
    if (textAfterCmd) {
      newOwner = textAfterCmd.replace(/[^0-9]/g, '')
    }
    // Way 2: Mentioned user
    else if (mentioned) {
      newOwner = mentioned.split('@')[0]
    }
    // Way 3: Replied user
    else if (replied) {
      newOwner = replied.split('@')[0]
    }
    // Way 4: Sender default
    else {
      newOwner = sender.split('@')[0]
    }

    if (!newOwner) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}setowner <number>\n> Example: ${botSettings.prefix}setowner 255780470905\n> Or reply/mention a user\n> Note: Enter number without + or spaces`
      }, { quoted: msg })
    }

    if (newOwner.length < 10 || newOwner.length > 15) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Invalid number format. Use international format without +\n> Example: 255780470905`
      }, { quoted: msg })
    }

    // 3. Get current bot number for comparison
    const currentBotNumber = sock.user.id.split(':')[0]
    const currentOwner = botSettings.owner_number

    // 4. Prevent setting same owner as bot
    if (newOwner === currentBotNumber) {
      await sock.sendMessage(from, {
        react: { text: '⚠️', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Cannot set bot number as owner: ${newOwner}`
      }, { quoted: msg })
    }

    // 5. Prevent same owner
    if (newOwner === currentOwner) {
      await sock.sendMessage(from, {
        react: { text: '⚠️', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> ${newOwner} is already the owner`
      }, { quoted: msg })
    }

    // 6. Update Supabase b_settings table
    const { data, error } = await supabase
     .from('b_settings')
     .update({ owner_number: newOwner })
     .eq('id', 'BUNNY_DEFAULT')
     .select()
     .maybeSingle()

    if (error) {
      console.error('Supabase update error:', error.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: '> Failed to update owner number. Database error.'
      }, { quoted: msg })
    }

    if (!data) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: '> Failed to update owner. Settings row not found in database.'
      }, { quoted: msg })
    }

    // 7. ✅ UPDATE LOCAL botSettings - HII NDIO INAFANYA IFANYE KAZI BILA RESTART
    botSettings.owner_number = newOwner

    // 8. React done ✅
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

    const successPayload =
`╭─⌈ ⚙️ *Settings Updated* ⌋
│ Old Owner: ${currentOwner}
│ New Owner: ${newOwner}
│ Status: Applied instantly
│ Bot Number: ${currentBotNumber}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

    // 9. Notify new owner
    try {
      await sock.sendMessage(`${newOwner}@s.whatsapp.net`, {
        text: `> You are now set as the owner of *${botSettings.botname}*.\n> Use ${botSettings.prefix}menu to see owner commands.`
      })
    } catch (e) {
      console.log('Failed to notify new owner:', e.message)
    }

  } catch (commandException) {
    console.error(`[SETOWNER ERROR]`, commandException.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, {
      text: '> Failed to update owner number. Check database connection.'
    }, { quoted: msg })
  }
}