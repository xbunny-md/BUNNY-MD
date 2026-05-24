// observers/autorecord.js
import { supabase } from '../lib/supabase.js'

export default async function autorecord(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    // Skip if message from bot itself
    if (msg.key.fromMe) return

    // 1. GET SETTINGS - CHECK GLOBAL FIRST
    const { data: globalSettings } = await supabase
   .from('group_settings')
   .select('autorecord, autorecord_scope, autorecord_delay_min, autorecord_delay_max')
   .eq('group_jid', 'global')
   .maybeSingle()

    // 2. GET GROUP SPECIFIC SETTINGS IF IN GROUP
    let settings = globalSettings
    if (isGroup) {
      const { data: groupSettings } = await supabase
     .from('group_settings')
     .select('autorecord, autorecord_scope, autorecord_delay_min, autorecord_delay_max')
     .eq('group_jid', from)
     .maybeSingle()

      // Group settings override global if exists
      if (groupSettings && groupSettings.autorecord !== null) {
        settings = groupSettings
      }
    }

    // 3. CHECK IF AUTORECORD IS ENABLED - DEFAULT TRUE
    if (settings?.autorecord === false) return

    // 4. CHECK SCOPE - WHERE SHOULD IT WORK
    const scope = settings?.autorecord_scope || 'all'
    
    if (scope === 'groups' &&!isGroup) return
    if (scope === 'dm' && isGroup) return
    // 'all' works everywhere

    // 5. GET DELAY RANGE FROM DB - NO HARDCODE
    const delayMin = settings?.autorecord_delay_min || 3000
    const delayMax = settings?.autorecord_delay_max || 6000

    // 6. CALCULATE RANDOM RECORDING DURATION
    const recordingDuration = delayMin + Math.random() * (delayMax - delayMin)

    // 7. SEND RECORDING PRESENCE
    await sock.sendPresenceUpdate('recording', from)

    // 8. KEEP RECORDING FOR CALCULATED DURATION
    await new Promise(resolve => setTimeout(resolve, recordingDuration))

    // 9. STOP RECORDING - Set to available
    await sock.sendPresenceUpdate('available', from)

  } catch (err) {
    console.log('[AUTORECORD ERROR]', err.message)
  }
}