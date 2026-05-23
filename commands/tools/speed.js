// commands/tools/speedtest.js
import axios from 'axios'
import { performance } from 'perf_hooks'

export const name = 'speedtest'
export const alias = ['speed', 'speedcheck', 'testspeed', 'net']
export const category = 'Tools'
export const desc = 'Test server internet speed - ping, download, upload'

export default async function speedtest(sock, { msg, from }, botSettings) {
  try {
    // 1. React first - BUNNY SPEED MODE 🚀
    await sock.sendMessage(from, {
      react: { text: '🚀', key: msg.key }
    })

    // 2. Send starting message
    const startMsg = await sock.sendMessage(from, {
      text: `╭─⌈ 🚀 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Speed Test*
│
│ ⏳ *Status:* Testing...
│ 📡 *Phase:* Initializing
│
╰⊷ *Powered By Bunny Tech*`
    }, { quoted: msg })

    let ping = 0
    let downloadSpeed = 0
    let uploadSpeed = 0
    let serverInfo = {}
    let usedAPI = null

    // 3. TEST 1: PING - Test latency
    try {
      const pingStart = performance.now()
      await axios.get('https://www.google.com', { timeout: 5000 })
      const pingEnd = performance.now()
      ping = Math.round(pingEnd - pingStart)
    } catch (e) {
      ping = 0
    }

    // Update status
    await sock.sendMessage(from, {
      text: `╭─⌈ 🚀 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Speed Test*
│
│ ⏳ *Status:* Testing...
│ 📡 *Phase:* Download Test
│ 🏓 *Ping:* ${ping}ms
│
╰⊷ *Powered By Bunny Tech*`,
      edit: startMsg.key
    })

    // 4. TEST 2: DOWNLOAD SPEED - Multiple APIs
    const downloadTests = [
      // API 1: Cloudflare 10MB
      {
        name: 'Cloudflare',
        url: 'https://speed.cloudflare.com/__down?bytes=10000000',
        size: 10
      },
      // API 2: Fast.com 25MB
      {
        name: 'Fast',
        url: 'https://api.fast.com/netflix/speedtest/v2?https=true&token=YXNkZmFzZGZhc2RmYXNkZmFzZGZhc2Rm&urlCount=5',
        size: 25
      },
      // API 3: LibreSpeed 10MB
      {
        name: 'LibreSpeed',
        url: 'https://librespeed.org/backend/garbage.php?ckSize=10',
        size: 10
      }
    ]

    for (const test of downloadTests) {
      try {
        const dlStart = performance.now()
        await axios.get(test.url, {
          timeout: 30000,
          responseType: 'arraybuffer',
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        })
        const dlEnd = performance.now()
        const dlTime = (dlEnd - dlStart) / 1000 // seconds
        downloadSpeed = (test.size * 8) / dlTime // Mbps
        usedAPI = test.name
        break
      } catch (e) {
        console.log(`[SPEED] ${test.name} download failed:`, e.message)
        continue
      }
    }

    // Update status
    await sock.sendMessage(from, {
      text: `╭─⌈ 🚀 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Speed Test*
│
│ ⏳ *Status:* Testing...
│ 📡 *Phase:* Upload Test
│ 🏓 *Ping:* ${ping}ms
│ ⬇️ *Download:* ${downloadSpeed.toFixed(2)} Mbps
│
╰⊷ *Powered By Bunny Tech*`,
      edit: startMsg.key
    })

    // 5. TEST 3: UPLOAD SPEED
    try {
      const uploadData = Buffer.alloc(2 * 1024) // 2MB test file
      const upStart = performance.now()
      
      await axios.post('https://httpbin.org/post', uploadData, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/octet-stream' }
      })
      
      const upEnd = performance.now()
      const upTime = (upEnd - upStart) / 1000 // seconds
      uploadSpeed = (2 * 8) / upTime // Mbps
    } catch (e) {
      console.log('[SPEED] Upload test failed:', e.message)
      uploadSpeed = 0
    }

    // 6. TEST 4: SERVER INFO
    try {
      const ipInfo = await axios.get('https://ipapi.co/json/', { timeout: 5000 })
      serverInfo = {
        ip: ipInfo.data.ip,
        isp: ipInfo.data.org,
        country: ipInfo.data.country_name,
        city: ipInfo.data.city
      }
    } catch (e) {
      serverInfo = { ip: 'Unknown', isp: 'Unknown', country: 'Unknown', city: 'Unknown' }
    }

    // 7. Calculate grade
    let grade = 'Poor'
    if (downloadSpeed > 100) grade = 'Excellent'
    else if (downloadSpeed > 50) grade = 'Good'
    else if (downloadSpeed > 25) grade = 'Average'
    else if (downloadSpeed > 10) grade = 'Fair'

    // 8. Build final caption - SIMPLE & CLEAN
    let caption = `╭─⌈ 🚀 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Speed Test Results*
│
│ 🏓 *Ping:* ${ping}ms
│ ⬇️ *Download:* ${downloadSpeed.toFixed(2)} Mbps
│ ⬆️ *Upload:* ${uploadSpeed.toFixed(2)} Mbps
│
│ 📊 *Grade:* ${grade}
│ 📡 *API:* ${usedAPI || 'Multiple'}
│
│ 🌐 *Server Info:*
│ 📍 IP: ${serverInfo.ip}
│ 🏢 ISP: ${serverInfo.isp}
│ 🌍 Location: ${serverInfo.city}, ${serverInfo.country}
│
│ ✅ *Status:* Test Complete
│
╰⊷ *Powered By Bunny Tech*`

    // 9. Send final result
    await sock.sendMessage(from, {
      text: caption,
      edit: startMsg.key
    })

    // 10. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[SPEEDTEST ERROR]', error.message)

    await sock.sendMessage(from, {
      text: '> Speed test failed. Server may be busy. Try again'
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}