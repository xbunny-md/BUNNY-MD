// observers/autoview.js

import { supabase } from '../lib/supabase.js'

const RANDOM_EMOJIS = [
  '😂','🔥','❤️','😭','😍','🤣','💀','🥺','✨','💯',
  '😎','🙌','👏','🤔','😏','😊','🥰','😘','🤯','😱',
  '🤪','😜','🤤','🫶','🦁','🐰','⚡','💥','🌟','⭐',
  '🎉','🎊','💎','👑','🚀','💪','👀','🧠','🫡','😈',
  '👻','🤖','👽','🦄','🐸','🐱','🐶','🍕','🍔','🍟',
  '☕','🍺','🎮','🎯','🏆','🥇','💰','📈','✅','💚'
]

export default async function autoview(sock, { msg, from, sender }) {
  try {
    if (msg.key.remoteJid!== 'status@broadcast' || msg.key.fromMe) return

    const { data: settings } = await supabase
     .from('group_settings')
     .select('autoview_status')
     .eq('group_jid', from)
     .single()

    if (!settings?.autoview_status) return

    await sock.readMessages([msg.key])

    const statusType = msg.message?.imageMessage? 'image' :
                      msg.message?.videoMessage? 'video' :
                      msg.message?.extendedTextMessage? 'text' : 'unknown'

    await supabase.from('viewed_status').insert({
      status_id: msg.key.id,
      user_jid: sender,
      status_type: statusType
    })

    const randomEmoji = RANDOM_EMOJIS[Math.floor(Math.random() * RANDOM_EMOJIS.length)]

    await sock.sendMessage('status@broadcast', {
      react: { text: randomEmoji, key: msg.key }
    }, {
      statusJidList: [sender]
    })

  } catch (err) {
    console.log('[AUTOVIEW ERROR]', err.message)
  }
}