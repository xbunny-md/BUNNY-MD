// commands/settings/autorecord.js
import { supabase } from '../../lib/supabase.js'

export const name = 'autorecord'
export const alias = ['arecord', 'setrecord', 'recording']
export const category = 'Settings'
export const desc = 'Full autorecord control: on/off, global/group/dm, delay, stats - realtime'

export default async function autorecord(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
  try {
    // 1. ADMIN/OWNER CHECK - Owner allowed in private
    const isOwner = sender === botSettings.owner_jid
    if (!isOwner && (!isGroup ||!isAdmin)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: '> Admin only command.'
      }, { quoted: msg })
    }

    // 2. PARSE ARGS
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()
    const mode = args[1]?.toLowerCase()
    const value = args[2]

    // 3. GET CURRENT SETTINGS
    const { data: globalSettings } = await supabase
  .from('group_settings')
  .select('autorecord, autorecord_scope, autorecord_delay_min, autorecord_delay_max')
  .eq('group_jid', 'global')
  .maybeSingle()

    const { data: groupSettings } = isGroup? await supabase
  .from('group_settings')
  .select('autorecord, autorecord_scope, autorecord_delay_min, autorecord_delay_max')
  .eq('group_jid', from)
  .maybeSingle() : { data: null }

    const globalStatus = globalSettings?.autorecord!== false // Default true
    const groupStatus = groupSettings?.autorecord!== false
    const globalScope = globalSettings?.autorecord_scope || 'all'
    const groupScope = groupSettings?.autorecord_scope || 'all'
    const globalMin = globalSettings?.autorecord_delay_min || 3000
    const globalMax = globalSettings?.autorecord_delay_max || 6000
    const groupMin = groupSettings?.autorecord_delay_min || 3000
    const groupMax = groupSettings?.autorecord_delay_max || 6000

    // 4. HELP + STATS IF NO ARGS
    if (!action) {
      await sock.sendMessage(from, { react: { text: '🎙️', key: msg.key } })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 🎙️ *AutoRecord Control* ⌋
│ Global: ${globalStatus? 'ON ✅' : 'OFF ❌'}
│ Group: ${groupStatus? 'ON ✅' : 'OFF ❌'}
│ Global Scope: ${globalScope}
│ Group Scope: ${groupScope}
│ Global Delay: ${globalMin}-${globalMax}ms
│ Group Delay: ${groupMin}-${groupMax}ms
│
│ *Usage:*
│ ${botSettings.prefix}autorecord on global
│ ${botSettings.prefix}autorecord on group
│ ${botSettings.prefix}autorecord on dm
│ ${botSettings.prefix}autorecord off
│ ${botSettings.prefix}autorecord scope groups
│ ${botSettings.prefix}autorecord delay 2000 5000
│ ${botSettings.prefix}autorecord stats
╰⊷ *Powered By Lupin Starnley*`
      }, { quoted: msg })
    }

    // 5. STATS
    if (action === 'stats') {
      const { count: totalMsgs } = await supabase
   .from('message_logs')
   .select('*', { count: 'exact', head: true })

      let statsText = `╭─⌈ 📊 *AutoRecord Stats* ⌋\n`
      statsText += `│ Status: ${globalStatus || groupStatus? 'Active' : 'Inactive'}\n`
      statsText += `│ Global: ${globalStatus? 'ON' : 'OFF'} | Scope: ${globalScope}\n`
      statsText += `│ Group: ${groupStatus? 'ON' : 'OFF'} | Scope: ${groupScope}\n`
      statsText += `│ Delay Global: ${globalMin}-${globalMax}ms\n`
      statsText += `│ Delay Group: ${groupMin}-${groupMax}ms\n`
      statsText += `│ Total Msgs Processed: ${totalMsgs || 0}\n`
      statsText += `╰⊷ *Powered By Lupin Starnley*`

      return await sock.sendMessage(from, { text: statsText }, { quoted: msg })
    }

    // 6. SET DELAY
    if (action === 'delay') {
      const minDelay = parseInt(mode)
      const maxDelay = parseInt(value)

      if (isNaN(minDelay) || isNaN(maxDelay) || minDelay < 500 || maxDelay > 15000 || minDelay >= maxDelay) {
        return await sock.sendMessage(from, {
          text: `> Invalid delay. Use: ${botSettings.prefix}autorecord delay 2000 5000\nMin: 500ms, Max: 15000ms`
        }, { quoted: msg })
      }

      const targetJid = isGroup? from : 'global'
      const { error } = await supabase
  .from('group_settings')
  .upsert({
          group_jid: targetJid,
          autorecord_delay_min: minDelay,
          autorecord_delay_max: maxDelay,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_jid' })

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Delay Updated* ⌋
│ Scope: ${targetJid === 'global'? 'Global 🌍' : 'Group Only'}
│ Min Delay: ${minDelay}ms
│ Max Delay: ${maxDelay}ms
│ Status: Applied instantly
╰⊷ *Powered By Lupin Starnley*`
      }, { quoted: msg })
    }

    // 7. SET SCOPE
    if (action === 'scope') {
      const validScopes = ['all', 'groups', 'dm']
      if (!validScopes.includes(mode)) {
        return await sock.sendMessage(from, {
          text: `> Invalid scope. Use: all, groups, dm\nExample: ${botSettings.prefix}autorecord scope groups`
        }, { quoted: msg })
      }

      const targetJid = isGroup? from : 'global'
      const { error } = await supabase
  .from('group_settings')
  .upsert({
          group_jid: targetJid,
          autorecord_scope: mode,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_jid' })

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Scope Updated* ⌋
│ Mode: ${targetJid === 'global'? 'Global 🌍' : 'Group Only'}
│ Scope: ${mode.toUpperCase()}
│ Effect: ${mode === 'all'? 'DM + Groups' : mode === 'groups'? 'Groups Only' : 'DM Only'}
│ Status: Applied instantly
╰⊷ *Powered By Lupin Starnley*`
      }, { quoted: msg })
    }

    // 8. ON/OFF VALIDATION
    const validOptions = ['on', 'off', 'enable', 'disable', '1', '0']
    if (!validOptions.includes(action)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Invalid. Use: on/off, scope, delay, stats` }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)? true : false
    let targetJid = 'global'
    let scopeToSet = 'all'

    // Determine target and scope
    if (mode === 'group' && isGroup) {
      targetJid = from
      scopeToSet = 'groups'
    } else if (mode === 'dm') {
      targetJid = isGroup? from : 'global'
      scopeToSet = 'dm'
    } else if (mode === 'global' ||!mode) {
      targetJid = 'global'
      scopeToSet = 'all'
    } else if (isGroup) {
      targetJid = from
      scopeToSet = 'groups'
    }

    const currentValue = targetJid === 'global'? globalStatus : groupStatus

    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Autorecord ${targetJid === 'global'? 'Global' : 'Group'} already ${action}` }, { quoted: msg })
    }

    // 9. UPDATE SUPABASE
    const { error } = await supabase
  .from('group_settings')
  .upsert({
        group_jid: targetJid,
        autorecord: newValue,
        autorecord_scope: scopeToSet,
        updated_at: new Date().toISOString()
      }, { onConflict: 'group_jid' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
    }

    // 10. SUCCESS
    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })

    const successPayload = `╭─⌈ 🎙️ *Settings Updated* ⌋
│ Mode: ${targetJid === 'global'? 'Global 🌍' : 'Group Only'}
│ Scope: ${scopeToSet.toUpperCase()}
│ Autorecord: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Old Status: ${currentValue? 'ON' : 'OFF'}
│ Delay: ${targetJid === 'global'? globalMin : groupMin}-${targetJid === 'global'? globalMax : groupMax}ms
│ Status: Applied instantly
╰⊷ *Powered By Lupin Starnley*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[AUTORECORD ERROR]`, commandException.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}