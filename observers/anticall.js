// observers/anticall.js
import { supabase } from '../lib/supabase.js'

const AUTO_CLEAN_HOURS = 24
const MAX_CALL_ATTEMPTS = 3 // Block after 3 attempts

export default async function anticall(sock, { msg, from, sender, isGroup, isAdmin }, botSettings) {
  try {
    // Only handle call events
    if (!msg.message?.call) return

    const callData = msg.message.call
    const caller = sender || callData.from
    const callerTag = `@${caller.split('@')[0]}`
    const callId = callData.id
    const callType = callData.isVideo? 'Video Call' : 'Voice Call'
    const botJid = sock.user?.id

    // Skip if it's bot calling
    if (caller === botJid) return

    // 1. CHECK WHITELIST - Skip owners/admins
    const isOwner = caller === botSettings.owner_jid
    if (isOwner || (isGroup && isAdmin)) return

    // 2. CHECK ANTICALL SETTINGS - GLOBAL OR GROUP
    const targetJid = isGroup? from : 'global'
    const { data: settings } = await supabase
  .from('group_settings')
  .select('anticall')
  .eq('group_jid', targetJid)
  .maybeSingle()

    // If group disabled, check global
    if (!settings?.anticall && isGroup) {
      const { data: globalSettings } = await supabase
    .from('group_settings')
    .select('anticall')
    .eq('group_jid', 'global')
    .maybeSingle()

      if (!globalSettings?.anticall) return
    } else if (!settings?.anticall) {
      return
    }

    // 3. REJECT CALL IMMEDIATELY
    try {
      await sock.rejectCall(callId, caller)
    } catch (rejectErr) {
      console.log('[ANTICALL REJECT ERROR]', rejectErr.message)
    }

    // 4. SAVE TO SUPABASE
    await supabase.from('call_logs').insert({
      call_id: callId,
      group_jid: isGroup? from : null,
      caller_jid: caller,
      caller_name: msg.pushName || caller.split('@')[0],
      call_type: callData.isVideo? 'video' : 'voice',
      duration: 0,
      status: 'rejected',
      called_at: new Date().toISOString()
    })

    // Auto clean old call_logs after 24hrs
    await supabase
  .from('call_logs')
  .delete()
  .lt('called_at', new Date(Date.now() - AUTO_CLEAN_HOURS * 3600000).toISOString())

    // 5. CHECK WARNING COUNT FOR AUTO BLOCK
    const { data: warningData } = await supabase
  .from('user_warnings')
  .select('count')
  .eq('user_jid', caller)
  .eq('group_jid', isGroup? from : 'global')
  .eq('warning_type', 'call')
  .maybeSingle()

    const currentCount = warningData?.count || 0
    const newCount = currentCount + 1
    const shouldBlock = newCount >= MAX_CALL_ATTEMPTS

    // 6. UPDATE WARNING COUNT
    if (warningData) {
      await supabase
    .from('user_warnings')
    .update({
        count: newCount,
        last_warning: new Date().toISOString(),
        reason: `Illegal call attempt #${newCount}`
      })
    .eq('user_jid', caller)
    .eq('group_jid', isGroup? from : 'global')
    .eq('warning_type', 'call')
    } else {
      await supabase.from('user_warnings').insert({
        user_jid: caller,
        group_jid: isGroup? from : 'global',
        warning_type: 'call',
        reason: 'Illegal call attempt #1',
        count: 1,
        warned_by: 'system'
      })
    }

    // 7. AUTO BLOCK IF MAX ATTEMPTS REACHED
    if (shouldBlock) {
      try {
        await sock.updateBlockStatus(caller, 'block')

        let blockText = `╭─⌈ 🚫 *Auto Blocked* ⌋\n`
        blockText += `│ User: ${callerTag}\n`
        blockText += `│ Reason: ${MAX_CALL_ATTEMPTS} illegal calls\n`
        blockText += `│ Type: ${callType}\n`
        blockText += `│ Action: Blocked permanently\n`
        blockText += `╰⊷ *Powered By Bunny Tech*`

        const target = isGroup? from : caller
        await sock.sendMessage(target, {
          text: blockText,
          mentions: [caller]
        })

        // Reset warnings after block
        await supabase
      .from('user_warnings')
      .delete()
      .eq('user_jid', caller)
      .eq('group_jid', isGroup? from : 'global')
      .eq('warning_type', 'call')

      } catch (blockErr) {
        console.log('[ANTICALL BLOCK ERROR]', blockErr.message)
      }
      return
    }

    // 8. SEND WARNING MESSAGE - ROUND EDGES STYLE
    let warningText = `╭─⌈ 📵 *AntiCall* ⌋\n`
    warningText += `│ Caller: ${callerTag}\n`
    warningText += `│ Type: ${callType}\n`
    warningText += `│ Status: Rejected\n`
    warningText += `│ Warning: ${newCount}/${MAX_CALL_ATTEMPTS}\n`
    warningText += `│\n`
    warningText += `│ *Notice:*\n`
    warningText += `│ Calls are not allowed\n`
    warningText += `│ Use text messages only\n`
    warningText += `│\n`
    warningText += `│ *Auto Block:*\n`
    warningText += `│ ${MAX_CALL_ATTEMPTS - newCount} more = Permanent block\n`
    warningText += `╰⊷ *Powered By Bunny Tech*`

    const target = isGroup? from : caller

    await sock.sendMessage(target, {
      text: warningText,
      mentions: [caller]
    })

  } catch (err) {
    console.log('[ANTICALL ERROR]', err.message)
  }
}