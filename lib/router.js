// lib/router.js
import { readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const commands = new Map()
const aliases = new Map()
const observers = []
let isLoaded = false

// 1. LOAD COMMANDS RECURSIVE
async function loadCommands(dir) {
  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      await loadCommands(fullPath)
    } else if (item.endsWith('.js')) {
      try {
        await new Promise(resolve => setTimeout(resolve, 50))
        const filePath = pathToFileURL(fullPath).href
        const commandModule = await import(filePath)

        if (!commandModule.name || typeof commandModule.default !== 'function') {
          console.log(`⚠️ Skipped ${item}: Missing 'name' or default export`)
          continue
        }

        const cmdData = {
          name: commandModule.name.toLowerCase(),
          alias: commandModule.alias || [],
          category: commandModule.category || 'General',
          desc: commandModule.desc || 'No description',
          run: commandModule.default
        }

        commands.set(cmdData.name, cmdData)

        for (const alias of cmdData.alias) {
          aliases.set(alias.toLowerCase(), cmdData.name)
        }

        console.log(`✅ Loaded: ${cmdData.name} [${cmdData.category}]`)
      } catch (err) {
        console.log(`⚠️ Skipped ${item}: ${err.message.split('\n')[0]}`)
      }
    }
  }
}

// 2. LOAD OBSERVERS
async function loadObservers() {
  const observersPath = join(__dirname, '..', 'observers')
  try {
    const observerFiles = readdirSync(observersPath).filter(file => file.endsWith('.js'))
    for (const file of observerFiles) {
      try {
        await new Promise(resolve => setTimeout(resolve, 50))
        const filePath = pathToFileURL(join(observersPath, file)).href
        const observer = await import(filePath)
        if (typeof observer.default === 'function') {
          observers.push(observer.default)
          console.log(`✅ Loaded observer: ${file.replace('.js', '')}`)
        }
      } catch (err) {
        console.log(`⚠️ Skipped observer ${file}: ${err.message.split('\n')[0]}`)
      }
    }
  } catch (err) {
    console.log('No observers folder found. Skipping.')
  }
}

// 3. INIT
export async function initializeRouter() {
  if (isLoaded) return
  console.log('🔄 Loading commands and observers...')
  const commandsPath = join(__dirname, '..', 'commands')
  await loadCommands(commandsPath)
  await loadObservers()
  isLoaded = true
  console.log(`🚀 Total commands loaded: ${commands.size}`)
}

// 4. EXPORT COMMANDS
export function getAllCommands() {
  return commands
}

// 5. MAIN HANDLER - PUBLIC ALWAYS, NO OWNER CHECK
export async function handleMessages(sock, m, botSettings) {
  try {
    if (m.type !== 'notify') return
    const msg = m.messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const isGroup = from.endsWith('@g.us')
    const sender = isGroup ? msg.key.participant : from
    const pushName = msg.pushName || 'User'

    const body = msg.message.conversation ||
                 msg.message.extendedTextMessage?.text ||
                 msg.message.imageMessage?.caption ||
                 msg.message.videoMessage?.caption || ''

    // RUN OBSERVERS
    for (const observer of observers) {
      try {
        await observer(sock, { msg, from, sender, body, isGroup, pushName }, botSettings)
      } catch (err) {
        console.log('Observer error:', err.message)
      }
    }

    // CHECK PREFIX
    if (!body.startsWith(botSettings.prefix)) return

    // GET COMMAND
    const args = body.slice(botSettings.prefix.length).trim().split(/ +/)
    const providedName = args.shift().toLowerCase()
    
    if (!providedName) return

    const commandName = commands.has(providedName) ? providedName : aliases.get(providedName)
    if (!commandName) return

    const command = commands.get(commandName)
    if (!command) return

    // HAKUNA PUBLIC MODE CHECK HAPA - KILA MTU ANAJIBU
    console.log(`Command: ${commandName} from ${pushName} [${sender}]`)

    // EXECUTE
    await command.run(sock, { msg, from, sender, args, isGroup, pushName, body, commandName }, botSettings)
    
  } catch (err) {
    console.log('Handle message error:', err.message)
  }
}