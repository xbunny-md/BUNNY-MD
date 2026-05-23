// commands/tools/whois.js
import axios from 'axios'
import dns from 'dns/promises'

export const name = 'whois'
export const alias = ['domain', 'whoisinfo', 'domaininfo', 'lookup']
export const category = 'Tools'
export const desc = 'Get domain/IP WHOIS information'

export default async function whois(sock, { msg, from, args }, botSettings) {
  try {
    // 1. Extract domain/IP from args, message, or quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const textAfterCmd = args.join(' ')

    let input = textAfterCmd || messageText.replace(new RegExp(`^\\${botSettings.prefix}whois\\s*`, 'i'), '').replace(new RegExp(`^\\${botSettings.prefix}domain\\s*`, 'i'), '') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text: `> Usage: ${botSettings.prefix}whois <domain/ip>\n> Example: ${botSettings.prefix}whois google.com\n> Example: ${botSettings.prefix}whois 8.8.8.8\n> Example: ${botSettings.prefix}whois https://youtube.com`
      }, { quoted: msg })
    }

    // 2. Clean domain/IP
    let target = input.trim()
.replace(/https?:\/\//, '')
.replace(/www\./, '')
.split('/')[0]
.split(':')[0]
.toLowerCase()

    // 3. React first - BUNNY WHOIS MODE 🪖
    await sock.sendMessage(from, {
      react: { text: '🪖', key: msg.key }
    })

    let whoisData = null
    let dnsData = {}
    let isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(target)

    // 4. WHOIS APIs with fallback chain
    const apis = [
      // API 1: WHOISXMLAPI - Best free
      {
        name: 'WhoisXML',
        url: `https://www.whoisxmlapi.com/whoisserver/WhoisService`,
        params: {
          apiKey: 'at_demo',
          domainName: target,
          outputFormat: 'JSON'
        }
      },
      // API 2: RDAP - Modern protocol
      {
        name: 'RDAP',
        url: isIP? `https://rdap.arin.net/registry/ip/${target}` : `https://rdap.org/domain/${target}`,
        params: {}
      },
      // API 3: HackerTarget - IP/Domain
      {
        name: 'HackerTarget',
        url: `https://api.hackertarget.com/whois/`,
        params: { q: target }
      },
      // API 4: IP-API - IP only
      {
        name: 'IP-API',
        url: `http://ip-api.com/json/${target}`,
        params: { fields: 'status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query' }
      }
    ]

    // 5. Try each API
    for (const api of apis) {
      try {
        const response = await axios.get(api.url, {
          params: api.params,
          timeout: 20000,
          headers: {
            'User-Agent': 'BunnyMD-WHOIS/1.0'
          }
        })

        if (response.data) {
          // Parse based on API
          if (api.name === 'WhoisXML' && response.data.WhoisRecord) {
            const r = response.data.WhoisRecord
            whoisData = {
              domain: r.domainName || target,
              registrar: r.registrarName || 'Unknown',
              created: r.createdDate || r.registryData?.createdDate || 'Unknown',
              updated: r.updatedDate || r.registryData?.updatedDate || 'Unknown',
              expires: r.expiresDate || r.registryData?.expiresDate || 'Unknown',
              status: r.status || r.registryData?.status || 'Unknown',
              nameservers: r.nameServers?.hostNames || r.registryData?.nameServers?.hostNames || [],
              registrant: r.registrant?.organization || r.registrant?.name || 'Private',
              country: r.registrant?.country || 'Unknown',
              email: r.registrant?.email || 'Private',
              source: 'WhoisXML'
            }
            break
          }

          if (api.name === 'RDAP' && response.data) {
            const r = response.data
            const events = {}
            r.events?.forEach(e => {
              events[e.eventAction] = e.eventDate
            })

            whoisData = {
              domain: r.ldhName || r.handle || target,
              registrar: r.entities?.find(e => e.roles?.includes('registrar'))?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3] || 'Unknown',
              created: events.registration || 'Unknown',
              updated: events['last changed'] || events['last update'] || 'Unknown',
              expires: events.expiration || 'Unknown',
              status: r.status?.join(', ') || 'Unknown',
              nameservers: r.nameservers?.map(ns => ns.ldhName) || [],
              registrant: 'Private/RDAP',
              country: 'Unknown',
              email: 'Private',
              source: 'RDAP'
            }
            break
          }

          if (api.name === 'HackerTarget' && typeof response.data === 'string') {
            const text = response.data
            const extract = (key) => {
              const match = text.match(new RegExp(`${key}:\\s*(.+)`, 'i'))
              return match? match[1].trim() : 'Unknown'
            }

            whoisData = {
              domain: target,
              registrar: extract('Registrar'),
              created: extract('Creation Date') || extract('Created'),
              updated: extract('Updated Date') || extract('Last updated'),
              expires: extract('Registry Expiry Date') || extract('Expiration Date'),
              status: extract('Domain Status'),
              nameservers: text.match(/Name Server:\s*(.+)/gi)?.map(ns => ns.replace(/Name Server:\s*/i, '').trim()) || [],
              registrant: extract('Registrant Organization') || extract('Registrant'),
              country: extract('Registrant Country'),
              email: extract('Registrant Email'),
              source: 'HackerTarget'
            }
            break
          }

          if (api.name === 'IP-API' && response.data.status === 'success') {
            const r = response.data
            whoisData = {
              domain: target,
              registrar: r.isp || 'Unknown',
              created: 'N/A',
              updated: 'N/A',
              expires: 'N/A',
              status: 'Active',
              nameservers: [],
              registrant: r.org || 'Unknown',
              country: `${r.country} (${r.countryCode})`,
              email: 'N/A',
              city: r.city,
              region: r.regionName,
              timezone: r.timezone,
              lat: r.lat,
              lon: r.lon,
              asn: r.as,
              source: 'IP-API'
            }
            break
          }
        }
      } catch (e) {
        console.log(`[WHOIS] ${api.name} failed:`, e.message)
        continue
      }
    }

    // 6. DNS Lookup fallback
    try {
      const [aRecords, mxRecords, txtRecords, nsRecords] = await Promise.allSettled([
        dns.resolve4(target),
        dns.resolveMx(target),
        dns.resolveTxt(target),
        dns.resolveNs(target)
      ])

      if (aRecords.status === 'fulfilled') dnsData.a = aRecords.value
      if (mxRecords.status === 'fulfilled') dnsData.mx = mxRecords.value.map(m => m.exchange)
      if (txtRecords.status === 'fulfilled') dnsData.txt = txtRecords.value.flat()
      if (nsRecords.status === 'fulfilled') dnsData.ns = nsRecords.value
    } catch (e) {
      console.log('[WHOIS] DNS lookup failed')
    }

    if (!whoisData) {
      throw new Error('All WHOIS servers failed')
    }

    // 7. Format dates nicely
    const formatDate = (date) => {
      if (!date || date === 'Unknown' || date === 'N/A') return date
      try {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      } catch {
        return date
      }
    }

    // 8. Build caption - FULL DETAILS
    let caption = `╭─⌈ 🪖 *${botSettings.botname || 'BUNNY MD'}* ⌋
│ *WHOIS Lookup Tool*
│
│ 🌐 *Target:* ${whoisData.domain}
│ 📡 *Type:* ${isIP? 'IP Address' : 'Domain'}
│ 🏢 *Registrar/ISP:* ${whoisData.registrar}
│
│ 📅 *Dates:*
│ • Created: ${formatDate(whoisData.created)}
│ • Updated: ${formatDate(whoisData.updated)}
│ • Expires: ${formatDate(whoisData.expires)}
│
│ 📊 *Status:* ${whoisData.status}
│ 👤 *Registrant:* ${whoisData.registrant}
│ 🌍 *Country:* ${whoisData.country}`

    if (whoisData.city) caption += `\n│ 📍 *Location:* ${whoisData.city}, ${whoisData.region}`
    if (whoisData.timezone) caption += `\n│ 🕐 *Timezone:* ${whoisData.timezone}`
    if (whoisData.asn) caption += `\n│ 🔢 *ASN:* ${whoisData.asn}`
    if (whoisData.email!== 'Private' && whoisData.email!== 'N/A') caption += `\n│ 📧 *Email:* ${whoisData.email}`

    // Nameservers
    if (whoisData.nameservers?.length > 0) {
      caption += `\n│\n│ 🔧 *Nameservers:*`
      whoisData.nameservers.slice(0, 3).forEach(ns => {
        caption += `\n│ • ${ns}`
      })
    }

    // DNS Records
    if (dnsData.a?.length > 0) {
      caption += `\n│\n│ 🌐 *A Records:*`
      dnsData.a.slice(0, 3).forEach(ip => {
        caption += `\n│ • ${ip}`
      })
    }

    if (dnsData.mx?.length > 0) {
      caption += `\n│\n│ 📮 *MX Records:*`
      dnsData.mx.slice(0, 2).forEach(mx => {
        caption += `\n│ • ${mx}`
      })
    }

    caption += `\n│\n│ 🔍 *Source:* ${whoisData.source}`
    caption += `\n│\n╰⊷ *Powered By Bunny Tech*`

    // 9. Send with fake location thumbnail for map preview
    await sock.sendMessage(from, {
      text: caption,
      contextInfo: {
        externalAdReply: {
          title: whoisData.domain,
          body: `${whoisData.registrar} • ${whoisData.country}`,
          thumbnailUrl: isIP? `https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${whoisData.lon || 0},${whoisData.lat || 0}&z=10&l=map&size=600,300` : `https://logo.clearbit.com/${target}`,
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: isIP? `https://whatismyipaddress.com/ip/${target}` : `https://${target}`
        }
      }
    }, { quoted: msg })

    // 10. React done ✅
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

  } catch (error) {
    console.error('[WHOIS ERROR]', error.message)

    let errorMsg = '> Failed to fetch WHOIS data'
    if (error.message.includes('All WHOIS servers failed')) {
      errorMsg = '> All servers failed. Domain may not exist or be private'
    } else if (error.message.includes('timeout')) {
      errorMsg = '> Server timeout. Try again'
    } else if (error.message.includes('ENOTFOUND')) {
      errorMsg = '> Domain not found or invalid'
    }

    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}