// commands/sticker/q.js
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'

export const name = 'q'
export const alias = ['quote', 'quotely']
export const category = 'Sticker'
export const desc = 'Create quote sticker from message'

export default async function q(sock, { msg, from, sender }, botSettings) {
  try {
    // 1. Get quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    
    if (!quoted?.quotedMessage) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return
    }

    // 2. React processing
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key }
    })

    // 3. Get quoted data
    const quotedMsg = quoted.quotedMessage
    const quotedSender = quoted.participant || quoted.remoteJid
    const quotedText = quotedMsg.conversation || 
                      quotedMsg.extendedTextMessage?.text || 
                      quotedMsg.imageMessage?.caption || 
                      quotedMsg.videoMessage?.caption || 
                      ''

    if (!quotedText) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: msg.key }
      })
      return
    }

    // 4. Get profile pic
    let ppUrl
    try {
      ppUrl = await sock.profilePictureUrl(quotedSender, 'image')
    } catch {
      ppUrl = 'https://i.ibb.co/2dH8p5Z/profile.jpg' // default
    }

    // 5. Get name
    const name = await sock.getName(quotedSender)
    const displayName = name || quotedSender.split('@')[0]

    // 6. Create quote using API
    const obj = {
      type: 'quote',
      format: 'png',
      backgroundColor: '#1e1e1e',
      width: 512,
      height: 768,
      scale: 2,
      messages: [{
        entities: [],
        avatar: true,
        from: {
          id: 1,
          name: displayName,
          photo: { url: ppUrl }
        },
        text: quotedText,
        replyMessage: {}
      }]
    }

    const response = await axios.post('https://bot.lyo.su/quote/generate', obj, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'arraybuffer'
    })

    const quoteBuffer = Buffer.from(response.data)

    // 7. Convert to sticker
    const sticker = new Sticker(quoteBuffer, {
      pack: 'BUNNY-MD',
      author: 'Lupin Starnley',
      type: StickerTypes.FULL,
      categories: ['🤖'],
      quality: 50
    })

    const stickerBuffer = await sticker.toBuffer()

    // 8. Send sticker
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    }, { quoted: msg })

    // 9. React done
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[Q ERROR]', error.message)
    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key }
    })
  }
}