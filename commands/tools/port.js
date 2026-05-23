// commands/tools/portscan.js
import axios from 'axios'
import net from 'net'

export const name = 'portscan'
export const alias = ['nmap', 'scan', 'portcheck', 'ports']
export const category = 'Tools'
export const desc = 'Scan open ports on domain/IP'

export default async function portscan(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract target from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(new RegExp(`^\\${botSettings.prefix}portscan\\s*`, 'i'), '').replace(new RegExp(`^\\${botSettings.prefix}nmap\\s*`, 'i'), '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}portscan <domain/ip> [ports]\n> Example: ${botSettings.prefix}portscan google.com\n> Example: ${botSettings.prefix}portscan 8.8.8.8\n> Example: ${botSettings.prefix}portscan youtube.com 80,443,8080\n\n> Default: Scans common ports if not specified`
      }, { quoted: msg })
    }

    // 2. Parse target and custom ports
    const parts = input.trim().split(/\s+/)
    let target = parts[0]
.replace(/https?:\/\//, '')
.replace(/www\./, '')
.split('/')[0]
.split(':')[0]
.toLowerCase()

    let customPorts = parts[1]? parts[1].split(',').map(p => parseInt(p.trim())).filter(p => p > 0 && p < 65536) : null

    // 3. React first - BUNNY PORTSCAN MODE 🏉
    await sock.sendMessage(from, {
      react: { text: '🏉', key: msg.key }
    })

    // 4. Common ports list - Top 20 most used
    const commonPorts = customPorts || [
      21, 22, 23, 25, 53, 80, 110, 143, 443, 445,
      993, 995, 1723, 3306, 3389, 5900, 8080, 8443, 25565, 27017
    ]

    const portServices = {
      21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
      80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 445: 'SMB',
      993: 'IMAPS', 995: 'POP3S', 1723: 'PPTP', 3306: 'MySQL', 3389: 'RDP',
      5900: 'VNC', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt', 25565: 'Minecraft', 27017: 'MongoDB'
    }

    let openPorts = []
    let closedPorts = []
    let scanMethod = 'TCP'
    let hostIP = target

    // 5. Method 1: Direct TCP Scan - Fastest
    const scanPort = (port, timeout = 2000) => {
      return new Promise((resolve) => {
        const socket = new net.Socket()
        let status = 'closed'

        socket.setTimeout(timeout)
        socket.on('connect', () => {
          status = 'open'
          socket.destroy()
        })
        socket.on('timeout', () => socket.destroy())
        socket.on('error', () => socket.destroy())
        socket.on('close', () => resolve(status))

        socket.connect(port, target)
      })
    }

    // 6. Resolve hostname to IP first
    try {
      const dns = await import('dns/promises')
      const addresses = await dns.resolve4(target)
      hostIP = addresses[0] || target
    } catch (e) {
      console.log('[PORTSCAN] DNS resolve failed, using target as-is')
    }

    // 7. Scan ports - TCP Direct
    try {
      const scanPromises = commonPorts.map(async (port) => {
        const status = await scanPort(port)
        return { port, status, service: portServices[port] || 'Unknown' }
      })

      const results = await Promise.all(scanPromises)
      results.forEach(r => {
        if (r.status === 'open') {
          openPorts.push(r)
        } else {
          closedPorts.push(r)
        }
      })
      scanMethod = 'TCP Direct'
    } catch (e) {
      console.log('[PORTSCAN] TCP scan failed:', e.message)
    }

    // 8. Fallback API 1: HackerTarget
    if (openPorts.length === 0) {
      try {
        const response = await axios.get(`https://api.hackertarget.com/nmap/`, {
          params: { q: target },
          timeout: 25000
        })

        if (response.data && typeof response.data === 'string') {
          const lines = response.data.split('\n')
          lines.forEach(line => {
            const match = line.match(/(\d+)\/tcp\s+open\s+(\w+)/)
            if (match) {
              const port = parseInt(match[1])
              const service = match[2].toUpperCase()
              openPorts.push({ port, status: 'open', service })
            }
          })
          if (openPorts.length > 0) scanMethod = 'HackerTarget API'
        }
      } catch (e) {
        console.log('[PORTSCAN] HackerTarget failed:', e.message)
      }
    }

    // 9. Fallback API 2: ViewDNS
    if (openPorts.length === 0) {
      try {
        const response = await axios.get(`https://api.viewdns.info/portscan/`, {
          params: { host: target, apikey: 'demo', output: 'json' },
          timeout: 20000
        })

        if (response.data?.response?.port) {
          response.data.response.port.forEach(p => {
            if (p.status === 'open') {
              openPorts.push({
                port: parseInt(p.number),
                status: 'open',
                service: p.service || portServices[p.number] || 'Unknown'
              })
            }
          })
          if (openPorts.length > 0) scanMethod = 'ViewDNS API'
        }
      } catch (e) {
        console.log('[PORTSCAN] ViewDNS failed:', e.message)
      }
    }

    // 10. Build result caption
    let caption = `╭─⌈ 🏉 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *Port Scanner Tool*
│
│ 🌐 *Target:* ${target}
│ 📍 *IP:* ${hostIP}
│ 🔍 *Method:* ${scanMethod}
│ 📊 *Scanned:* ${commonPorts.length} ports
│
│ ✅ *Open Ports: ${openPorts.length}*`

    if (openPorts.length > 0) {
      openPorts.sort((a, b) => a.port - b.port).slice(0, 15).forEach(p => {
        caption += `\n│ • ${p.port}/tcp - ${p.service}`
      })
      if (openPorts.length > 15) {
        caption += `\n│ •... and ${openPorts.length - 15} more`
      }
    } else {
      caption += `\n│ • No open ports found`
    }

    caption += `\n│\n│ ❌ *Closed/Filtered:* ${closedPorts.length}`
    caption += `\n│\n│ ⚠️ *Note:* Only common ports scanned`
    caption += `\n│\n╰⊷ *Powered By Bunny Tech*`

    // 11. Send result
    await sock.sendMessage(from, {
      text: caption,
      contextInfo: {
        externalAdReply: {
          title: `${target} - Port Scan`,
          body: `${openPorts.length} Open • ${closedPorts.length} Closed • ${scanMethod}`,
          thumbnailUrl: `https://logo.clearbit.com/${target}`,
          mediaType: 1,
          renderLargerThumbnail: false,
          sourceUrl: `https://${target}`
        }
      }
    }, { quoted: msg })

    // 12. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[PORTSCAN ERROR]', error.message)

    let errorMsg = '> Failed to scan ports'
    if (error.message.includes('ENOTFOUND')) {
      errorMsg = '> Domain/IP not found or invalid'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Scan timeout. Target may be blocking scans'
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMsg = '> Connection refused. Target may be offline'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}