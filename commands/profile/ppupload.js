// commands/profile/ppupload.js
import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { supabase } from '../../lib/supabase.js'

export const name = 'ppupload'
export const alias = ['setpp', 'uploadpp', 'changepp']
export const category = 'Profile'
export const desc = 'Uploads/changes bot profile picture'

export default async function ppupload(sock, { msg, from, sender }, botSettings) {
  try {
    // 1. OWNER CHECK - BOT NUMBER ONLY
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'
    if (sender!== botNumber) {
      return await sock.sendMessage(from, { 
        text: '> Access Denied. Only the bot owner can change bot PP.' 
      }, { quoted: msg })
    }

    // 2. React first - BUNNY STYLE 📤
    await sock.sendMessage(from, {
      react: { text: '📤', key: msg.key }
    })

    // 3. Get image from reply or sent with command
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const imageMsg = quoted?.imageMessage || msg.message?.imageMessage
    
    if (!imageMsg) {
      throw new Error('NO_IMAGE')
    }

    // 4. Download image buffer
    const stream = await downloadContentFromMessage(imageMsg, 'image')
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }

    if (buffer.length === 0) throw new Error('EMPTY_BUFFER')

    // 5. Validate size - WA limit ~5MB
    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error('TOO_LARGE')
    }

    // 6. Upload PP
    await sock.updateProfilePicture(botNumber, buffer)

    // 7. Get new PP URL and save to DB
    const newPP = await sock.profilePictureUrl(botNumber, 'image')
    const botNum = botNumber.split('@')[0]
    
    const { error: insertError } = await supabase
  .from('profile_pictures')
  .insert({
        jid: botNumber,
        number: botNum,
        pp_url: newPP
      })
    
    // Ignore duplicate error
    if (insertError && insertError.code!== '23505') {
      console.error('Supabase insert error:', insertError.message)
    }

    const successPayload = 
`╭─⌈ 📤 *PP UPDATED* ⌋
│ Bot profile picture changed
│ Size: ${(buffer.length / 1024).toFixed(2)} KB
│ Status: Success
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, { 
      text: successPayload 
    }, { quoted: msg })

    // 8. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PPUPLOAD ERROR]', error)

    let errorMsg = '> Failed to upload profile picture'
    
    if (error.message === 'NO_IMAGE') {
      errorMsg = `> Reply to an image or send image with caption: ${botSettings.prefix}ppupload`
    } else if (error.message === 'EMPTY_BUFFER') {
      errorMsg = '> Failed to download image. Try again'
    } else if (error.message === 'TOO_LARGE') {
      errorMsg = '> Image too large. Max 5MB allowed'
    } else if (error.output?.statusCode === 400) {
      errorMsg = '> Invalid image format. Use JPG/PNG'
    } else if (error.output?.statusCode === 401) {
      errorMsg = '> Unauthorized. Cannot modify profile'
    } else if (error.output?.statusCode === 500) {
      errorMsg = '> Server error. Try again later'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}