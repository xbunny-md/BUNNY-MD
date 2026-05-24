// observers/autoreply.js
import { supabase } from '../lib/supabase.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'

const COOLDOWN_MS = 8000
const TYPING_SPEED_MS = 500
const MAX_WORDS = 8
const IGNORE_CHANCE = 0.03
const TYPO_CHANCE = 0.15
const CONTEXT_LIMIT = 10

export default async function autoreply(sock, { msg, from, sender, isGroup }, botSettings) {
  try {
    if (isGroup || msg.key.fromMe) return

    const userJid = sender

    // 1. CHECK IF USER IS ACTIVE
    const { data: activeUser } = await supabase
    .from('autoreply_active')
    .select('*')
    .eq('user_jid', userJid)
    .eq('is_active', true)
    .maybeSingle()

    if (!activeUser) return

    // 2. COOLDOWN CHECK
    const lastReply = activeUser.last_reply_at? new Date(activeUser.last_reply_at).getTime() : 0
    if (Date.now() - lastReply < COOLDOWN_MS) return

    // 3. RANDOM IGNORE CHANCE
    if (Math.random() < IGNORE_CHANCE) return

    // 4. PARSE MESSAGE CONTENT
    const msgType = Object.keys(msg.message)[0]
    let userContent = msg.message.conversation ||
                      msg.message.extendedTextMessage?.text ||
                      msg.message.imageMessage?.caption ||
                      msg.message.videoMessage?.caption || ''

    // Handle Media Types
    if (msgType === 'stickerMessage') userContent = '[Sticker]'
    if (msgType === 'imageMessage' &&!userContent) userContent = '[Image]'
    if (msgType === 'audioMessage') userContent = '[Voice Note]'
    if (msgType === 'videoMessage' &&!userContent) userContent = '[Video]'
    if (msgType === 'documentMessage') userContent = '[Document]'
    if (!userContent) userContent = '[Media]'

    // 5. LOG USER MESSAGE
    await supabase.from('message_logs').insert({
      user_jid: userJid,
      is_from_user: true,
      message_type: msgType,
      content: userContent
    })

    // 6. FETCH LAST 10 MESSAGES FOR CONTEXT
    const { data: history } = await supabase
    .from('message_logs')
    .select('content, is_from_user')
    .eq('user_jid', userJid)
    .order('timestamp', { ascending: false })
    .limit(CONTEXT_LIMIT)

    const contextMessages = history?.reverse().map(h =>
      `${h.is_from_user? 'User' : 'You'}: ${h.content}`
    ).join('\n') || 'New conversation'

    // 7. SHOW TYPING + RANDOM DELAY
    await sock.sendPresenceUpdate('composing', from)
    const randomDelay = 3000 + Math.random() * 12000
    await new Promise(r => setTimeout(r, randomDelay))

    // 8. BUILD SYSTEM PROMPT - UPDATED WITH RESTRICTIONS
    const systemPrompt = `You are Lupin Starnley. Reply to DMs as him.
Rules:
1. Max 8 words. Street language Tanzania
2. Detect user language from last 10 messages + current msg. Reply in SAME language
3. Intentional typos sometimes: niko->nko, sawa->xawa
4. If you don't know, ask question to make user explain more
5. Never say you are AI or bot
6. Never mention AI, models, language models, assistant, GPT, Gemini, Claude, Llama, or anything related. You are Lupin Starnley, a real person
7. Use 1 emoji max at end sometimes
8. Context: {last 10 messages}
Reply to this: {user message}`

    const fullPrompt = systemPrompt
    .replace('{last 10 messages}', contextMessages)
    .replace('{user message}', userContent)

    // 9. GET ACTIVE AI KEY WITH FALLBACK
    let aiReply = null
    const { data: apiKeys } = await supabase
    .from('ai_api_keys')
    .select('*')
    .eq('is_active', true)
    .or('rate_limit_until.is.null,rate_limit_until.lt.now()')
    .lte('error_count', 4)
    .order('priority', { ascending: true })

    if (!apiKeys || apiKeys.length === 0) {
      aiReply = "nko busy"
    } else {
      for (const key of apiKeys) {
        try {
          aiReply = await callAIProvider(key.provider, key.api_key, fullPrompt)

          // Update success
          await supabase
          .from('ai_api_keys')
          .update({
              last_used: new Date().toISOString(),
              error_count: 0
            })
          .eq('id', key.id)

          break
        } catch (err) {
          // Update error count and disable if too many errors
          const newErrorCount = key.error_count + 1
          const isRateLimit = err.message.toLowerCase().includes('rate limit') || err.message.includes('429')

          await supabase
          .from('ai_api_keys')
          .update({
              error_count: newErrorCount,
              is_active: newErrorCount > 4? false : true,
              rate_limit_until: isRateLimit? new Date(Date.now() + 3600000).toISOString() : null
            })
          .eq('id', key.id)

          console.log(`[API FAIL ${key.provider}]`, err.message)
          continue
        }
      }
    }

    if (!aiReply) aiReply = "network mbaya"

    // 10. APPLY TYPO + WORD LIMIT
    if (Math.random() < TYPO_CHANCE) {
      aiReply = aiReply
      .replace(/\bniko\b/gi, 'nko')
      .replace(/\bsawa\b/gi, 'xawa')
      .replace(/\bhivi\b/gi, 'hvi')
      .replace(/\bkwenye\b/gi, 'kwnye')
      .replace(/\bnafanya\b/gi, 'nafnya')
    }

    const words = aiReply.split(' ').filter(w => w.length > 0)
    if (words.length > MAX_WORDS) {
      aiReply = words.slice(0, MAX_WORDS).join(' ')
    }

    // 11. TYPING TIME BASED ON LENGTH
    const typingTime = words.length * TYPING_SPEED_MS
    await sock.sendPresenceUpdate('composing', from)
    await new Promise(r => setTimeout(r, typingTime))

    // 12. SEND REPLY
    await sock.sendMessage(from, { text: aiReply })

    // 13. UPDATE STATS
    await supabase.from('autoreply_active').update({
      last_reply_at: new Date().toISOString(),
      reply_count: activeUser.reply_count + 1
    }).eq('user_jid', userJid)

    await supabase.from('message_logs').insert({
      user_jid: userJid,
      is_from_user: false,
      message_type: 'text',
      content: aiReply
    })

  } catch (err) {
    console.log('[AUTOREPLY ERROR]', err.message)
  }
}

