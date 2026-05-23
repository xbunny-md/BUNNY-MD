// index.js
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pino from 'pino'
import qrcode from 'qrcode'
import fs from 'fs'
import pkg from '@whiskeysockets/baileys'
const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers } = pkg
import { getBotSettings, listenSettingsUpdates, supabase } from './lib/supabase.js'
import { initializeRouter, handleMessages } from './lib/router.js'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 1. GLOBAL STATE
let botSettings = null
let sock = null
let qrString = ''
let isConnected = false
let reconnectAttempts = 0

// 2. EXPRESS + SOCKET.IO SETUP
const app = express()
const server = createServer(app)
const io = new Server(server, { cors: { origin: "*" } })
const PORT = process.env.PORT || 3000

app.use(express.static(join(__dirname, 'public')))
app.use(express.json())

app.get('/', (req, res) => {
  res.send('BUNNY MD is running 🐰')
})

// 3. SUPABASE SESSION SYNC - MFUMO WA VEX
async function syncSessionToCloud() {
  try {
    if (!fs.existsSync('./session/creds.json')) return
    
    const credsData = fs.readFileSync('./session/creds.json', 'utf-8')
    const base64 = Buffer.from(credsData).toString('base64')
    
    await supabase.from('b_sessions').upsert({
      id: 'creds',
      data: base64
    })
    console.log('☁️ Session synced to Supabase')
  } catch (e) {
    console.log('Session sync error:', e.message)
  }
}

async function loadSessionFromCloud() {
  try {
    const { data } = await supabase
      .from('b_sessions')
      .select('data')
      .eq('id', 'creds')
      .single()

    if (data?.data) {
      const decoded = Buffer.from(data.data, 'base64').toString('utf-8')
      if (!fs.existsSync('./session')) fs.mkdirSync('./session', { recursive: true })
      fs.writeFileSync('./session/creds.json', decoded)
      console.log('☁️ Session restored from Supabase')
      return true
    }
  } catch (e) {
    console.log('No session in Supabase')
  }
  return false
}

