// commands/settings/autoviewonce.js
import { supabase } from '../../lib/supabase.js'

export const name = 'autoviewonce'
export const alias = ['avonce', 'setviewonce', 'viewonce']
export const category = 'Settings'
export const desc = 'Full autoviewonce control: on/off, global/group, mode, target - realtime'

export default async function autoviewonce(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
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
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

    // 3. GET CURRENT SETTINGS
    const { data: globalSettings } = await supabase
    .from('group_settings')
    .select('autoviewonce, autoviewonce_mode, autoviewonce_target')
    .eq('group_jid', 'global')
    .maybeSingle()

    const { data: groupSettings } = isGroup? await supabase
    .from('group_settings')
    .select('autoviewonce, autoviewonce_mode, autoviewonce_target')
    .eq('group_jid', from)
    .maybeSingle() : { data: null }

    const globalStatus = globalSettings?.autoviewonce || false
    const groupStatus = groupSettings?.autoviewonce || false
    const globalMode = globalSettings?.autoviewonce_mode || 'both'
    const groupMode = groupSettings?.autoviewonce_mode || 'both'
    const globalTarget = globalSettings?.autoviewonce_target || botSettings.owner_jid
    const groupTarget = groupSettings?.autoviewonce_target || botSettings.owner_jid

    // 4. HELP IF NO ARGS
    if (!action) {
      await sock.sendMessage(from, { react: { text: '👁️', key: msg.key } })

      return await sock.sendMessage(from, {
        text: `╭─⌈ 👁️ *AutoViewOnce Control* ⌋
│ Global: ${globalStatus? 'ON ✅' : 'OFF ❌'}
│ Group: ${groupStatus? 'ON ✅' : 'OFF ❌'}
│ Global Mode: ${globalMode.toUpperCase()}
│ Group Mode: ${groupMode.toUpperCase()}
│ Global Target: @${globalTarget.split('@')[0]}
│ Group Target: @${groupTarget.split('@')[0]}
│
│ *Usage:*
│ ${botSettings.prefix}autoviewonce on global
│ ${botSettings.prefix}autoviewonce on group
│ ${botSettings.prefix}autoviewonce off
│ ${botSettings.prefix}autoviewonce mode dm
│ ${botSettings.prefix}autoviewonce mode chat
│ ${botSettings.prefix}autoviewonce mode both
│ ${botSettings.prefix}autoviewonce target @user
╰⊷ *Powered By Bunny Tech*`,
        mentions: [globalTarget, groupTarget]
      }, { quoted: msg })
    }

    // 5. SET TARGET
    if (action === 'target') {
      let targetJid = null

      // Check mentions first
      if (mentions.length > 0) {
        targetJid = mentions[0]
      }
      // Check if number provided
      else if (mode) {
        const num = mode.replace(/[^0-9]/g, '')
        if (num.length >= 10) targetJid = `${num}@s.whatsapp.net`
      }
      // Default to owner
      else {
        targetJid = botSettings.owner_jid
      }

      if (!targetJid) {
        return await sock.sendMessage(from, {
          text: `> Invalid target. Use: ${botSettings.prefix}autoviewonce target @user`
        }, { quoted: msg })
      }

      const dbTarget = isGroup? from : 'global'
      const { error } = await supabase
      .from('group_settings')
      .upsert({
          group_jid: dbTarget,
          autoviewonce_target: targetJid,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_jid' })

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Target Updated* ⌋
│ Scope: ${dbTarget === 'global'? 'Global 🌍' : 'Group Only'}
│ Target: @${targetJid.split('@')[0]}
│ Status: Applied instantly
╰⊷ *Powered By Bunny Tech*`,
        mentions: [targetJid]
      }, { quoted: msg })
    }

    // 6. SET MODE
    if (action === 'mode') {
      const validModes = ['dm', 'chat', 'both']
      if (!validModes.includes(mode)) {
        return await sock.sendMessage(from, {
          text: `> Invalid mode. Use: dm, chat, both\nExample: ${botSettings.prefix}autoviewonce mode both`
        }, { quoted: msg })
      }

      const targetJid = isGroup? from : 'global'
      const { error } = await supabase
      .from('group_settings')
      .upsert({
          group_jid: targetJid,
          autoviewonce_mode: mode,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_jid' })

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Mode Updated* ⌋
│ Scope: ${targetJid === 'global'? 'Global 🌍' : 'Group Only'}
│ Mode: ${mode.toUpperCase()}
│ Effect: ${mode === 'dm'? 'Bot DM Only' : mode === 'chat'? 'Same Chat Only' : 'DM + Chat'}
│ Status: Applied instantly
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 7. ON/OFF VALIDATION
    const validOptions = ['on', 'off', 'enable', 'disable', '1', '0']
    if (!validOptions.includes(action)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Invalid. Use: on/off, mode, target` }, { quoted: msg })
    }

    const newValue = ['on', 'enable', '1'].includes(action)? true : false
    const targetJid = mode === 'group' && isGroup? from : 'global'
    const currentValue = targetJid === 'global'? globalStatus : groupStatus

    if (newValue === currentValue) {
      await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Autoviewonce ${targetJid === 'global'? 'Global' : 'Group'} already ${action}` }, { quoted: msg })
    }

    // 8. UPDATE SUPABASE
    const { error } = await supabase
    .from('group_settings')
    .upsert({
        group_jid: targetJid,
        autoviewonce: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'group_jid' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: '> Database error.' }, { quoted: msg })
    }

    // 9. SUCCESS
    await sock.sendMessage(from, { react: { text: newValue? '✅' : '❌', key: msg.key } })

    const successPayload = `╭─⌈ 👁️ *Settings Updated* ⌋
│ Mode: ${targetJid === 'global'? 'Global 🌍' : 'Group Only'}
│ Autoviewonce: ${newValue? 'ON ✅' : 'OFF ❌'}
│ Send Mode: ${(targetJid === 'global'? globalMode : groupMode).toUpperCase()}
│ Target: @${(targetJid === 'global'? globalTarget : groupTarget).split('@')[0]}
│ Old Status: ${currentValue? 'ON' : 'OFF'}
│ Status: Applied instantly
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      text: successPayload,
      mentions: [targetJid === 'global'? globalTarget : groupTarget]
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[AUTOVIEWONCE ERROR]`, commandException.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}