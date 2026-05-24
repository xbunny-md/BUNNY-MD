// commands/settings/autotyping.js
import { supabase } from '../../lib/supabase.js'

export const name = 'autotyping'
export const alias = ['atyping', 'settyping', 'typing']
export const category = 'Settings'
export const desc = 'Full autotyping control: on/off, global/group/dm, delay, stats - realtime'

export default async function autotyping(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
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
   .select('autotyping, autotyping_scope, autotyping_delay_min, autotyping_delay_max')
   .eq('group_jid', 'global')
   .maybeSingle()

    const { data: groupSettings } = isGroup? await supabase
   .from('group_settings')
   .select('autotyping, autotyping_scope, autotyping_delay_min, autotyping_delay_max')
   .eq('group_jid', from)
   .maybeSingle() : { data: null }

    const globalStatus = globalSettings?.autotyping || false
    const groupStatus = groupSettings?.autotyping || false
    const globalScope = globalSettings?.autotyping_scope || 'all'
    const groupScope = groupSettings?.autotyping_scope || 'all'
    const globalMin = globalSettings?.autotyping_delay_min || 2000
    const globalMax = globalSettings?.autotyping_delay_max || 4000
    const groupMin = groupSettings?.autotyping_delay_min || 2000
    const groupMax = groupSettings?.autotyping_delay_max || 4000

    // 4. HELP + STATS IF NO ARGS
    if (!action) {
      await sock.sendMessage(from, { react: { text: '⌨️', key: msg.key } })

      return await sock.sendMessage(from, {
        text: `╭─⌈ ⌨️ *AutoTyping Control* ⌋
│ Global: ${globalStatus? 'ON ✅' : 'OFF ❌'}
│ Group: ${groupStatus? 'ON ✅' : 'OFF ❌'}
│ Global Scope: ${globalScope}
│ Group Scope: ${groupScope}
│ Global Delay: ${globalMin}-${globalMax}ms
│ Group Delay: ${groupMin}-${groupMax}ms
│
│ *Usage:*
│ ${botSettings.prefix}autotyping on global
│ ${botSettings.prefix}autotyping on group
│ ${botSettings.prefix}autotyping on dm
│ ${botSettings.prefix}autotyping off
│ ${botSettings.prefix}autotyping scope groups
│ ${botSettings.prefix}autotyping delay 1000 3000
│ ${botSettings.prefix}autotyping stats
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. STATS
    if (action === 'stats') {
      const { count: totalMsgs } = await supabase
    .from('message_logs')
    .select('*', { count: 'exact', head: true })

      let statsText = `╭─⌈ 📊 *AutoTyping Stats* ⌋\n`
      statsText += `│ Status: ${globalStatus || groupStatus? 'Active' : 'Inactive'}\n`
      statsText += `│ Global: ${globalStatus? 'ON' : 'OFF'} | Scope: ${globalScope}\n`
      statsText += `│ Group: ${groupStatus? 'ON' : 'OFF'} | Scope: ${groupScope}\n`
      statsText += `│ Delay Global: ${globalMin}-${globalMax}ms\n`
      statsText += `│ Delay Group: ${groupMin}-${groupMax}ms\n`
      statsText += `│ Total Msgs Processed: ${totalMsgs || 0}\n`
      statsText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: statsText }, { quoted: msg })
    }

    // 6. SET DELAY
    if (action === 'delay') {
      const minDelay = parseInt(mode)
      const maxDelay = parseInt(value)

      if (isNaN(minDelay) || isNaN(maxDelay) || minDelay < 500 || maxDelay > 10000 || minDelay >= maxDelay) {
        return await sock.sendMessage(from, {
          text: `> Invalid delay. Use: ${botSettings.prefix}autotyping delay 1000 3000\nMin: 500ms, Max: 10000ms`
        }, { quoted: msg })
      }

      const targetJid = isGroup? from : 'global'
      const { error } = await supabase
   .from('group_settings')
   .upsert({
          group_jid: targetJid,
          autotyping_delay_min: minDelay,
          autotyping_delay_max: maxDelay,
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
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 7. SET SCOPE
    if (action === 'scope') {
      const validScopes = ['all', 'groups', 'dm']
      if (!validScopes.includes(mode)) {
        return await sock.sendMessage(from, {
          text: `> Invalid scope. Use: all, groups, dm\nExample: ${botSettings.prefix}autotyping scope groups`
        }, { quoted: msg })
      }

      const targetJid = isGroup? from : 'global'
      const { error } = await supabase
   .from('group_settings')
   .upsert({
          group_jid: targetJid,
          autotyping_scope: mode,
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
╰⊷ *Powered By Bunny Tech*`
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
      return await sock.sendMessage(from, { text: `> Autotyping ${targetJid === 'global'? 'Global' : 'Group'} already ${action}` }, { quoted: msg })
    }

    // 9. UPDATE SUPABASE
    const { error } = await supabase
   .from('group_settings')
   .upsert({
        group_jid: targetJid,
        autotyping: newValue,
        autotyping_scope: scopeToSet,
        updated_at: new Date().toISOString()
      }, { onConflict: 'group_jid' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
    }

    // 10. SUCCESS
    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })

    const successPayload = `╭─⌈ ⌨️ *Settings Updated* ⌋
│ Mode: ${targetJid === 'global'? 'Global 🌍' : 'Group Only'}
│ Scope: ${scopeToSet.toUpperCase()}
│ Autotyping: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Old Status: ${currentValue? 'ON' : 'OFF'}
│ Delay: ${targetJid === 'global'? globalMin : groupMin}-${targetJid === 'global'? globalMax : groupMax}ms
│ Status: Applied instantly
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      text: successPayload
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[AUTOTYPING ERROR]`, commandException.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}