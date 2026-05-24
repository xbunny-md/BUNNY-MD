// lib/upload.js
import axios from 'axios'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'

// IMGBB with auto-delete after 10 minutes
async function uploadImgBB(buffer) {
  if (!process.env.IMGBB_API) throw new Error('IMGBB_API missing')
  
  const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
  const base64 = buffer.toString('base64')
  
  const form = new FormData()
  form.append('image', base64)
  form.append('expiration', '600') // 600 seconds = 10 minutes auto-delete
  
  const res = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API}`, form, {
    headers: form.getHeaders(),
    timeout: 15000
  })
  
  if (res.data?.data?.url) return res.data.data.url
  throw new Error('ImgBB failed')
}

// API LIST - 15 TOTAL + IMGBB = 16 🦁
const UPLOAD_APIS = [
  // 1. Telegraph - Best for images
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('file', buffer, `file.${ext}`)
    const res = await axios.post('https://telegra.ph/upload', form, {
      headers: form.getHeaders(),
      timeout: 10000
    })
    if (res.data[0]?.src) return 'https://telegra.ph' + res.data[0].src
    throw new Error('Telegraph failed')
  },
  
  // 2. Tmpfiles - Any file
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('file', buffer, `file.${ext}`)
    const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
      headers: form.getHeaders(),
      timeout: 10000
    })
    if (res.data.data?.url) return res.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
    throw new Error('Tmpfiles failed')
  },
  
  // 3. Catbox - Permanent
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', buffer, `file.${ext}`)
    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      timeout: 10000
    })
    if (res.data && res.data.startsWith('https://')) return res.data
    throw new Error('Catbox failed')
  },
  
  // 4. Uguu - Fast
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('files[]', buffer, `file.${ext}`)
    const res = await axios.post('https://uguu.se/upload.php', form, {
      headers: form.getHeaders(),
      timeout: 10000
    })
    if (res.data?.files?.[0]?.url) return res.data.files[0].url
    throw new Error('Uguu failed')
  },
  
  // 5. Anonfiles
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('file', buffer, `file.${ext}`)
    const res = await axios.post('https://api.anonfiles.com/upload', form, {
      headers: form.getHeaders(),
      timeout: 15000
    })
    if (res.data?.data?.file?.url?.full) return res.data.data.file.url.full
    throw new Error('Anonfiles failed')
  },
  
  // 6. File.io - Expires 1 day
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('file', buffer, `file.${ext}`)
    const res = await axios.post('https://file.io', form, {
      headers: form.getHeaders(),
      timeout: 10000
    })
    if (res.data?.link) return res.data.link
    throw new Error('File.io failed')
  },
  
  // 7. GoFile
  async (buffer) => {
    const serverRes = await axios.get('https://api.gofile.io/getServer')
    const server = serverRes.data.data.server
    
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('file', buffer, `file.${ext}`)
    
    const res = await axios.post(`https://${server}.gofile.io/uploadFile`, form, {
      headers: form.getHeaders(),
      timeout: 20000
    })
    if (res.data?.data?.downloadPage) return res.data.data.downloadPage
    throw new Error('GoFile failed')
  },
  
  // 8. Pomf.lain.la
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('files[]', buffer, `file.${ext}`)
    const res = await axios.post('https://pomf.lain.la/upload.php', form, {
      headers: form.getHeaders(),
      timeout: 10000
    })
    if (res.data?.files?.[0]?.url) return res.data.files[0].url
    throw new Error('Pomf failed')
  },
  
  // 9. 0x0.st - Expires 30 days
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('file', buffer, `file.${ext}`)
    const res = await axios.post('https://0x0.st', form, {
      headers: form.getHeaders(),
      timeout: 10000
    })
    if (res.data && res.data.startsWith('https://')) return res.data.trim()
    throw new Error('0x0.st failed')
  },
  
  // 10. Litterbox Catbox - Expires 1 hour
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('time', '1h')
    form.append('fileToUpload', buffer, `file.${ext}`)
    const res = await axios.post('https://litterbox.catbox.moe/resources/internals/api.php', form, {
      headers: form.getHeaders(),
      timeout: 10000
    })
    if (res.data && res.data.startsWith('https://')) return res.data
    throw new Error('Litterbox failed')
  },
  
  // 11. Transfer.sh - Expires 14 days
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const res = await axios.put(`https://transfer.sh/file.${ext}`, buffer, {
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 15000,
      maxBodyLength: Infinity
    })
    if (res.data && res.data.startsWith('https://')) return res.data.trim()
    throw new Error('Transfer.sh failed')
  },
  
  // 12. FreeImage.host
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('source', buffer, `file.${ext}`)
    form.append('type', 'file')
    form.append('action', 'upload')
    const res = await axios.post('https://freeimage.host/api/1/upload', form, {
      headers: form.getHeaders(),
      timeout: 15000
    })
    if (res.data?.image?.url) return res.data.image.url
    throw new Error('FreeImage failed')
  },
  
  // 13. Qu.ax - Expires 7 days
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('files[]', buffer, `file.${ext}`)
    const res = await axios.post('https://qu.ax/upload.php', form, {
      headers: form.getHeaders(),
      timeout: 10000
    })
    if (res.data?.files?.[0]?.url) return res.data.files[0].url
    throw new Error('Qu.ax failed')
  },
  
  // 14. Pixeldrain
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('file', buffer, `file.${ext}`)
    const res = await axios.post('https://pixeldrain.com/api/file', form, {
      headers: form.getHeaders(),
      timeout: 15000
    })
    if (res.data?.id) return `https://pixeldrain.com/api/file/${res.data.id}`
    throw new Error('Pixeldrain failed')
  },
  
  // 15. Kraken.io - Free tier
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('file', buffer, `file.${ext}`)
    const res = await axios.post('https://api.kraken.io/v1/upload', form, {
      headers: form.getHeaders(),
      timeout: 15000
    })
    if (res.data?.kraked_url) return res.data.kraked_url
    throw new Error('Kraken failed')
  }
]

/**
 * Main upload function - tries 15 free APIs + IMGBB as last resort
 * @param {Buffer} buffer - File buffer to upload
 * @param {Object} options - Optional settings
 * @param {boolean} options.preferImgBB - Try IMGBB first if true
 * @returns {Promise<string>} - Public URL
 */
export async function upload(buffer, options = {}) {
  // If preferImgBB and API key exists, try it first
  if (options.preferImgBB && process.env.IMGBB_API) {
    try {
      const url = await uploadImgBB(buffer)
      console.log(` ✅ Upload Success: IMGBB [Auto-delete 10min]`)
      return url
    } catch (err) {
      console.log(` ⚠️ IMGBB failed: ${err.message}`)
    }
  }

  // Try all 15 free APIs
  for (let i = 0; i < UPLOAD_APIS.length; i++) {
    try {
      const url = await UPLOAD_APIS[i](buffer)
      console.log(` ✅ Upload Success API ${i + 1}/15`)
      return url
    } catch (err) {
      console.log(` ⚠️ Upload API ${i + 1} failed: ${err.message}`)
      continue
    }
  }

  // Last resort: IMGBB if available
  if (process.env.IMGBB_API) {
    try {
      const url = await uploadImgBB(buffer)
      console.log(` ✅ Upload Success: IMGBB [Last Resort - Auto-delete 10min]`)
      return url
    } catch (err) {
      console.log(` ⚠️ IMGBB failed: ${err.message}`)
    }
  }

  throw new Error('All 16 Upload APIs failed including IMGBB')
}