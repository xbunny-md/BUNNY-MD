// commands/Profile/vv.js
import { downloadContentFromMessage, getContentType } from '@whiskeysockets/baileys'

export const name = 'vv'
export const alias = ['viewonce', 'reveal', 'once', 'rvo', 'unlock']
export const category = 'Profile'
export const desc = 'Reveal viewonce image/video/audio - 100% working'

export default async function vv(sock, { msg, from }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. REACT FIRST
    await sock.sendMessage(from, {
      react: { text: '👀', key: msg.key }
    })

    // 2. GET QUOTED MESSAGE
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *No Reply* ⌋
│ Reply to a viewonce message!
│
│ *Usage:* ${prefix}vv
│ *Works:* Image, Video, Audio
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 3. SHIKA VIEWONCE V1 NA V2 ZOTE - HII NDIO FIX KUU
    let viewOnce = quoted?.viewOnceMessageV2?.message || quoted?.viewOnceMessage?.message

    if (!viewOnce) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *Not ViewOnce* ⌋
│ That's not a viewonce message!
│ Reply to viewonce image/video/audio only
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 4. GET TYPE NA MEDIA OBJECT - TUMIA getContentType
    const type = getContentType(viewOnce)
    const media = viewOnce[type]

    // 5. CHECK KAMA NI VIEWONCE NA SUPPORTED - HII NDIO KEY
    const supportedTypes = ['imageMessage', 'videoMessage', 'audioMessage']
    if (!type || !supportedTypes.includes(type) || !media?.viewOnce) {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      return await sock.sendMessage(from, {
        text: `╭─⌈ ❌ *Invalid Media* ⌋
│ Only Image, Video, Audio viewonce
│ Found: ${type || 'unknown'}
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 6. DOWNLOAD KULINGANA NA TYPE - STREAM METHOD
    let mediaType = 'image'
    if (type === 'videoMessage') mediaType = 'video'
    if (type === 'audioMessage') mediaType = 'audio'

    const stream = await downloadContentFromMessage(media, mediaType)
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }

    if (!buffer || buffer.length === 0) throw new Error('DOWNLOAD_FAILED')

    // 7. SEND BASED ON TYPE
    const caption = media?.caption || ''
    const finalCaption = caption? `> 👁️ ViewOnce Revealed\n> Caption: ${caption}` : `> 👁️ ViewOnce Revealed\n> By: ${botSettings.botname || 'BUNNY MD'}`

    if (type === 'imageMessage') {
      await sock.sendMessage(from, {
        image: buffer,
        caption: finalCaption
      }, { quoted: msg })

    } else if (type === 'videoMessage') {
      await sock.sendMessage(from, {
        video: buffer,
        caption: finalCaption
      }, { quoted: msg })

    } else if (type === 'audioMessage') {
      await sock.sendMessage(from, {
        audio: buffer,
        ptt: media.ptt || false,
        mimetype: 'audio/mpeg'
      }, { quoted: msg })
    }

    // 8. REACT DONE
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    })

  } catch (error) {
    console.error('[VV ERROR]', error.message)

    let errorMsg = '> ❌ Failed to reveal viewonce'

    if (error.message === 'DOWNLOAD_FAILED') {
      errorMsg = `╭─⌈ ❌ *Download Failed* ⌋
│ Media expired or deleted
│ ViewOnce already opened
╰⊷ *Powered By Bunny Tech*`
    } else if (error.message.includes('decrypt')) {
      errorMsg = `╭─⌈ ❌ *Cannot Decrypt* ⌋
│ ViewOnce already opened
│ Or media expired
╰⊷ *Powered By Bunny Tech*`
    } else {
      errorMsg = `╭─⌈ ❌ *Error* ⌋
│ Reply to viewonce message
│ Usage: ${prefix}vv
╰⊷ *Powered By Bunny Tech*`
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}