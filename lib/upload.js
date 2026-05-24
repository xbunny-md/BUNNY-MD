// lib/upload.js
import axios from 'axios'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'

const UPLOAD_APIS = [
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
  async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer) || { ext: 'jpg' }
    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', buffer, `file.${ext}`)
    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      timeout: 10000
    })
    if (res.data) return res.data
    throw new Error('Catbox failed')
  }
]

export async function upload(buffer) {
  for (let i = 0; i < UPLOAD_APIS.length; i++) {
    try {
      const url = await UPLOAD_APIS[i](buffer)
      console.log(` Upload Success API ${i + 1}`)
      return url
    } catch (err) {
      console.log(` Upload API ${i + 1} failed: ${err.message}`)
      continue
    }
  }
  throw new Error('All Upload APIs failed')
}