// 4. WHATSAPP CONNECTION - MFUMO WA VEX + FIXES
async function connectToWhatsApp() {
  try {
    // Step 1: Load session kutoka Supabase kwenda local
    const hasCloudSession = await loadSessionFromCloud()
    
    // Step 2: Tumia useMultiFileAuthState - HII NDIO SIRI YA VEX
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`)

    const hasSession = state.creds?.noiseKey ? true : false

    if (!hasSession) {
      console.log('🔍 No session found. QR will be generated for /pair.html')
    } else {
      console.log('🔄 Existing session found. Attempting to restore...')
    }

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      browser: Browsers.ubuntu('BUNNY MD'),
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      fireInitQueries: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      retryRequestDelayMs: 250,
      getMessage: async () => ({ conversation: '' })
    })

    // 5. HANDLE CONNECTION UPDATES
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        qrString = qr
        try {
          const qrImage = await qrcode.toDataURL(qr)
          io.emit('qr', qrImage)
          io.emit('status', 'Scan QR or use Pair Code')
          console.log('📱 New QR generated - check /pair.html page')
        } catch (err) {
          console.log('QR generation failed:', err.message)
        }
      }

      if (connection === 'open') {
        isConnected = true
        qrString = ''
        reconnectAttempts = 0
        io.emit('status', 'Connected')
        console.log('✅ WhatsApp connected successfully!')
        await syncSessionToCloud() // Save session kwa Supabase
        await sendConfirmationMessage()
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        isConnected = false
        io.emit('status', 'Disconnected')
        console.log('Connection closed. Reason:', lastDisconnect?.error?.message)

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('❌ Logged out. Clearing session...')
          await supabase.from('b_sessions').delete().eq('id', 'creds')
          if (fs.existsSync('./session')) fs.rmSync('./session', { recursive: true, force: true })
          qrString = ''
          reconnectAttempts = 0
          setTimeout(() => connectToWhatsApp(), 3000)
        } else if (shouldReconnect) {
          reconnectAttempts++
          const delay = Math.min(reconnectAttempts * 5000, 30000)
          console.log(`🔄 Reconnecting in ${delay/1000} seconds... Attempt ${reconnectAttempts}`)
          setTimeout(() => connectToWhatsApp(), delay)
        } else {
          console.log('⚠️ Connection closed. Restarting in 10 seconds...')
          setTimeout(() => connectToWhatsApp(), 10000)
        }
      }
    })

    // 6. SAVE CREDS WHEN UPDATED
    sock.ev.on('creds.update', async () => {
      await saveCreds()
      await syncSessionToCloud() // Sync kila creds ikibadilika
    })

    // 7. HANDLE ALL INCOMING MESSAGES
    sock.ev.on('messages.upsert', (m) => {
      handleMessages(sock, m, botSettings)
    })

  } catch (err) {
    console.error('Connection error:', err.message)
    setTimeout(() => connectToWhatsApp(), 10000)
  }
}

// 8. HANDLE PAIR CODE REQUEST FROM FRONTEND
io.on('connection', (socket) => {
  if (qrString && !isConnected) {
    qrcode.toDataURL(qrString).then(qrImage => {
      socket.emit('qr', qrImage)
    }).catch(() => {})
  }

  socket.emit('status', isConnected ? 'Connected' : 'Waiting for connection')

  socket.on('request_pair_code', async (phoneNumber) => {
    if (!sock || isConnected) return
    try {
      const code = await sock.requestPairingCode(phoneNumber)
      socket.emit('pair_code', code)
      console.log('Pair code sent:', code)
    } catch (err) {
      socket.emit('pair_error', 'Failed to generate code. Try QR.')
      console.log('Pair code error:', err.message)
    }
  })
})

// 9. CONFIRMATION MESSAGE
async function sendConfirmationMessage() {
  const s = botSettings
  const imageUrl = 'https://i.ibb.co/Mdg2Fkd/file-00000000f41871fdb744b8a6b7b612fa.png'
  const formatBool = (val) => val ? 'On' : 'Off'

  const caption = `╭─⌈ *${s.botname}* ⌋
│
│ Hello ${sock.user.name || "User"}, bot is online.
│ Owner: ${s.owner_name}
│ Number: ${s.owner_number}
│ Prefix: ${s.prefix}
│
│ *SYSTEM STATUS*
│ Public Mode: ${formatBool(s.public_mode)}
│ Anti-Link: ${formatBool(s.antilink)}
│ Anti-Spam: ${formatBool(s.antispam)}
│ Auto-Read: ${formatBool(s.autoread)}
│ Auto-Typing: ${formatBool(s.autotyping)}
│ View Status: ${formatBool(s.autoviewstatus)}
│
╰⊷ Type ${s.prefix}menu to start`

  try {
    await sock.sendMessage(`${s.owner_number}@s.whatsapp.net`, {
      image: { url: imageUrl },
      caption: caption
    })
    console.log('Confirmation message sent to owner')
  } catch (err) {
    console.log('Failed to send confirmation:', err.message)
  }
}

// 10. MAIN START FUNCTION
async function startBot() {
  try {
    await initializeRouter()
    botSettings = await getBotSettings()
    if (!botSettings) {
      console.error('❌ Failed to load bot settings from Supabase')
      process.exit(1)
    }
    console.log('✅ Initial settings loaded. Prefix:', botSettings.prefix)

    listenSettingsUpdates((newSettings) => {
      botSettings = newSettings
      console.log('🔥 Settings updated live. New prefix:', newSettings.prefix)
    })

    await connectToWhatsApp()

    server.listen(PORT, () => {
      console.log(`BUNNY MD Server running on port ${PORT}`)
      console.log(`Pair page will be available at /pair.html on your Render URL`)
    })

  } catch (err) {
    console.error('Bot failed to start:', err)
    process.exit(1)
  }
}

// 11. START EVERYTHING
startBot()

// 12. ERROR HANDLING
process.on('uncaughtException', (err) => console.error('Caught exception: ', err))
process.on('unhandledRejection', (reason, promise) => console.error('Unhandled Rejection:', reason))