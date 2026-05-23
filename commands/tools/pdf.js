// commands/tools/pdftools.js
import axios from 'axios'

export const name = 'pdftools'
export const alias = ['pdf', 'pdfmerge', 'pdfsplit', 'pdfcompress', 'pdftools']
export const category = 'Tools'
export const desc = 'Merge, split, or compress PDF files'

export default async function pdftools(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Parse command and get PDF files
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedDoc = quoted?.documentMessage
    const messageDoc = msg.message?.documentMessage
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''

    const cmdText = args.join(' ').toLowerCase() || messageText.replace(new RegExp(`^\\${botSettings.prefix}pdf\\s*`, 'i'), '').toLowerCase()
    const action = cmdText.split(' ')[0] // merge, split, compress

    if (!action ||!['merge', 'split', 'compress'].includes(action)) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}pdf <action> [options]\n\n> *Actions:*\n> ${botSettings.prefix}pdf merge - Reply to 2+ PDFs\n> ${botSettings.prefix}pdf split 1-3 - Split pages 1 to 3\n> ${botSettings.prefix}pdf compress - Reduce file size\n\n> Reply to PDF or send with caption`
      }, { quoted: msg })
    }

    // 2. Get PDF files from quoted messages
    const getPdfBuffer = async (docMsg) => {
      if (!docMsg || docMsg.mimetype!== 'application/pdf') return null
      return await sock.downloadMediaMessage({ message: { documentMessage: docMsg } })
    }

    // 3. React first - BUNNY PDF MODE 📄
    await sock.sendMessage(from, {
      react: { text: '📄', key: msg.key }
    })

    let resultBuffer = null
    let resultName = 'output.pdf'
    let usedAPI = null

    // 4. ACTION: MERGE
    if (action === 'merge') {
      // Need multiple PDFs - check quoted messages
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo
      if (!quotedMsg?.quotedMessage) {
        return await sock.sendMessage(from, {
          text: '> Reply to multiple PDF messages to merge\n> Send PDFs together then reply with merge command'
        }, { quoted: msg })
      }

      const pdf1 = await getPdfBuffer(messageDoc)
      const pdf2 = await getPdfBuffer(quotedDoc)

      if (!pdf1 ||!pdf2) {
        return await sock.sendMessage(from, {
          text: '> Need at least 2 PDF files to merge'
        }, { quoted: msg })
      }

      // API 1: PDF.co
      try {
        const formData = new FormData()
        formData.append('file1', new Blob([pdf1], { type: 'application/pdf' }), 'file1.pdf')
        formData.append('file2', new Blob([pdf2], { type: 'application/pdf' }), 'file2.pdf')

        const response = await axios.post('https://api.pdf.co/v1/pdf/merge', formData, {
          timeout: 30000,
          responseType: 'arraybuffer'
        })

        resultBuffer = Buffer.from(response.data)
        resultName = 'merged.pdf'
        usedAPI = 'PDF.co'
      } catch (e) {
        console.log('[PDF] PDF.co merge failed:', e.message)
      }

      // API 2: ILovePDF Fallback
      if (!resultBuffer) {
        try {
          const formData = new FormData()
          formData.append('files', new Blob([pdf1], { type: 'application/pdf' }), 'file1.pdf')
          formData.append('files', new Blob([pdf2], { type: 'application/pdf' }), 'file2.pdf')

          const response = await axios.post('https://api.ilovepdf.com/v1/merge', formData, {
            timeout: 30000,
            responseType: 'arraybuffer'
          })

          resultBuffer = Buffer.from(response.data)
          resultName = 'merged.pdf'
          usedAPI = 'ILovePDF'
        } catch (e) {
          console.log('[PDF] ILovePDF merge failed:', e.message)
        }
      }
    }

    // 5. ACTION: SPLIT
    if (action === 'split') {
      const pdfBuffer = await getPdfBuffer(messageDoc || quotedDoc)
      if (!pdfBuffer) {
        return await sock.sendMessage(from, {
          text: '> Reply to a PDF file to split'
        }, { quoted: msg })
      }

      // Get page range from command
      const pages = cmdText.split(' ')[1] || '1-1' // default first page

      try {
        const formData = new FormData()
        formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'input.pdf')
        formData.append('pages', pages)

        const response = await axios.post('https://api.pdf.co/v1/pdf/split', formData, {
          timeout: 30000,
          responseType: 'arraybuffer'
        })

        resultBuffer = Buffer.from(response.data)
        resultName = `split_${pages}.pdf`
        usedAPI = 'PDF.co'
      } catch (e) {
        console.log('[PDF] Split failed:', e.message)
      }
    }

    // 6. ACTION: COMPRESS
    if (action === 'compress') {
      const pdfBuffer = await getPdfBuffer(messageDoc || quotedDoc)
      if (!pdfBuffer) {
        return await sock.sendMessage(from, {
          text: '> Reply to a PDF file to compress'
        }, { quoted: msg })
      }

      // API 1: PDF.co Compress
      try {
        const formData = new FormData()
        formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'input.pdf')

        const response = await axios.post('https://api.pdf.co/v1/pdf/optimize', formData, {
          timeout: 30000,
          responseType: 'arraybuffer'
        })

        resultBuffer = Buffer.from(response.data)
        resultName = 'compressed.pdf'
        usedAPI = 'PDF.co'
      } catch (e) {
        console.log('[PDF] PDF.co compress failed:', e.message)
      }

      // API 2: ILovePDF Compress
      if (!resultBuffer) {
        try {
          const formData = new FormData()
          formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'input.pdf')

          const response = await axios.post('https://api.ilovepdf.com/v1/compress', formData, {
            timeout: 30000,
            responseType: 'arraybuffer'
          })

          resultBuffer = Buffer.from(response.data)
          resultName = 'compressed.pdf'
          usedAPI = 'ILovePDF'
        } catch (e) {
          console.log('[PDF] ILovePDF compress failed:', e.message)
        }
      }
    }

    if (!resultBuffer) {
      throw new Error('All PDF services failed')
    }

    // 7. Calculate file size
    const fileSizeMB = (resultBuffer.length / 1024 / 1024).toFixed(2)

    // 8. Build caption - SIMPLE & CLEAN
    let caption = `╭─⌈ 📄 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *PDF Tools*
│
│ 🔧 *Action:* ${action.charAt(0).toUpperCase() + action.slice(1)}
│ 📦 *File:* ${resultName}
│ 📊 *Size:* ${fileSizeMB} MB
│ 📡 *API:* ${usedAPI}
│
│ ✅ *Status:* Processed Successfully
│
╰⊷ *Powered By Bunny Tech*`

    // 9. Send PDF file
    await sock.sendMessage(from, {
      document: resultBuffer,
      mimetype: 'application/pdf',
      fileName: resultName,
      caption: caption
    }, { quoted: msg })

    // 10. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PDF ERROR]', error.message)

    let errorMsg = '> Failed to process PDF'
    if (error.message.includes('All PDF services failed')) {
      errorMsg = '> All services failed. Try again later'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. PDF may be too large'
    } else if (error.message.includes('No PDF')) {
      errorMsg = '> No PDF file found. Reply to PDF'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}