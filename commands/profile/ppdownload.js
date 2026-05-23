// commands/profile/ppdownload.js
import { supabase } from '../../lib/supabase.js'

export const name = 'ppdownload'
export const alias = ['ppdl', 'getpp', 'savepp']
export const category = 'Profile'
export const desc = 'Downloads profile picture in HD or sends from history'

export default async function ppdownload(sock, { msg, from, args }, botSettings) {
  try {
    // 1. React first - BUNNY STYLE 📥
    await sock.sendMessage(from, {
      react: { text: '📥', key: msg.key }
    })

    // 2. Extract target - 4 super ways
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    const mentioned = quoted?.mentionedJid?.[0]
    const replied = quoted?.participant
    const textAfterCmd = args.join(' ').trim()

    let target = null

    // Way 1: Args - number direct (any country)
    if (textAfterCmd) {
      const cleanNum = textAfterCmd.replace(/[^0-9]/g, '')
      if (cleanNum.length >= 7 && cleanNum.length <= 15) {
        target = cleanNum + '@s.whatsapp.net'
      } else {
        throw new Error('INVALID_NUMBER')
      }
    }
    // Way 2: Mentioned user
    else if (mentioned) {
      target = mentioned
    }
    // Way 3: Replied user
    else if (replied) {
      target = replied
    }
    // Way 4: Sender default
    else {
      target = msg.key.participant || from
    }

    if (!target) throw new Error('NO_TARGET')

    // 3. Check if number exists on WhatsApp
    const [result] = await sock.onWhatsApp(target)
    if (!result?.exists) throw new Error('NOT_REGISTERED')

    target = result.jid
    const targetNumber = target.split('@')[0]

    // 4. Try get current PP HD
    let ppUrl = null
    let source = 'LIVE'
    
    try {
      ppUrl = await sock.profilePictureUrl(target, 'image')
    } catch (error) {
      if (error.output?.statusCode === 404) {
        // 5. Fallback: Get from Supabase history
        const { data: history, error: fetchError } = await supabase
       .from('profile_pictures')
       .select('pp_url, created_at')
       .eq('jid', target)
       .order('created_at', { ascending: false })
       .limit(1)
       .single()

        if (fetchError ||!history) throw new Error('NO_PP')
        
        ppUrl = history.pp_url
        source = 'HISTORY'
      } else if (error.output?.statusCode === 403) {
        throw new Error('PRIVATE')
      } else if (error.output?.statusCode === 401) {
        throw new Error('BLOCKED')
      } else {
        throw new Error('FETCH_FAILED')
      }
    }

    // 6. Save to DB if from live
    if (source === 'LIVE' && ppUrl) {
      const { error: insertError } = await supabase
     .from('profile_pictures')
     .insert({
          jid: target,
          number: targetNumber,
          pp_url: ppUrl
        })
      
      // Ignore duplicate error
      if (insertError && insertError.code!== '23505') {
        console.error('Supabase insert error:', insertError.message)
      }
    }

    // 7. Send PP
    const caption = 
`╭─⌈ 📥 *PP DOWNLOADED* ⌋
│ Number: +${targetNumber}
│ Quality: HD
│ Source: ${source}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

    await sock.sendMessage(from, {
      image: { url: ppUrl },
      caption: caption,
      mimetype: 'image/jpeg'
    }, { quoted: msg })

    // 8. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PPDOWNLOAD ERROR]', error)

    let errorMsg = '> Failed to download profile picture'
    
    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format. Use: countrycode + number'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = '> Could not identify target user'
    } else if (error.message === 'NOT_REGISTERED') {
      errorMsg = '> Number not registered on WhatsApp'
    } else if (error.message === 'NO_PP') {
      errorMsg = '> No profile picture found. User has no PP or history'
    } else if (error.message === 'PRIVATE') {
      errorMsg = '> Profile picture is private. Cannot download'
    } else if (error.message === 'BLOCKED') {
      errorMsg = '> Cannot access profile. You may be blocked'
    } else if (error.message === 'FETCH_FAILED') {
      errorMsg = '> Server timeout. Failed to fetch profile picture'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}