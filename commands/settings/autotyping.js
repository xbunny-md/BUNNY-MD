// commands/settings/auto-reply.js
import { supabase } from '../../lib/supabase.js'

export const name = 'autoreply'
export const alias = ['ar', 'setar', 'autore']
export const category = 'Settings'
export const desc = 'Full autoreply control: on/off, tag/reply/number/all, list, stats - realtime'
export const adminOnly = true
export const botAdmin = false

export default async function autoreply(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
  try {
    // 1. ADMIN/OWNER CHECK
    const isOwner = sender === botSettings.owner_jid
    if (!isOwner && (!isGroup ||!isAdmin)) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: '> Admin only command.'
      }, { quoted: msg })
    }

    // 2. PARSE ARGS + MENTIONS + REPLY
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = body.trim().split(' ').slice(1)
    const action = args[0]?.toLowerCase()
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant

    // 3. GET CURRENT ACTIVE USERS COUNT
    const { count: activeCount } = await supabase
  .from('autoreply_active')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true)

    // 4. HELP + STATS IF NO ARGS
    if (!action) {
      const { data: recentActive } = await supabase
   .from('autoreply_active')
   .select('user_jid, reply_count, activated_at')
   .eq('is_active', true)
   .order('activated_at', { ascending: false })
   .limit(3)

      await sock.sendMessage(from, { react: { text: '🦁', key: msg.key } })

      let helpText = `╭─⌈ 🦁 *AutoReply Control* ⌋\n`
      helpText += `│ Active Users: ${activeCount || 0}\n`
      helpText += `│ Mode: Supabase Realtime\n│\n`
      helpText += `│ *Enable:*\n`
      helpText += `│ ${botSettings.prefix}autoreply @user1 @user2\n`
      helpText += `│ ${botSettings.prefix}autoreply 255700000000\n`
      helpText += `│ Reply message → ${botSettings.prefix}autoreply\n`
      helpText += `│ ${botSettings.prefix}autoreply all\n│\n`
      helpText += `│ *Disable:*\n`
      helpText += `│ ${botSettings.prefix}autoreply off @user\n`
      helpText += `│ ${botSettings.prefix}autoreply off all\n│\n`
      helpText += `│ *Info:*\n`
      helpText += `│ ${botSettings.prefix}autoreply list\n`
      helpText += `│ ${botSettings.prefix}autoreply stats\n`

      if (recentActive?.length > 0) {
        helpText += `│\n│ *Recent Active:*\n`
        recentActive.forEach((u, i) => {
          const num = u.user_jid.split('@')[0]
          helpText += `│ ${i + 1}. @${num} - ${u.reply_count} replies\n`
        })
      }
      helpText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: helpText }, { quoted: msg })
    }

    // 5. STATS
    if (action === 'stats') {
      const { data: topUsers } = await supabase
   .from('autoreply_active')
   .select('user_jid, reply_count, activated_at')
   .eq('is_active', true)
   .order('reply_count', { ascending: false })
   .limit(5)

      const { data: logs } = await supabase
   .from('message_logs')
   .select('*', { count: 'exact', head: true })
   .eq('is_from_user', false)

      let statsText = `╭─⌈ 📊 *AutoReply Stats* ⌋\n`
      statsText += `│ Active Users: ${activeCount || 0}\n`
      statsText += `│ Total Replies: ${logs || 0}\n`

      if (topUsers?.length > 0) {
        statsText += `│\n│ *Top Users:*\n`
        topUsers.forEach((u, i) => {
          const num = u.user_jid.split('@')[0]
          statsText += `│ ${i + 1}. @${num}: ${u.reply_count} replies\n`
        })
      }
      statsText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: statsText }, { quoted: msg })
    }

    // 6. LIST ALL ACTIVE
    if (action === 'list') {
      const { data: users } = await supabase
   .from('autoreply_active')
   .select('user_jid, reply_count, activated_at, activated_by')
   .eq('is_active', true)
   .order('activated_at', { ascending: false })
   .limit(20)

      if (!users || users.length === 0) {
        return await sock.sendMessage(from, { text: `> No users have AutoReply enabled.` }, { quoted: msg })
      }

      let listText = `╭─⌈ 📋 *AutoReply Active List* ⌋\n`
      const mentionsList = []
      users.forEach((u, i) => {
        const num = u.user_jid.split('@')[0]
        const time = new Date(u.activated_at).toLocaleDateString()
        listText += `│ ${i + 1}. @${num} - ${u.reply_count} replies\n`
        mentionsList.push(u.user_jid)
      })
      listText += `│\n│ Total: ${users.length}\n`
      listText += `╰⊷ *Powered By Bunny Tech*`

      return await sock.sendMessage(from, { text: listText, mentions: mentionsList }, { quoted: msg })
    }

    // 7. DISABLE ALL
    if (action === 'off' && args[1]?.toLowerCase() === 'all') {
      const { error } = await supabase
   .from('autoreply_active')
   .update({ is_active: false })
   .eq('is_active', true)

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *AutoReply Disabled* ⌋\n│ Scope: All Users\n│ Status: Stopped\n╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 8. ENABLE ALL - GLOBAL MODE
    if (action === 'all' || (action === 'on' && args[1]?.toLowerCase() === 'all')) {
      const { error } = await supabase
   .from('autoreply_active')
   .upsert({
        user_jid: 'global',
        activated_by: sender,
        is_active: true,
        activated_at: new Date().toISOString()
      }, { onConflict: 'user_jid' })

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ✅ *AutoReply Enabled* ⌋\n│ Scope: All DMs 🌍\n│ Mode: Global\n│ Status: Active\n╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 9. DISABLE SPECIFIC USER
    if (action === 'off') {
      let targetJid = null

      if (mentions.length > 0) {
        targetJid = mentions[0]
      }
      else if (quotedSender) {
        targetJid = quotedSender
      }
      else if (args[1]) {
        const num = args[1].replace(/[^0-9]/g, '')
        if (num.length >= 10) targetJid = `${num}@s.whatsapp.net`
      }

      if (!targetJid) {
        return await sock.sendMessage(from, { text: `> Tag user, reply to message, or provide number\nExample: ${botSettings.prefix}autoreply off @user` }, { quoted: msg })
      }

      const { error } = await supabase
   .from('autoreply_active')
   .update({ is_active: false })
   .eq('user_jid', targetJid)

      if (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
        return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *AutoReply Disabled* ⌋\n│ User: @${targetJid.split('@')[0]}\n│ Status: Stopped\n╰⊷ *Powered By Bunny Tech*`,
        mentions: [targetJid]
      }, { quoted: msg })
    }

    // 10. ENABLE SPECIFIC USERS - ON/TAG/REPLY/NUMBER
    const targets = []

    if (mentions.length > 0) {
      targets.push(...mentions)
    }
    else if (quotedSender && (action === 'on' ||!action)) {
      targets.push(quotedSender)
    }
    else {
      for (const arg of args) {
        const num = arg.replace(/[^0-9]/g, '')
        if (num.length >= 10) {
          targets.push(`${num}@s.whatsapp.net`)
        }
      }
    }

    if (targets.length === 0) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `> Tag user, reply to message, or provide number\nExample: ${botSettings.prefix}autoreply @user`
      }, { quoted: msg })
    }

    // 11. INSERT TO SUPABASE
    const insertData = targets.map(jid => ({
      user_jid: jid,
      activated_by: sender,
      is_active: true,
      activated_at: new Date().toISOString(),
      reply_count: 0
    }))

    const { error } = await supabase
  .from('autoreply_active')
  .upsert(insertData, { onConflict: 'user_jid' })

    if (error) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, { text: `> Database error: ${error.message}` }, { quoted: msg })
    }

    // 12. SUCCESS
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

    let successText = `╭─⌈ ✅ *AutoReply Enabled* ⌋\n│ Users: ${targets.length}\n`
    targets.forEach((jid, i) => {
      successText += `│ ${i + 1}. @${jid.split('@')[0]}\n`
    })
    successText += `│ Status: Active\n│ Mode: DM Only\n╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      text: successText,
      mentions: targets
    }, { quoted: msg })

  } catch (commandException) {
    console.error(`[AUTOREPLY CMD ERROR]`, commandException.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, { text: `> Failed: ${commandException.message}` }, { quoted: msg })
  }
}