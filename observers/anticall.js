// observers/anticall.js
import { supabase } from '../lib/supabase.js'

const AUTO_CLEAN_HOURS = 24 // Delete old call logs after 24hrs

export default async function anticall(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    // Only handle call events
    if (!msg.message?.call) return

    const callData = msg.message.call
    const caller = sender || callData.from
    const callerTag = `@${caller.split('@')[0]}`
    const callId = callData.id
    const callType = callData.isVideo? 'Video Call' : 'Voice Call'

    // 1. CHECK ANTICALL SETTINGS
    let anticallEnabled = false

    if (isGroup) {
      const { data: settings } = await supabase
    .from('group_settings')
    .select('anticall')
    .eq('group_jid', from)
    .single()

      anticallEnabled = settings?.anticall || false
    } else {
      // For DM calls - always block if anticall enabled globally
      const { data: settings } = await supabase
    .from('group_settings')
    .select('anticall')
    .eq('group_jid', 'GLOBAL')
    .single()

      anticallEnabled = settings?.anticall || false
    }

    if (!anticallEnabled) return

    // 2. SAVE TO SUPABASE
    await supabase.from('call_logs').insert({
      call_id: callId,
      group_jid: isGroup? from : null,
      caller_jid: caller,
      caller_name: msg.pushName || caller.split('@')[0],
      call_type: callType.toLowerCase().replace(' ', '_'),
      duration: 0,
      status: 'rejected',
      called_at: new Date().toISOString()
    })

    // Auto clean old call_logs after 24hrs
    await supabase
  .from('call_logs')
  .delete()
  .lt('called_at', new Date(Date.now() - AUTO_CLEAN_HOURS * 3600000).toISOString())

    // 3. REJECT CALL - Baileys auto rejects if you don't answer
    // We just send warning message

    // 4. SEND WARNING MESSAGE - FULL ROUND EDGES STYLE
    let warningText = `╭─⌈ 🚫 *AntiCall* ⌋\n`
    warningText += `│ Caller: ${callerTag}\n`
    warningText += `│ Type: ${callType}\n`
    warningText += `│ Status: Rejected\n`
    warningText += `│ \n`
    warningText += `│ *Warning:*\n`
    warningText += `│ Calls are not allowed\n`
    warningText += `│ Please use text messages\n`
    warningText += `│ \n`
    warningText += `│ *Note:*\n`
    warningText += `│ Repeated calls may result\n`
    warningText += `│ in temporary block\n`
    warningText += `╰⊷ *Powered by Bunny Tech*`

    // Send to caller - DM if private call, group if group call
    const targetJid = isGroup? from : caller

    await sock.sendMessage(targetJid, {
      text: warningText,
      mentions: [caller]
    })

    // 5. UPDATE WARNING COUNT
    if (isGroup) {
      const { data: existingWarning } = await supabase
    .from('user_warnings')
    .select('count')
    .eq('user_jid', caller)
    .eq('group_jid', from)
    .eq('warning_type', 'call')
    .single()

      if (existingWarning) {
        await supabase
      .from('user_warnings')
      .update({
          count: existingWarning.count + 1,
          last_warning: new Date().toISOString(),
          reason: 'Illegal call attempt'
        })
      .eq('user_jid', caller)
      .eq('group_jid', from)
      .eq('warning_type', 'call')
      } else {
        await supabase.from('user_warnings').insert({
          user_jid: caller,
          group_jid: from,
          warning_type: 'call',
          reason: 'Illegal call attempt',
          count: 1,
          warned_by: 'system'
        })
      }
    }

  } catch (err) {
    console.log('[ANTICALL ERROR]', err.message)
  }
}