// commands/moderation/shut.js
import { supabase } from '../../lib/supabase.js'

export const name = 'gshut'
export const alias = ['gban', 'gmute']
export const category = 'Moderation'
export const desc = 'Ban users: reply, tag multiple, or manual numbers'

export default async function shutCmd(sock, { msg, from, sender, args, isGroup, isAdmin, groupMetadata }, botSettings) {
  try {
    if (!isGroup) return await sock.sendMessage(from, { text: '> Group only' }, { quoted: msg })
    if (!isAdmin) return await sock.sendMessage(from, { text: '> Admin only' }, { quoted: msg })

    const action = args[0]?.toLowerCase()
    if (!action) {
      return await sock.sendMessage(from, {
        text: `> Usage:\n${botSettings.prefix}shut on @user1 @user2\n${botSettings.prefix}shut temp 10 @user reason\n${botSettings.prefix}shut perm 255700000000\n${botSettings.prefix}shut kick 30 @user\n${botSettings.prefix}shut off @user\n\nReply message ya mtu pia inafanya kazi`
      }, { quoted: msg })
    }

    // 1. COLLECT ALL TARGET USERS
    const targets = []
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo

    // A. From reply
    if (contextInfo?.participant) {
      targets.push(contextInfo.participant)
    }

    // B. From mentions @user1 @user2 @user3
    if (contextInfo?.mentionedJid?.length > 0) {
      targets.push(...contextInfo.mentionedJid)
    }

    // C. From manual numbers -.shut on 255700000000 255711111111
    const numberArgs = args.filter(arg => /^\d{10,15}$/.test(arg.replace('@', '')))
    numberArgs.forEach(num => {
      const jid = num.replace('@', '') + '@s.whatsapp.net'
      if (!targets.includes(jid)) targets.push(jid)
    })

    if (targets.length === 0) {
      return await sock.sendMessage(from, {
        text: '> Reply message, tag @users, au andika namba: 255700000000'
      }, { quoted: msg })
    }

    // 2. PARSE ACTION + DURATION + REASON
    let type = 'temp'
    let duration = 300 // 5 min default
    let reason = 'No reason'

    if (action === 'perm') {
      type = 'perm'
      duration = null
      reason = args.slice(1).filter(a =>!a.includes('@') &&!/^\d+$/.test(a)).join(' ') || 'Permanent ban'
    } else if (action === 'kick') {
      type = 'kick_temp'
      const durArg = args.find(a => /^\d+$/.test(a))
      duration = durArg? parseInt(durArg) * 60 : 1800 // 30min default
      reason = args.slice(1).filter(a =>!a.includes('@') &&!/^\d+$/.test(a)).join(' ') || 'Timeout'
    } else if (action === 'temp') {
      type = 'temp'
      const durArg = args.find(a => /^\d+$/.test(a))
      duration = durArg? parseInt(durArg) * 60 : 300
      reason = args.slice(1).filter(a =>!a.includes('@') &&!/^\d+$/.test(a)).join(' ') || 'Temporary ban'
    } else if (action === 'on') {
      type = 'temp'
      duration = 300
      reason = args.slice(1).filter(a =>!a.includes('@')).join(' ') || 'Temporary ban'
    } else if (action === 'off') {
      // UNBAN MULTIPLE
      const { error } = await supabase
    .from('shut_list')
    .update({ is_active: false })
    .eq('group_jid', from)
    .in('user_jid', targets)

      if (error) throw error

      return await sock.sendMessage(from, {
        text: `╭─⌈ 🔓 *Unbanned ${targets.length} users* ⌋
│ ${targets.map(t => '@' + t.split('@')[0]).join(', ')}
╰⊷ *${botSettings.botname}*`,
        mentions: targets
      }, { quoted: msg })
    }

    // 3. BAN ALL TARGETS - BULK INSERT
    const expiresAt = duration? new Date(Date.now() + duration * 1000).toISOString() : null
    const banRecords = targets.map(userJid => ({
      group_jid: from,
      user_jid: userJid,
      type: type,
      duration: duration,
      expires_at: expiresAt,
      reason: reason,
      banned_by: sender,
      is_active: true
    }))

    const { error } = await supabase
  .from('shut_list')
  .upsert(banRecords, { onConflict: 'group_jid,user_jid' })

    if (error) throw error

    // 4. KICK IF kick_temp
    if (type === 'kick_temp') {
      const botJid = sock.user.id
      const botParticipant = groupMetadata.participants.find(p => p.id === botJid)
      if (botParticipant?.admin === null) {
        return await sock.sendMessage(from, { text: '> Bot si admin, siwezi kick' }, { quoted: msg })
      }
      await sock.groupParticipantsUpdate(from, targets, 'remove')
    }

    // 5. LOG ALL
    const logRecords = targets.map(userJid => ({
      group_jid: from,
      user_jid: userJid,
      action: type === 'kick_temp'? 'kicked' : 'banned',
      type: type,
      admin_jid: sender,
      reason: reason,
      duration: duration
    }))
    await supabase.from('shut_logs').insert(logRecords)

    // 6. SUCCESS MESSAGE
    const timeText = type === 'perm'? 'milele' : `kwa dakika ${duration / 60}`
    const actionText = type === 'kick_temp'? 'Kicked' : 'Banned'

    await sock.sendMessage(from, {
      react: { text: '🔒', key: msg.key }
    })

    return await sock.sendMessage(from, {
      text: `╭─⌈ 🔒 *${actionText} ${targets.length} Users* ⌋
│ Users: ${targets.map(t => '@' + t.split('@')[0]).join(', ')}
│ Type: ${type === 'kick_temp'? 'Kick Timeout' : type === 'perm'? 'Permanent' : 'Temporary'}
│ Duration: ${timeText}
│ Reason: ${reason}
│
│ ${type === 'kick_temp'? 'Wametolewa. Watarudishwa automatic.' : 'Messages zao zitafutwa automatic.'}
╰⊷ *${botSettings.botname}*`,
      mentions: targets
    }, { quoted: msg })

  } catch (err) {
    console.log('[SHUT CMD ERROR]', err.message)
    await sock.sendMessage(from, { text: '> Error: ' + err.message }, { quoted: msg })
  }
}