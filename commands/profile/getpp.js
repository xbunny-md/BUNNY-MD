// commands/profile/getpp.js
export const name = 'getpp'
export const alias = ['pp', 'getdp', 'dp', 'getprofile']
export const category = 'Profile'
export const desc = 'Gets profile picture - supports multiple tags/numbers'

export default async function getpp(sock, { msg, from, args }, botSettings) {
  const prefix = botSettings.prefix

  try {
    // 1. REACT FIRST
    await sock.sendMessage(from, {
      react: { text: '🤘', key: msg.key }
    })

    // 2. EXTRACT ALL TARGETS - MULTIPLE WAYS
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    const mentioned = quoted?.mentionedJid || [] // ARRAY - HII NDIO IDEA
    const replied = quoted?.participant
    const textArgs = args.filter(a => /^[0-9+]+$/.test(a)) // Numbers tu

    let targets = []

    // Way 1: Multiple mentioned users
    if (mentioned.length > 0) {
      targets.push(...mentioned)
    }
    // Way 2: Replied user
    else if (replied) {
      targets.push(replied)
    }
    // Way 3: Multiple numbers in args
    else if (textArgs.length > 0) {
      for (const num of textArgs) {
        const cleanNum = num.replace(/[^0-9]/g, '')
        if (cleanNum.length >= 7 && cleanNum.length <= 15) {
          targets.push(cleanNum + '@s.whatsapp.net')
        }
      }
    }
    // Way 4: Sender default
    else {
      targets.push(msg.key.participant || msg.key.remoteJid)
    }

    if (targets.length === 0) throw new Error('NO_TARGET')

    // 3. LIMIT TO 5 TARGETS - RAM SAFE
    if (targets.length > 5) {
      await sock.sendMessage(from, {
        text: `> ⚠️ Too many targets\n> Max 5 users at once\n> Processing first 5 only`
      }, { quoted: msg })
      targets = targets.slice(0, 5)
    }

    // 4. PROCESS EACH TARGET
    let successCount = 0
    for (let i = 0; i < targets.length; i++) {
      const targetJid = targets[i]

      try {
        // FIX: CHECK EXISTS & GET CORRECT JID - SOLVES LID/JID ISSUE
        const [result] = await sock.onWhatsApp(targetJid)
        if (!result?.exists) {
          await sock.sendMessage(from, {
            text: `> ❌ User ${i + 1}: ${targetJid.split('@')[0]}\n> Not registered on WhatsApp`
          }, { quoted: msg })
          continue
        }

        // IMPORTANT: Use the JID returned by onWhatsApp - this is the correct one
        const correctJid = result.jid

        // 5. GET PROFILE PICTURE
        let ppUrl
        try {
          ppUrl = await sock.profilePictureUrl(correctJid, 'image')
        } catch (error) {
          if (error.output?.statusCode === 404) {
            await sock.sendMessage(from, {
              text: `> 📭 User: +${correctJid.split('@')[0]}\n> No profile picture`
            }, { quoted: msg })
          } else if (error.output?.statusCode === 403) {
            await sock.sendMessage(from, {
              text: `> 🔒 User: +${correctJid.split('@')[0]}\n> Picture hidden by privacy`
            }, { quoted: msg })
          } else if (error.output?.statusCode === 401) {
            await sock.sendMessage(from, {
              text: `> 🚫 User: +${correctJid.split('@')[0]}\n> You may be blocked`
            }, { quoted: msg })
          }
          continue
        }

        if (!ppUrl) continue

        const targetNumber = correctJid.split('@')[0]

        const ppPayload =
`╭─⌈ 🖼️ *PROFILE PICTURE* ⌋
│ Number: +${targetNumber}
╰⊷ *${botSettings.botname || 'BUNNY MD'}*`

        // 6. SEND IMAGE
        await sock.sendMessage(from, {
          image: { url: ppUrl },
          caption: ppPayload,
          mentions: [correctJid]
        }, { quoted: msg })

        successCount++

        // Rate limit between sends
        if (i < targets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (err) {
        console.log(`Failed for ${targetJid}: ${err.message}`)
        continue
      }
    }

    // 7. REACT DONE
    if (successCount > 0) {
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
    } else {
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
      await sock.sendMessage(from, {
        text: `> ❌ Failed to fetch any profile pictures\n> Check numbers or privacy settings\n> Usage: ${prefix}getpp @user1 @user2`
      }, { quoted: msg })
    }

  } catch (error) {
    console.error('[GETPP ERROR]', error.message)

    let errorMsg = '> Failed to fetch profile picture'

    if (error.message === 'INVALID_NUMBER') {
      errorMsg = '> Invalid number format\n> Use: countrycode + number\n> Example: 14155552671'
    } else if (error.message === 'NO_TARGET') {
      errorMsg = '> Could not identify target user\n> Tag, reply, or provide number'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}