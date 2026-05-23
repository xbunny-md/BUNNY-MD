// commands/tools/timestamp.js
export const name = 'timestamp'
export const alias = ['time', 'unix', 'date', 'epoch']
export const category = 'Tools'
export const desc = 'Convert Unix timestamp to human date or vice versa'

export default async function timestamp(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract input from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(new RegExp(`^\\${botSettings.prefix}timestamp\\s*`, 'i'), '').replace(new RegExp(`^\\${botSettings.prefix}time\\s*`, 'i'), '') || quotedText

    // 2. React first - BUNNY TIME MODE ⏰
    await sock.sendMessage(from, {
      react: { text: '⏰', key: msg.key }
    })

    let result = null
    let mode = null

    // 3. If no input, return current timestamp
    if (!input || input.trim() === '' || input.trim() === 'now' || input.trim() === 'current') {
      const now = Date.now()
      const unixSeconds = Math.floor(now / 1000)
      const unixMillis = now
      const date = new Date(now)

      result = {
        unix: unixSeconds,
        unixMs: unixMillis,
        utc: date.toUTCString(),
        local: date.toLocaleString('en-US', { 
          timeZone: 'Africa/Nairobi',
          dateStyle: 'full',
          timeStyle: 'medium'
        }),
        iso: date.toISOString(),
        relative: 'Now'
      }
      mode = 'current'
    }
    // 4. If input is number, treat as Unix timestamp
    else if (/^\d{10,13}$/.test(input.trim())) {
      const timestamp = parseInt(input.trim())
      const ms = timestamp.toString().length === 10? timestamp * 1000 : timestamp
      const date = new Date(ms)

      if (isNaN(date.getTime())) {
        throw new Error('Invalid timestamp')
      }

      const now = Date.now()
      const diff = now - ms
      const relative = getRelativeTime(diff)

      result = {
        unix: Math.floor(ms / 1000),
        unixMs: ms,
        utc: date.toUTCString(),
        local: date.toLocaleString('en-US', { 
          timeZone: 'Africa/Nairobi',
          dateStyle: 'full',
          timeStyle: 'medium'
        }),
        iso: date.toISOString(),
        relative: relative
      }
      mode = 'unix'
    }
    // 5. If input is date string, convert to Unix
    else {
      const date = new Date(input.trim())
      
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format')
      }

      const ms = date.getTime()
      const now = Date.now()
      const diff = now - ms
      const relative = getRelativeTime(diff)

      result = {
        unix: Math.floor(ms / 1000),
        unixMs: ms,
        utc: date.toUTCString(),
        local: date.toLocaleString('en-US', { 
          timeZone: 'Africa/Nairobi',
          dateStyle: 'full',
          timeStyle: 'medium'
        }),
        iso: date.toISOString(),
        relative: relative
      }
      mode = 'date'
    }

    // 6. Build caption - SIMPLE & CLEAN
    let caption = `╭─⌈ ⏰ *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Timestamp Converter*
│
│ 🔢 *Unix:* ${result.unix}
│ 💾 *Unix MS:* ${result.unixMs}
│
│ 🌍 *UTC:* ${result.utc}
│ 📍 *Local:* ${result.local}
│ 📅 *ISO:* ${result.iso}
│
│ ⏱️ *Relative:* ${result.relative}
│
│ ✅ *Status:* Converted Successfully
│
╰⊷ *Powered By Bunny Tech*`

    // 7. Send result
    await sock.sendMessage(from, {
      text: caption
    }, { quoted: msg })

    // 8. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[TIMESTAMP ERROR]', error.message)

    let errorMsg = '> Failed to convert timestamp'
    if (error.message.includes('Invalid timestamp')) {
      errorMsg = '> Invalid Unix timestamp. Use 10 or 13 digits'
    } else if (error.message.includes('Invalid date')) {
      errorMsg = '> Invalid date format. Use: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}

// Helper function for relative time
function getRelativeTime(diff) {
  const seconds = Math.floor(Math.abs(diff) / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  const future = diff < 0? 'in ' : ''
  const past = diff > 0? ' ago' : ''

  if (years > 0) return `${future}${years} year${years > 1? 's' : ''}${past}`
  if (months > 0) return `${future}${months} month${months > 1? 's' : ''}${past}`
  if (days > 0) return `${future}${days} day${days > 1? 's' : ''}${past}`
  if (hours > 0) return `${future}${hours} hour${hours > 1? 's' : ''}${past}`
  if (minutes > 0) return `${future}${minutes} minute${minutes > 1? 's' : ''}${past}`
  return `${future}${seconds} second${seconds !== 1? 's' : ''}${past}`
}