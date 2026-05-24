// commands/group/tagall.js
export const name = 'tagall'
export const alias = ['all', 'everyone', 'mentionall']
export const category = 'Group'
export const desc = 'Tag all group members safely - 1000+ supported'

export default async function tagall(sock, { msg, from, args, isAdmin, isBotAdmin, isGroup }, botSettings) {
  try {
    // 1. Group check
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: '> This command only works in groups 🐰'
      }, { quoted: msg })
    }

    // 2. Admin check
    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: '> Admin only command 🔒'
      }, { quoted: msg })
    }

    // 3. React 🍊
    await sock.sendMessage(from, {
      react: { text: '🍊', key: msg.key }
    })

    const groupMetadata = await sock.groupMetadata(from)
    const participants = groupMetadata.participants

    if (participants.length === 0) {
      return await sock.sendMessage(from, {
        text: '> No members found in this group 🍊'
      }, { quoted: msg })
    }

    // 4. Get message from args or use default
    const customMessage = args.join(' ').trim()
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    let message = customMessage || quotedText || 'Attention everyone!'

    const totalMembers = participants.length
    const BATCH_SIZE = 80 // Safe for WhatsApp - no ban
    const DELAY_MS = 3000 // 3 seconds between batches

    // 5. If members <= 80, send single box with all tags
    if (totalMembers <= BATCH_SIZE) {
      const mentions = participants.map(p => p.id)
      let mentionList = ''
      participants.forEach(user => {
        mentionList += `│ ❁ @${user.id.split('@')[0]}\n`
      })

      const finalMessage = `╭─⌈ 🍊 *GROUP ANNOUNCEMENT* ⌋
│
│ ${message}
│
│ *Total Members: ${totalMembers}*
│
├─⌈ 📢 *TAGGED MEMBERS* ⌋
│
${mentionList}│
╰⊷ Powered By Bunny Tech 🐰`

      await sock.sendMessage(from, {
        text: finalMessage,
        mentions: mentions
      }, { quoted: msg })

    } else {
      // 6. Large group: split into batches with delays - ALL INSIDE BOX
      const totalBatches = Math.ceil(totalMembers / BATCH_SIZE)
      
      await sock.sendMessage(from, {
        text: `> Tagging ${totalMembers} members in ${totalBatches} batches...\n> Time delay: ${DELAY_MS/1000}s per batch for safety 🍊`
      }, { quoted: msg })

      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, totalMembers)
        const batch = participants.slice(start, end)
        const mentions = batch.map(p => p.id)

        let mentionList = ''
        batch.forEach(user => {
          mentionList += `│ ❁ @${user.id.split('@')[0]}\n`
        })

        const batchMessage = `╭─⌈ 🍊 *GROUP ANNOUNCEMENT* ⌋
│
│ ${message}
│
│ *Batch: ${i + 1}/${totalBatches}*
│ *Members: ${start + 1}-${end} of ${totalMembers}*
│
├─⌈ 📢 *TAGGED MEMBERS* ⌋
│
${mentionList}│
╰⊷ Powered By Bunny Tech 🐰`

        await sock.sendMessage(from, {
          text: batchMessage,
          mentions: mentions
        }, { quoted: msg })

        // Delay between batches to avoid ban
        if (i < totalBatches - 1) {
          await new Promise(r => setTimeout(r, DELAY_MS))
        }
      }

      await sock.sendMessage(from, {
        text: `> Tagged all ${totalMembers} members successfully\n> No bans, all safe 🐰`
      }, { quoted: msg })
    }

    // 7. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[TAGALL ERROR]', error.message)

    let errorMsg = '> Failed to tag all members'
    if (error.message.includes('rate-overlimit')) {
      errorMsg = '> WhatsApp rate limit hit. Wait 5 minutes 🍊'
    } else if (error.message.includes('forbidden')) {
      errorMsg = '> Bot needs admin to tag members 🍊'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}