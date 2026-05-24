// commands/group/hidetag.js
export const name = 'hidetag'
export const alias = ['ht', 'hidden', 'announce']
export const category = 'Group'
export const desc = 'Tag all members silently - no visible mentions'

export default async function hidetag(sock, { msg, from, args, isAdmin, isBotAdmin, isGroup }, botSettings) {
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

    // 4. Get message from args or quoted
    const customMessage = args.join(' ').trim()
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    let message = customMessage || quotedText || 'Group announcement!'

    const totalMembers = participants.length
    const BATCH_SIZE = 100 // Hidden tag can handle more
    const DELAY_MS = 2500 // 2.5 seconds between batches

    // 5. If members <= 100, send single hidden tag
    if (totalMembers <= BATCH_SIZE) {
      const mentions = participants.map(p => p.id)

      const finalMessage = `╭─⌈ 🍊 *SILENT ANNOUNCEMENT* ⌋
│
│ ${message}
│
│ *Delivered to: ${totalMembers} members*
│
╰⊷ Powered By Bunny Tech 🐰`

      await sock.sendMessage(from, {
        text: finalMessage,
        mentions: mentions
      }, { quoted: msg })

    } else {
      // 6. Large group: batch with delays - NO BAN
      const totalBatches = Math.ceil(totalMembers / BATCH_SIZE)
      
      await sock.sendMessage(from, {
        text: `> Silently notifying ${totalMembers} members in ${totalBatches} batches...\n> Time delay: ${DELAY_MS/1000}s per batch 🍊`
      }, { quoted: msg })

      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, totalMembers)
        const batch = participants.slice(start, end)
        const mentions = batch.map(p => p.id)

        const batchMessage = `╭─⌈ 🍊 *SILENT ANNOUNCEMENT* ⌋
│
│ ${message}
│
│ *Batch: ${i + 1}/${totalBatches}*
│ *Notified: ${start + 1}-${end} of ${totalMembers}*
│
╰⊷ Powered By Bunny Tech 🐰`

        await sock.sendMessage(from, {
          text: batchMessage,
          mentions: mentions
        }, { quoted: msg })

        // Delay between batches
        if (i < totalBatches - 1) {
          await new Promise(r => setTimeout(r, DELAY_MS))
        }
      }

      await sock.sendMessage(from, {
        text: `> Silently notified all ${totalMembers} members\n> No visible tags, all safe 🐰`
      }, { quoted: msg })
    }

    // 7. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[HIDETAG ERROR]', error.message)

    let errorMsg = '> Failed to send hidden tag'
    if (error.message.includes('rate-overlimit')) {
      errorMsg = '> WhatsApp rate limit hit. Wait 5 minutes 🍊'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}