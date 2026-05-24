// observers/welcome.js
import { supabase } from '../lib/supabase.js'

export default async function welcome(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    if (!isGroup) return

    // 1. CHECK IF USER JOINED
    const participantUpdate = msg.message?.protocolMessage?.type
    if (participantUpdate!== 27) return // 27 = add

    const newMembers = msg.message.protocolMessage.participants
    if (!newMembers || newMembers.length === 0) return

    // 2. CHECK SETTINGS
    const { data: settings } = await supabase
.from('group_settings')
.select('welcome')
.eq('group_jid', from)
.single()

    if (!settings?.welcome) return

    // 3. GET GROUP METADATA
    const groupMetadata = await sock.groupMetadata(from)
    const groupName = groupMetadata.subject
    const groupDesc = groupMetadata.desc || 'No description'
    const memberCount = groupMetadata.participants.length

    // 4. SEND WELCOME FOR EACH NEW MEMBER
    for (const member of newMembers) {
      const memberTag = `@${member.split('@')[0]}`

      let welcomeText = `╭─⌈ 🎉 *Welcome* ⌋\n`
      welcomeText += `│ User: ${memberTag}\n`
      welcomeText += `│ Group: ${groupName}\n`
      welcomeText += `│ Members: ${memberCount}\n`
      welcomeText += `│ \n`
      welcomeText += `│ *Rules:*\n`
      welcomeText += `│ Read group description\n`
      welcomeText += `╰⊷ *Powered by Bunny Tech*`

      await sock.sendMessage(from, {
        text: welcomeText,
        mentions: [member]
      })
    }

  } catch (err) {
    console.log('[WELCOME ERROR]', err.message)
  }
}