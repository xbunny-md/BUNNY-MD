// commands/group/pollgc.js
// Super clean - no file, no db, no RAM usage
// Create polls in group using WhatsApp native polls

export const name = 'pollgc'
export const alias = ['poll', 'createpoll']
export const category = 'Group'
export const desc = 'Create a poll in group'

export default async function pollgc(sock, { msg, from, isGroup, args, sender }) {
  try {
    // 1. Group check
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups'
      }, { quoted: msg })
    }

    // 2. React 🐦‍🔥
    await sock.sendMessage(from, {
      react: { text: '🐦‍🔥', key: msg.key }
    })

    // 3. Check args
    if (!args.length) {
      return await sock.sendMessage(from, {
        text: `╭─⌈ 📊 *POLL USAGE* ⌋
│
│ *Format:*.poll Question | Option1 | Option2 | Option3
│ *Example:*.poll Best color? | Red | Blue | Green
│
│ *Rules:*
│ ✦ Use | to separate question and options
│ ✦ Min 2 options, Max 12 options
│ ✦ Max 255 chars per option
│
╰⊷ *Powered By Bunny Tech*`
      }, { quoted: msg })
    }

    // 4. Parse poll data
    const pollData = args.join(' ').split('|').map(v => v.trim())

    if (pollData.length < 3) {
      return await sock.sendMessage(from, {
        text: '> Invalid format. Need: Question | Option1 | Option2'
      }, { quoted: msg })
    }

    const question = pollData[0]
    const options = pollData.slice(1)

    // 5. Validate options
    if (options.length < 2) {
      return await sock.sendMessage(from, {
        text: '> Minimum 2 options required'
      }, { quoted: msg })
    }

    if (options.length > 12) {
      return await sock.sendMessage(from, {
        text: '> Maximum 12 options allowed'
      }, { quoted: msg })
    }

    // Check option length
    for (const option of options) {
      if (option.length > 255) {
        return await sock.sendMessage(from, {
          text: '> Each option max 255 characters'
        }, { quoted: msg })
      }
      if (!option) {
        return await sock.sendMessage(from, {
          text: '> Options cannot be empty'
        }, { quoted: msg })
      }
    }

    // 6. Create poll
    await sock.sendMessage(from, {
      poll: {
        name: question,
        values: options,
        selectableCount: 1 // Single choice
      },
      mentions: [sender]
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[POLLGC ERROR]', error.message)

    let errorMsg = '> Failed to create poll'
    if (error.message.includes('invalid')) {
      errorMsg = '> Invalid poll format'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}