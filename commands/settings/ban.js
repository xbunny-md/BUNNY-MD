// commands/settings/shut.js
import { supabase } from '../../lib/supabase.js'

export const name = 'shut'
export const alias = ['ban', 'mute', 'setshut', 'block']
export const category = 'Settings'
export const desc = 'Full shut control: on/off, max duration, strikes, whitelist - realtime'

export default async function shutSettings(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
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
   .select('shut_enabled, shut_max_duration, shut_strikes_limit, shut_mode')
   .eq('group_jid', from)
   .maybeSingle()

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError.message)
      return await sock.sendMessage(from, {
        text: '> Failed to fetch current settings. Database error.'
      }, { quoted: msg })
    }

    const currentStatus = currentSettings?.shut_enabled || false
    const currentMaxDuration = currentSettings?.shut_max_duration || 1440 // 24 hours
    const currentStrikes = currentSettings?.shut_strikes_limit || 3
    const currentMode = currentSettings?.shut_mode || 'delete' // delete, warn, kick

    // 4. SHOW HELP IF NO ARGS
    if (!action) {
      const { data: activeBans } = await supabase
     .from('shut_list')
     .select('id', { count: 'exact' })
     .eq('group_jid', from)
     .eq('is_active', true)

      const { data: totalBans } = await supabase
     .from('shut_logs')
     .select('id', { count: 'exact' })
     .eq('group_jid', from)
     .eq('action', 'banned')

      await sock.sendMessage(from, {
        react: { text: '⛑️', key: msg.key }
      })

      return await sock.sendMessage(from, {
        text: `╭─⌈ ⛑️ *Shut Control* ⌋
│ Status: ${currentStatus? 'ON ✅' : 'OFF ❌'}
│ Mode: ${currentMode.toUpperCase()}
│ Max Duration: ${currentMaxDuration} min
│ Strike Limit: ${currentStrikes}
│ Active Bans: ${activeBans?.length || 0}
│ Total Bans: ${totalBans?.length || 0}
│
│ *Commands:*
│ ${botSettings.prefix}shut on/off
│ ${botSettings.prefix}shut max <minutes>
│ ${botSettings.prefix}shut strikes <1-5>
│ ${botSettings.prefix}shut mode <delete/warn/kick>
│ ${botSettings.prefix}shut list
│ ${botSettings.prefix}shut whitelist @user
│ ${botSettings.prefix}shut unwhitelist @user
│
│ *Examples:*
│ ${botSettings.prefix}shut on
│ ${botSettings.prefix}shut max 60
│ ${botSettings.prefix}shut mode kick
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // 5. HANDLE LIST ACTIVE BANS
    if (action === 'list' || action === 'banned') {
      const { data: bans } = await supabase
     .from('active_shut_bans')
     .select('*')
     .eq('group_jid', from)
     .limit(20)

      if (!bans || bans.length === 0) {
        await sock.sendMessage(from, {
          react: { text: '📋', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `╭─⌈ 📋 *Shut List* ⌋
│ No active bans in this group
╰⊷ *${botSettings.botname}*`
        }, { quoted: msg })
      }

      let listText = `╭─⌈ 📋 *Active Bans (${bans.length})* ⌋\n│\n`
      bans.slice(0, 10).forEach((b, i) => {
        const icon = b.type === 'perm'? '🔴' : b.type === 'kick_temp'? '👢' : '🟡'
        listText += `│ ${i + 1}. ${icon} @${b.user_jid.split('@')[0]}\n`
        listText += `│ Type: ${b.type} | Left: ${b.time_remaining}\n`
        listText += `│ Reason: ${b.reason}\n│\n`
      })
      if (bans.length > 10) listText += `│... +${bans.length - 10} more\n`
      listText += `╰⊷ *Use.shut off @user*`

      await sock.sendMessage(from, {
        react: { text: '📋', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: listText,
        mentions: bans.map(b => b.user_jid)
      }, { quoted: msg })
    }

    // 6. HANDLE MAX DURATION
    if (action === 'max' || action === 'duration' || action === 'time') {
      const newMax = parseInt(args[1])

      if (!newMax || newMax < 1 || newMax > 10080) { // Max 7 days
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `> Invalid max duration. Use 1-10080 minutes (7 days)\n> Example: ${botSettings.prefix}shut max 60\n> Current: ${currentMaxDuration} min`
        }, { quoted: msg })
      }

      if (newMax === currentMaxDuration) {
        await sock.sendMessage(from, {
          react: { text: '⚠️', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `> Max duration is already set to: ${newMax} minutes`
        }, { quoted: msg })
      }

      const { error } = await supabase
     .from('group_settings')
     .upsert({
          group_jid: from,
          shut_max_duration: newMax,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_jid' })

      if (error) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: '> Failed to update max duration. Database error.'
        }, { quoted: msg })
      }

      await sock.sendMessage(from, {
        react: { text: '⛑️', key: msg.key }
      })

      return await sock.sendMessage(from, {
        text: `╭─⌈ ⛑️ *Settings Updated* ⌋
│ Max Duration: ${newMax} min
│ Old Value: ${currentMaxDuration} min
│ Status: Applied instantly
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // 7. HANDLE STRIKES LIMIT
    if (action === 'strikes' || action === 'limit') {
      const newStrikes = parseInt(args[1])

      if (!newStrikes || newStrikes < 1 || newStrikes > 5) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `> Invalid strike limit. Use 1-5\n> Example: ${botSettings.prefix}shut strikes 3\n> Current: ${currentStrikes}`
        }, { quoted: msg })
      }

      if (newStrikes === currentStrikes) {
        await sock.sendMessage(from, {
          react: { text: '⚠️', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `> Strike limit is already set to: ${newStrikes}`
        }, { quoted: msg })
      }

      const { error } = await supabase
     .from('group_settings')
     .upsert({
          group_jid: from,
          shut_strikes_limit: newStrikes,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_jid' })

      if (error) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: '> Failed to update strike limit. Database error.'
        }, { quoted: msg })
      }

      await sock.sendMessage(from, {
        react: { text: '⛑️', key: msg.key }
      })

      return await sock.sendMessage(from, {
        text: `╭─⌈ ⛑️ *Settings Updated* ⌋
│ Strike Limit: ${newStrikes}
│ Old Value: ${currentStrikes}
│ Auto Perm: ${newStrikes} strikes
│ Status: Applied instantly
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // 8. HANDLE MODE - delete, warn, kick
    if (action === 'mode') {
      const newMode = args[1]?.toLowerCase()
      const validModes = ['delete', 'warn', 'kick']

      if (!newMode ||!validModes.includes(newMode)) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `> Invalid mode. Use: delete, warn, kick\n> Example: ${botSettings.prefix}shut mode kick\n> Current: ${currentMode}`
        }, { quoted: msg })
      }

      if (newMode === currentMode) {
        await sock.sendMessage(from, {
          react: { text: '⚠️', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `> Mode is already set to: ${newMode}`
        }, { quoted: msg })
      }

      const { error } = await supabase
     .from('group_settings')
     .upsert({
          group_jid: from,
          shut_mode: newMode,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_jid' })

      if (error) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: '> Failed to update mode. Database error.'
        }, { quoted: msg })
      }

      const modeDesc = {
        delete: 'Silently delete messages',
        warn: 'Warn before deleting',
        kick: 'Kick after max strikes'
      }

      await sock.sendMessage(from, {
        react: { text: '⛑️', key: msg.key }
      })

      return await sock.sendMessage(from, {
        text: `╭─⌈ ⛑️ *Settings Updated* ⌋
│ Mode: ${newMode.toUpperCase()}
│ Old Value: ${currentMode}
│ Behavior: ${modeDesc[newMode]}
│ Status: Applied instantly
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // 9. HANDLE WHITELIST - Watu wasiofungiwa
    if (action === 'whitelist' || action === 'wl') {
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const targetUser = mentionedJid[0]

      if (!targetUser) {
        return await sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}shut whitelist @user\n> Example: ${botSettings.prefix}shut whitelist @admin`
        }, { quoted: msg })
      }

      const { error } = await supabase
     .from('shut_whitelist')
     .upsert({
          group_jid: from,
          user_jid: targetUser,
          added_by: sender
        }, { onConflict: 'group_jid,user_jid' })

      if (error) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: '> Failed to whitelist. Database error or already whitelisted.'
        }, { quoted: msg })
      }

      await sock.sendMessage(from, {
        react: { text: '⛑️', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Whitelisted* ⌋
│ User: @${targetUser.split('@')[0]}
│ Status: Immune to shut
╰⊷ *${botSettings.botname}*`,
        mentions: [targetUser]
      }, { quoted: msg })
    }

    // 10. HANDLE UNWHITELIST
    if (action === 'unwhitelist' || action === 'unwl') {
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const targetUser = mentionedJid[0]

      if (!targetUser) {
        return await sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}shut unwhitelist @user`
        }, { quoted: msg })
      }

      const { data, error } = await supabase
     .from('shut_whitelist')
     .delete()
     .eq('group_jid', from)
     .eq('user_jid', targetUser)
     .select()

      if (error ||!data || data.length === 0) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `> User not in whitelist.`
        }, { quoted: msg })
      }

      await sock.sendMessage(from, {
        react: { text: '⛑️', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🗑️ *Unwhitelisted* ⌋
│ User: @${targetUser.split('@')[0]}
│ Status: Can be shut now
╰⊷ *${botSettings.botname}*`,
        mentions: [targetUser]
      }, { quoted: msg })
    }

    // 11. HANDLE ON/OFF
    const validOptions = ['on', 'off', 'enable', 'disable', '1', '0']
    if (!validOptions.includes(action)) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Invalid option "${action}".\n> Use: on/off, max, strikes, mode, list, whitelist\n> Example: ${botSettings.prefix}shut on`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)? true : false

    if (newValue === currentStatus) {
      await sock.sendMessage(from, {
        react: { text: '⚠️', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `> Shut is already ${newValue? 'ON' : 'OFF'}`
      }, { quoted: msg })
    }

    // 12. UPDATE SETTINGS - REALTIME NO RESTART
    const { error } = await supabase
   .from('group_settings')
   .upsert({
        group_jid: from,
        shut_enabled: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'group_jid' })

    if (error) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: '> Failed to update shut. Database error.'
      }, { quoted: msg })
    }

    // 13. React + Success message
    await sock.sendMessage(from, {
      react: { text: newValue? '⛑️' : '❌', key: msg.key }
    })

    const successPayload =
`╭─⌈ ⛑️ *Settings Updated* ⌋
│ Shut: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Max Duration: ${currentMaxDuration} min
│ Strike Limit: ${currentStrikes}
│ Mode: ${currentMode.toUpperCase()}
│ Old Status: ${currentStatus? 'ON' : 'OFF'}
│ Status: Applied instantly
╰⊷ *${botSettings.botname}*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[SHUT SETTINGS ERROR]`, commandException.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
    await sock.sendMessage(from, {
      text: '> Failed to update shut. Check database connection.'
    }, { quoted: msg })
  }
}