// REAL API CALLS FOR ALL PROVIDERS
async function callAIProvider(provider, apiKey, prompt) {
  try {
    // 1. GEMINI
    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 60,
            temperature: 0.9,
            stopSequences: ["\n"]
          }
        })
      })
      if (!res.ok) throw new Error(`Gemini ${res.status}`)
      const data = await res.json()
      return data.candidates[0].content.parts[0].text.trim()
    }

    // 2. GROQ - LLAMA3
    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 30,
          temperature: 0.9,
          stop: ["\n"]
        })
      })
      if (!res.ok) throw new Error(`Groq ${res.status}`)
      const data = await res.json()
      return data.choices[0].message.content.trim()
    }

    // 3. CELEBRAS - LLAMA
    if (provider === 'celebras') {
      const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3.1-8b',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 30,
          temperature: 0.9,
          stop: ["\n"]
        })
      })
      if (!res.ok) throw new Error(`Celebras ${res.status}`)
      const data = await res.json()
      return data.choices[0].message.content.trim()
    }

    // 4. OPENAI
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 30,
          temperature: 0.9
        })
      })
      if (!res.ok) throw new Error(`OpenAI ${res.status}`)
      const data = await res.json()
      return data.choices[0].message.content.trim()
    }

    // 5. GROK
    if (provider === 'grok') {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 30,
          temperature: 0.9
        })
      })
      if (!res.ok) throw new Error(`Grok ${res.status}`)
      const data = await res.json()
      return data.choices[0].message.content.trim()
    }

    // 6. CLAUDE
    if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 30,
          temperature: 0.9,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      if (!res.ok) throw new Error(`Claude ${res.status}`)
      const data = await res.json()
      return data.content[0].text.trim()
    }

    throw new Error(`Provider ${provider} not supported`)

  } catch (err) {
    throw err
  }
}