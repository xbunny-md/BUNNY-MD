// commands/settings/shut.js
import { supabase } from '../../lib/supabase.js'

export const name = 'shut'
export const alias = ['ban', 'mute', 'setshut']
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
    const currentMode = currentSettings?.shut_mode || 'delete'

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
│ *To Ban User:*
│ ${botSettings.prefix}shut @user <minutes> <reason>
│
│ *Examples:*
│ ${botSettings.prefix}shut on
│ ${botSettings.prefix}shut max 60
│ ${botSettings.prefix}shut @user 30 spamming
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // 5. HANDLE BAN USER - MENTION/REPLY
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const repliedUser = msg.message?.extendedTextMessage?.contextInfo?.participant
    const targetUser = mentionedJid[0] || repliedUser

    if (targetUser &&!['on', 'off', 'max', 'strikes', 'mode', 'list', 'whitelist', 'unwhitelist'].includes(action)) {
      // This is ban command:.shut @user 30 spamming
      const duration = parseInt(action) || currentMaxDuration
      const reason = args.slice(1).join(' ') || 'No reason'

      // FIX LID: Get correct JID
      const [waResult] = await sock.onWhatsApp(targetUser)
      if (!waResult?.exists) {
        return await sock.sendMessage(from, {
          text: '> User not on WhatsApp'
        }, { quoted: msg })
      }
      const correctUser = waResult.jid

      // Check whitelist
      const { data: whitelisted } = await supabase
       .from('shut_whitelist')
       .select('id')
       .eq('group_jid', from)
       .eq('user_jid', correctUser)
       .maybeSingle()

      if (whitelisted) {
        return await sock.sendMessage(from, {
          text: `> @${correctUser.split('@')[0]} is whitelisted and cannot be muted.`,
          mentions: [correctUser]
        }, { quoted: msg })
      }

      const expiresAt = duration === 0? null : new Date(Date.now() + duration * 60000).toISOString()
      const type = duration === 0? 'perm' : 'temp'

      const { error } = await supabase
       .from('shut_list')
       .upsert({
          group_jid: from,
          user_jid: correctUser,
          type: type,
          reason: reason,
          expires_at: expiresAt,
          banned_by: sender,
          is_active: true,
          deleted_count: 0
        }, { onConflict: 'group_jid,user_jid' })

      if (error) {
        return await sock.sendMessage(from, {
          text: '> Failed to ban user. Database error.'
        }, { quoted: msg })
      }

      // Log
      await supabase.from('shut_logs').insert({
        group_jid: from,
        user_jid: correctUser,
        action: 'banned',
        type: type,
        reason: reason,
        banned_by: sender
      })

      await sock.sendMessage(from, {
        react: { text: '⛑️', key: msg.key }
      })

      const durationText = duration === 0? 'PERMANENT' : `${duration} minutes`
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔇 *User Muted* ⌋
│ User: @${correctUser.split('@')[0]}
│ Duration: ${durationText}
│ Reason: ${reason}
│ Type: ${type.toUpperCase()}
╰⊷ *${botSettings.botname}*`,
        mentions: [correctUser]
      }, { quoted: msg })
    }

    // 6. HANDLE LIST ACTIVE BANS
    if (action === 'list' || action === 'banned') {
      const { data: bans } = await supabase
       .from('shut_list')
       .select('*')
       .eq('group_jid', from)
       .eq('is_active', true)
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
      const mentions = []
      bans.slice(0, 10).forEach((b, i) => {
        const icon = b.type === 'perm'? '🔴' : '🟡'
        const timeLeft = b.expires_at 
         ? Math.max(0, Math.floor((new Date(b.expires_at) - Date.now()) / 60000)) + ' min'
          : 'PERMANENT'
        listText += `│ ${i + 1}. ${icon} @${b.user_jid.split('@')[0]}\n`
        listText += `│ Type: ${b.type} | Left: ${timeLeft}\n`
        listText += `│ Reason: ${b.reason}\n│\n`
        mentions.push(b.user_jid)
      })
      if (bans.length > 10) listText += `│... +${bans.length - 10} more\n`
      listText += `╰⊷ *Use ${botSettings.prefix}unshut @user*`

      await sock.sendMessage(from, {
        react: { text: '📋', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: listText,
        mentions: mentions
      }, { quoted: msg })
    }

    // 7. HANDLE MAX DURATION
    if (action === 'max' || action === 'duration' || action === 'time') {
      const newMax = parseInt(args[1])

      if (!newMax || newMax < 1 || newMax > 10080) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: msg.key }
        })
        return await sock.sendMessage(from, {
          text: `> Invalid max duration. Use 1-10080 minutes (7 days)\n> Example: ${botSettings.prefix}shut max 60\n> Current: ${currentMaxDuration} min`
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

    // 8. HANDLE STRIKES LIMIT
    if (action === 'strikes' || action === 'limit') {
      const newStrikes = parseInt(args[1])

      if (!newStrikes || newStrikes < 1 || newStrikes > 5) {
        return await sock.sendMessage(from, {
          text: `> Invalid strike limit. Use 1-5\n> Example: ${botSettings.prefix}shut strikes 3\n> Current: ${currentStrikes}`
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
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // 9. HANDLE MODE
    if (action === 'mode') {
      const newMode = args[1]?.toLowerCase()
      const validModes = ['delete', 'warn', 'kick']

      if (!newMode ||!validModes.includes(newMode)) {
        return await sock.sendMessage(from, {
          text: `> Invalid mode. Use: delete, warn, kick\n> Example: ${botSettings.prefix}shut mode kick\n> Current: ${currentMode}`
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
╰⊷ *${botSettings.botname}*`
      }, { quoted: msg })
    }

    // 10. HANDLE WHITELIST
    if (action === 'whitelist' || action === 'wl') {
      const targetUser = mentionedJid[0] || repliedUser

      if (!targetUser) {
        return await sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}shut whitelist @user\n> Example: ${botSettings.prefix}shut whitelist @admin`
        }, { quoted: msg })
      }

      // FIX LID
      const [waResult] = await sock.onWhatsApp(targetUser)
      if (!waResult?.exists) {
        return await sock.sendMessage(from, {
          text: '> User not on WhatsApp'
        }, { quoted: msg })
      }
      const correctUser = waResult.jid

      const { error } = await supabase
       .from('shut_whitelist')
       .upsert({
          group_jid: from,
          user_jid: correctUser,
          added_by: sender
        }, { onConflict: 'group_jid,user_jid' })

      if (error) {
        return await sock.sendMessage(from, {
          text: '> Failed to whitelist. Already whitelisted or database error.'
        }, { quoted: msg })
      }

      await sock.sendMessage(from, {
        react: { text: '⛑️', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Whitelisted* ⌋
│ User: @${correctUser.split('@')[0]}
│ Status: Immune to shut
╰⊷ *${botSettings.botname}*`,
        mentions: [correctUser]
      }, { quoted: msg })
    }

    // 11. HANDLE UNWHITELIST
    if (action === 'unwhitelist' || action === 'unwl') {
      const targetUser = mentionedJid[0] || repliedUser

      if (!targetUser) {
        return await sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}shut unwhitelist @user`
        }, { quoted: msg })
      }

      // FIX LID
      const [waResult] = await sock.onWhatsApp(targetUser)
      if (!waResult?.exists) {
        return await sock.sendMessage(from, {
          text: '> User not on WhatsApp'
        }, { quoted: msg })
      }
      const correctUser = waResult.jid

      const { data, error } = await supabase
       .from('shut_whitelist')
       .delete()
       .eq('group_jid', from)
       .eq('user_jid', correctUser)
       .select()

      if (error ||!data || data.length === 0) {
        return await sock.sendMessage(from, {
          text: `> User not in whitelist.`
        }, { quoted: msg })
      }

      await sock.sendMessage(from, {
        react: { text: '⛑️', key: msg.key }
      })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 🗑️ *Unwhitelisted* ⌋
│ User: @${correctUser.split('@')[0]}
│ Status: Can be shut now
╰⊷ *${botSettings.botname}*`,
        mentions: [correctUser]
      }, { quoted: msg })
    }

    // 12. HANDLE ON/OFF
    const validOptions = ['on', 'off', 'enable', 'disable', '1', '0']
    if (!validOptions.includes(action)) {
      return await sock.sendMessage(from, {
        text: `> Invalid option "${action}".\n> Use: on/off, max, strikes, mode, list, whitelist\n> Or: ${botSettings.prefix}shut @user <minutes> <reason>`
      }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)? true : false

    if (newValue === currentStatus) {
      return await sock.sendMessage(from, {
        text: `> Shut is already ${newValue? 'ON' : 'OFF'}`
      }, { quoted: msg })
    }

    const { error } = await supabase
     .from('group_settings')
     .upsert({
        group_jid: from,
        shut_enabled: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'group_jid' })

    if (error) {
      return await sock.sendMessage(from, {
        text: '> Failed to update shut. Database error.'
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      react: { text: newValue? '⛑️' : '❌', key: msg.key }
    })

    const successPayload =
`╭─⌈ ⛑️ *Settings Updated* ⌋
│ Shut: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Max Duration: ${currentMaxDuration} min
│ Strike Limit: ${currentStrikes}
│ Mode: ${currentMode.toUpperCase()}
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