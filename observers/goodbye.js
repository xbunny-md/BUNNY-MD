// observers/goodbye.js
import { supabase } from '../lib/supabase.js'

export default async function goodbye(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    if (!isGroup) return

    // 1. CHECK IF USER LEFT/REMOVED
    const participantUpdate = msg.message?.protocolMessage?.type
    if (participantUpdate!== 28 && participantUpdate!== 29) return // 28 = remove, 29 = leave

    const leftMembers = msg.message.protocolMessage.participants
    if (!leftMembers || leftMembers.length === 0) return

    // 2. CHECK SETTINGS
    const { data: settings } = await supabase
.from('group_settings')
.select('goodbye')
.eq('group_jid', from)
.single()

    if (!settings?.goodbye) return

    // 3. GET GROUP METADATA
    const groupMetadata = await sock.groupMetadata(from)
    const groupName = groupMetadata.subject
    const memberCount = groupMetadata.participants.length

    const action = participantUpdate === 28? 'Removed' : 'Left'

    // 4. SEND GOODBYE FOR EACH MEMBER
    for (const member of leftMembers) {
      const memberTag = `@${member.split('@')[0]}`

      let goodbyeText = `╭─⌈ 👋 *Goodbye* ⌋\n`
      goodbyeText += `│ User: ${memberTag}\n`
      goodbyeText += `│ Action: ${action}\n`
      goodbyeText += `│ Group: ${groupName}\n`
      goodbyeText += `│ Members: ${memberCount}\n`
      goodbyeText += `╰⊷ *Powered by Bunny Tech*`

      await sock.sendMessage(from, {
        text: goodbyeText,
        mentions: [member]
      })
    }

  } catch (err) {
    console.log('[GOODBYE ERROR]', err.message)
  }
}