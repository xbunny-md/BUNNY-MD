// commands/settings/antitoxic.js
import { supabase } from '../../lib/supabase.js'

export const name = 'antitoxic'
export const alias = ['antit', 'notoxic', 'badword', 'settoxic']
export const category = 'Settings'
export const desc = 'Full antitoxic control: on/off, max warnings, add/remove words - realtime'

export default async function antitoxic(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
  try {
    // 1. GROUP ONLY + ADMIN ONLY
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command works in groups only.'
      }, { quoted: msg })
    }

    if (!isAdmin) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: '> Admin only command.'
      }, { quoted: msg })
    }

    // 2. Parse args
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    // 3. Get current settings
    const { data: currentSettings, error: fetchError } = await supabase
    .from('group_settings')
    .select('antitoxic, badword_filter, max_warnings')
    .eq('group_jid', from)
    .maybeSingle()

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError.message)
      return await sock.sendMessage(from, {
        text: '> Failed to fetch current settings. Database error.'
      }, { quoted: msg })
    }

    const currentStatus = currentSettings?.antitoxic || currentSettings?.badword_filter || false
    const currentMaxWarn = currentSettings?.max_warnings || 3

    // 4. SHOW HELP IF NO ARGS
    if (!action) {
      const { data: wordCount } = await supabase
      .from('bad_words')
      .select('id', { count: 'exact' })
      .eq('group_jid', from)

      const { data: globalCount } = await supabase
      .from('bad_words')
      .select('id', { count: 'exact' })
      .eq('group_jid', 'global')

      await sock.sendMessage(from, {
        react: { text: '⚙️', key: msg.key }
      })

      return await sock.sendMessage(from, {
        text: `╭─⌈ ☢️ *AntiToxic Control* ⌋
│ Status: ${currentStatus? 'ON ✅' : 'OFF ❌'}
│ Max Warnings: ${currentMaxWarn}
│ Group Words: ${wordCount?.length || 0}
│ Global Words: ${globalCount?.length || 0}
│
│ *Commands:*
│ ${botSettings.prefix}antitoxic on/off
│ ${botSettings.prefix}antitoxic max <1-10>
│ ${botSettings.prefix}antitoxic add <word>
│ ${botSettings.prefix}antitoxic remove <word>
│ ${botSettings.prefix}antitoxic list
│
│ *Examples:*
│ ${botSettings.prefix}antitoxic on
│ ${botSettings.prefix}antitoxic add msemo
│ ${botSettings.prefix}antitoxic max 5
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // 5. HANDLE LIST WORDS
    if (action === 'list' || action === 'words') {
      const { data: groupWords } = await supabase
      .from('bad_words')
      .select('word, severity')
      .eq('group_jid', from)
      .order('severity', { ascending: false })

      const { data: globalWords } = await supabase
      .from('bad_words')
      .select('word')
      .eq('group_jid', 'global')
      .limit(20)

      let listText = `╭─⌈ 📝 *Bad Words List* ⌋\n`

      if (groupWords && groupWords.length > 0) {
        listText += `│\n│ *Group Words (${groupWords.length}):*\n`
        groupWords.slice(0, 15).forEach(w => {
          listText += `│ • ${w.word} [${w.severity}]\n`
        })
        if (groupWords.length > 15) listText += `│... +${groupWords.length - 15} more\n`
      } else {
        listText += `│\n│ *Group Words:* None\n`
      }

      listText += `│\n│ *Global Words:* ${globalWords?.length || 0}\n`
      listText += `╰⊷ *Use.antitoxic add <word>*`

      await sock.sendMessage(from, {
        react: { text: '📋', key: msg.key }
      })
      return await sock.sendMessage(from, { text: listText }, { quoted: msg })
    }

    // 6. HANDLE ADD WORD
    if (action === 'add') {
      const word = args.slice(1).join(' ').toLowerCase().trim()

      if (!word) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}antitoxic add <word>\n> Example: ${botSettings.prefix}antitoxic add msemo`
        }, { quoted: msg })
      }

      if (word.length < 2 || word.length > 30) {
        return await sock.sendMessage(from, {
          text: '> Word must be 2-30 characters long.'
        }, { quoted: msg })
      }

      const { error } = await supabase
      .from('bad_words')
      .upsert({
          group_jid: from,
          word: word,
          severity: 2,
          added_by: sender
        }, { onConflict: 'group_jid,word' })

      if (error) {
        console.error('Supabase add word error:', error.message)
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: '> Failed to add word. Database error or already exists.'
        }, { quoted: msg })
      }

      await sock.sendMessage(from, {
        react: { text: '✅', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Word Added* ⌋
│ Word: ${word}
│ Group: This group only
│ Status: Active instantly
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // 7. HANDLE REMOVE WORD
    if (action === 'remove' || action === 'del') {
      const word = args.slice(1).join(' ').toLowerCase().trim()

      if (!word) {
        return await sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}antitoxic remove <word>\n> Example: ${botSettings.prefix}antitoxic remove msemo`
        }, { quoted: msg })
      }

      const { data, error } = await supabase
      .from('bad_words')
      .delete()
      .eq('group_jid', from)
      .eq('word', word)
      .select()

      if (error ||!data || data.length === 0) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `> Word "${word}" not found in this group's list.`
        }, { quoted: msg })
      }

      await sock.sendMessage(from, {
        react: { text: '✅', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🗑️ *Word Removed* ⌋
│ Word: ${word}
│ Status: Removed instantly
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // 8. HANDLE MAX WARNINGS
    if (action === 'max' || action === 'warnings' || action === 'limit') {
      const newMax = parseInt(args[1])

      if (!newMax || newMax < 1 || newMax > 10) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `> Invalid max warnings. Use 1-10\n> Example: ${botSettings.prefix}antitoxic max 5\n> Current: ${currentMaxWarn}`
        }, { quoted: msg })
      }

      if (newMax === currentMaxWarn) {
        await sock.sendMessage(from, {
          react: { text: '⚠️', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `> Max warnings is already set to: ${newMax}`
        }, { quoted: msg })
      }

      const { error } = await supabase
      .from('group_settings')
      .upsert({
          group_jid: from,
          max_warnings: newMax,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_jid' })

      if (error) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: '> Failed to update max warnings. Database error.'
        }, { quoted: msg })
      }

      await sock.sendMessage(from, {
        react: { text: '✅', key: msg.key }
      })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 🧵 *Settings Updated* ⌋
│ Max Warnings: ${newMax}
│ Old Value: ${currentMaxWarn}
│ Kick on: ${newMax} warnings
│ Status: Applied instantly
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // 9. HANDLE ON/OFF
    const validOptions = ['on', 'off', 'enable', 'disable', '1', '0']
    if (!validOptions.includes(action)) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Invalid option "${action}".\n> Use: on/off, max, add, remove, list\n> Example: ${botSettings.prefix}antitoxic on`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)? true : false

    if (newValue === currentStatus) {
      await sock.sendMessage(from, {
        react: { text: '⚠️', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Antitoxic is already ${newValue? 'ON' : 'OFF'}`
      }, { quoted: msg })
    }

    // 10. UPDATE BOTH COLUMNS - REALTIME NO RESTART
    const { error } = await supabase
    .from('group_settings')
    .upsert({
        group_jid: from,
        antitoxic: newValue,
        badword_filter: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'group_jid' })

    if (error) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: '> Failed to update antitoxic. Database error.'
      }, { quoted: msg })
    }

    // 11. React + Success message
    await sock.sendMessage(from, {
      react: { text: newValue? '✅' : '❌', key: msg.key }
    })

    const successPayload =
`╭─⌈ 🧵 *Settings Updated* ⌋
│ Antitoxic: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Max Warnings: ${currentMaxWarn}
│ Old Status: ${currentStatus? 'ON' : 'OFF'}
│ Status: Applied instantly
╰⊷ *${botSettings.botname}*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[ANTITOXIC ERROR]`, commandException.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, {
      text: '> Failed to update antitoxic. Check database connection.'
    }, { quoted: msg })
  }
}