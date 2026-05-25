// commands/group/groupcode.js
import { supabase } from '../../lib/supabase.js'

export const name = 'groupcode'
export const alias = ['gc', 'gcode', 'setcode']
export const category = 'Group'
export const desc = 'Full group code control: list, set, remove, info - realtime'

export default async function groupcode(sock, { msg, from, sender, isGroup, isAdmin, participants }, botSettings) {
  try {
    // 1. ADMIN/OWNER CHECK - Owner allowed anywhere
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
    const target1 = args[1]
    const target2 = args[2]

    // 3. HELP + LIST IF NO ARGS OR action = 'list'
    if (!action || action === 'list') {
      // Get all groups bot is in
      const groups = await sock.groupFetchAllParticipating()
      const groupList = Object.values(groups)

      // Get existing codes from DB
      const { data: existingCodes } = await supabase
    .from('group_codes')
    .select('code, group_jid, group_name')

      const codeMap = {}
      existingCodes?.forEach(gc => {
        codeMap[gc.group_jid] = gc.code
      })

      await sock.sendMessage(from, { react: { text: '📋', key: msg.key } })

      let listText = `╭─⌈ 📋 *Group Code List* ⌋\n│ Total: ${groupList.length} groups\n│\n`

      groupList.slice(0, 20).forEach((group, i) => {
        const code = codeMap[group.id]? `[${codeMap[group.id]}]` : '[no code]'
        const members = group.participants?.length || 0
        listText += `│ ${i + 1}. ${group.subject} ${code}\n│ Members: ${members}\n`
      })

      if (groupList.length > 20) {
        listText += `│\n│... and ${groupList.length - 20} more\n`
      }

      listText += `│\n│ *Usage:*\n`
      listText += `│ ${botSettings.prefix}groupcode code 1 bunny\n`
      listText += `│ ${botSettings.prefix}groupcode uncode bunny\n`
      listText += `│ ${botSettings.prefix}groupcode info bunny\n`
      listText += `│ ${botSettings.prefix}groupcode search bun\n`
      listText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: listText }, { quoted: msg })
    }

    // 4. SET CODE
    if (action === 'code' || action === 'set') {
      if (!target1 ||!target2) {
        return await sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}groupcode code 1 bunny\n> Run ${botSettings.prefix}groupcode list first to see numbers`
        }, { quoted: msg })
      }

      const groupIndex = parseInt(target1) - 1
      const newCode = target2.toLowerCase().trim()

      // Validate code format
      if (!/^[a-z0-9_]+$/.test(newCode)) {
        return await sock.sendMessage(from, {
          text: `> Invalid code. Use only letters, numbers, underscore.`
        }, { quoted: msg })
      }

      if (newCode.length < 2 || newCode.length > 20) {
        return await sock.sendMessage(from, {
          text: `> Code must be 2-20 characters.`
        }, { quoted: msg })
      }

      // Get all groups to find the target
      const groups = await sock.groupFetchAllParticipating()
      const groupList = Object.values(groups)

      if (groupIndex < 0 || groupIndex >= groupList.length) {
        return await sock.sendMessage(from, {
          text: `> Invalid group number. Run ${botSettings.prefix}groupcode list`
        }, { quoted: msg })
      }

      const targetGroup = groupList[groupIndex]

      // Check if code already exists
      const { data: existingCode } = await supabase
    .from('group_codes')
    .select('code, group_name')
    .eq('code', newCode)
    .maybeSingle()

      if (existingCode) {
        return await sock.sendMessage(from, {
          text: `> Code "${newCode}" already used for "${existingCode.group_name}"`
        }, { quoted: msg })
      }

      // Insert or update code
      const { error } = await supabase
    .from('group_codes')
    .upsert({
          code: newCode,
          group_jid: targetGroup.id,
          group_name: targetGroup.subject,
          created_by: sender,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_jid' })

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
      }

      // Create default feature_flags entry - SQL DEFAULTS zitatumika
      await supabase
    .from('feature_flags')
    .upsert({ code: newCode }, { onConflict: 'code' })

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Code Set* ⌋
│ Code: ${newCode}
│ Group: ${targetGroup.subject}
│ Members: ${targetGroup.participants?.length || 0}
│ Status: Ready for use
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 5. REMOVE CODE / UNCODE
    if (action === 'uncode' || action === 'remove' || action === 'rm') {
      if (!target1) {
        return await sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}groupcode uncode bunny`
        }, { quoted: msg })
      }

      const code = target1.toLowerCase().trim()

      // Check if code exists
      const { data: existingCode } = await supabase
    .from('group_codes')
    .select('code, group_name')
    .eq('code', code)
    .maybeSingle()

      if (!existingCode) {
        return await sock.sendMessage(from, { text: `> Code "${code}" not found.` }, { quoted: msg })
      }

      // Delete - cascade will remove feature_flags too
      const { error } = await supabase
    .from('group_codes')
    .delete()
    .eq('code', code)

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Database error.` }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *Code Removed* ⌋
│ Code: ${code}
│ Group: ${existingCode.group_name}
│ Status: Deleted
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. INFO - LIVE FROM DB NO HARDCODING
    if (action === 'info') {
      if (!target1) {
        return await sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}groupcode info bunny`
        }, { quoted: msg })
      }

      const code = target1.toLowerCase().trim()

      const { data: groupCode } = await supabase
    .from('group_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle()

      if (!groupCode) {
        return await sock.sendMessage(from, { text: `> Code "${code}" not found.` }, { quoted: msg })
      }

      const { data: features } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('code', code)
    .maybeSingle()

      // Get live group info
      let liveMembers = 0
      try {
        const groupMeta = await sock.groupMetadata(groupCode.group_jid)
        liveMembers = groupMeta.participants?.length || 0
      } catch {}

      await sock.sendMessage(from, { react: { text: 'ℹ️', key: msg.key } })

      let infoText = `╭─⌈ ℹ️ *Code Info: ${code}* ⌋\n`
      infoText += `│ Group: ${groupCode.group_name}\n`
      infoText += `│ Members: ${liveMembers}\n`
      infoText += `│ Created: ${new Date(groupCode.created_at).toLocaleDateString()}\n│\n`
      infoText += `│ *Features:*\n`

      // DYNAMIC FEATURE LIST - NO HARDCODING
      if (features) {
        const skipKeys = ['code', 'updated_at', 'updated_by']
        const featureKeys = Object.keys(features)
         .filter(key =>!skipKeys.includes(key) && typeof features[key] === 'boolean')
         .sort()

        featureKeys.forEach(key => {
          // Convert snake_case to Title Case
          const displayName = key
           .split('_')
           .map(word => word.charAt(0).toUpperCase() + word.slice(1))
           .join('')

          const status = features[key]? 'ON ✅' : 'OFF ❌'
          infoText += `│ ${displayName}: ${status}\n`
        })
      } else {
        infoText += `│ No features configured\n`
      }

      infoText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: infoText }, { quoted: msg })
    }

    // 7. SEARCH
    if (action === 'search' || action === 'find') {
      if (!target1) {
        return await sock.sendMessage(from, {
          text: `> Usage: ${botSettings.prefix}groupcode search bun`
        }, { quoted: msg })
      }

      const searchTerm = target1.toLowerCase().trim()

      const { data: results } = await supabase
    .from('group_codes')
    .select('code, group_name')
    .ilike('code', `%${searchTerm}%`)
    .limit(10)

      if (!results || results.length === 0) {
        return await sock.sendMessage(from, { text: `> No codes found matching "${searchTerm}"` }, { quoted: msg })
      }

      let searchText = `╭─⌈ 🔍 *Search Results* ⌋\n│ Query: ${searchTerm}\n│\n`
      results.forEach((r, i) => {
        searchText += `│ ${i + 1}. ${r.code} - ${r.group_name}\n`
      })
      searchText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: searchText }, { quoted: msg })
    }

    // 8. INVALID ACTION
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    return await sock.sendMessage(from, {
      text: `> Invalid action. Use: list, code, uncode, info, search`
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[GROUPCODE ERROR]`, commandException.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: '> Failed. Check database.' }, { quoted: msg })
  }
}