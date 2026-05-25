// commands/sticker/q.js
import { jidNormalizedUser } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'

export const name = 'q'
export const alias = ['quote', 'quotely', 'qc']
export const category = 'Sticker'
export const desc = 'Create quote sticker from message - 2 API fallback'

// API LIST - 2 TOTAL 🦁
const QUOTE_APIS = [
  'https://bot.lyo.su/quote/generate',
  'https://api.quotly.dev/generate'
]

async function fetchQuoteBuffer(obj) {
  for (let i = 0; i < QUOTE_APIS.length; i++) {
    try {
      const res = await axios.post(QUOTE_APIS[i], obj, {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
        timeout: 12000
      })

      if (res.data && res.status === 200 && res.data.byteLength > 1000) {
        console.log(`Quote API ${i + 1} success`)
        return Buffer.from(res.data)
      }
    } catch (err) {
      console.log(`Quote API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Quote APIs failed')
}

export default async function q(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. GET QUOTED MESSAGE - VIEWONCE INCLUDED
    const context = msg.message?.extendedTextMessage?.contextInfo
    const quoted = context?.quotedMessage ||
                   context?.quotedMessage?.viewOnceMessageV2?.message ||
                   context?.quotedMessage?.viewOnceMessage?.message

    if (!quoted) {
      await sock.sendMessage(from, { react: { text: '💬', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ 💬 *Quote Sticker* ⌋
│ Create quote sticker from message
│
│ *Usage:*
│ Reply to any text message
│ ${prefix}q
│ ${prefix}quote
│
│ *Supports:*
│ • Text messages
│ • Image/video captions
│ • ViewOnce messages
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 2. REACT PROCESSING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 3. EXTRACT QUOTED DATA - MODERN WAY
    const quotedSender = jidNormalizedUser(context?.participant || context?.remoteJid || from)
    const quotedText = quoted.conversation ||
                      quoted.extendedTextMessage?.text ||
                      quoted.imageMessage?.caption ||
                      quoted.videoMessage?.caption ||
                      ''

    if (!quotedText.trim()) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *Error* ⌋
│ Quoted message has no text
│ Reply to a text message
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 4. GET PROFILE PIC - SAFE FALLBACK
    let ppUrl = 'https://i.ibb.co/2dH8p5Z/profile.jpg'
    try {
      ppUrl = await sock.profilePictureUrl(quotedSender, 'image')
    } catch {
      console.log(`No PP for ${quotedSender}, using default`)
    }

    // 5. GET NAME - MODERN WAY
    let displayName = quotedSender.split('@')[0]
    try {
      const contact = await sock.onWhatsApp(quotedSender)
      if (contact[0]?.notify) displayName = contact[0].notify
      else if (contact[0]?.name) displayName = contact[0].name
    } catch {
      console.log(`No name for ${quotedSender}`)
    }

    // 6. CREATE QUOTE PAYLOAD - RAM SAFE SIZES
    const obj = {
      type: 'quote',
      format: 'png',
      backgroundColor: '#1e1e1e',
      width: 512,
      height: 512, // Punguza kutoka 768 kuokoa RAM
      scale: 2,
      messages: [{
        entities: [],
        avatar: true,
        from: {
          id: 1,
          name: displayName.slice(0, 25), // Limit name length
          photo: { url: ppUrl }
        },
        text: quotedText.slice(0, 300), // Limit text 300 chars
        replyMessage: {}
      }]
    }

    // 7. GENERATE QUOTE IMAGE - 2 API FALLBACK
    const quoteBuffer = await fetchQuoteBuffer(obj)

    // 8. CONVERT TO STICKER - RAM SAFE
    const sticker = new Sticker(quoteBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['💬', '📝'],
      quality: 70, // Quality poa bila RAM kubwa
      id: Date.now().toString()
    })

    const stickerBuffer = await sticker.toBuffer()

    // 9. SEND STICKER
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 10. REACT DONE
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[Q ERROR]', error.message)
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
    await sock.sendMessage(from, {
      text: `╭─⌈ ❌ *Quote Failed* ⌋
│ ${error.message.includes('API')? 'All APIs are down' : 'Processing failed'}
│ Usage: ${prefix}q [reply message]
│ Aliases: ${prefix}quote, ${prefix}qc
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })
  }
}