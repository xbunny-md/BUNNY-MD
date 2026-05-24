// observers/autoreact.js

import { supabase } from '../lib/supabase.js'

const RANDOM_EMOJIS = [
  '😂','🔥','❤️','😭','😍','🤣','💀','🥺','✨','💯',
  '😎','🙌','👏','🤔','😏','😊','🥰','😘','🤯','😱',
  '🤪','😜','🤤','🫶','🦁','🐰','⚡','💥','🌟','⭐',
  '🎉','🎊','💎','👑','🚀','💪','👀','🧠','🫡','😈',
  '👻','🤖','👽','🦄','🐸','🐱','🐶','🍕','🍔','🍟',
  '☕','🍺','🎮','🎯','🏆','🥇','💰','📈','✅','💚'
]

export default async function autoreact(sock, { msg, from, isGroup }) {
  try {
    if (!isGroup || msg.key.fromMe) return

    const { data: settings } = await supabase
      .from('group_settings')
      .select('autoreact')
      .eq('group_jid', from)
      .single()

    if (!settings?.autoreact) return

    const messageText = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || 
                       msg.message?.imageMessage?.caption || 
                       msg.message?.videoMessage?.caption || ''

    if (!messageText) return

    const { data: keywords } = await supabase
      .from('autoreact_keywords')
      .select('keyword, emoji')
      .eq('group_jid', from)

    const textLower = messageText.toLowerCase()
    let reacted = false

    if (keywords && keywords.length > 0) {
      for (const item of keywords) {
        if (textLower.includes(item.keyword.toLowerCase())) {
          await sock.sendMessage(from, {
            react: { text: item.emoji, key: msg.key }
          })
          reacted = true
          break
        }
      }
    }

    if (!reacted) {
      const randomEmoji = RANDOM_EMOJIS[Math.floor(Math.random() * RANDOM_EMOJIS.length)]
      await sock.sendMessage(from, {
        react: { text: randomEmoji, key: msg.key }
      })
    }

  } catch (err) {
    console.log('[AUTOREACT ERROR]', err.message)
  }
}