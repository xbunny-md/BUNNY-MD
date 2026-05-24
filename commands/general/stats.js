// commands/general/stats.js
import os from 'os'
import { getAllCommands, getAllObservers } from '../../lib/router.js'

export const name = 'stats'
export const alias = ['botstats', 'sysinfo', 'info']
export const category = 'General'
export const desc = 'Advanced system statistics with command alias analysis + observer count'

/**
 * Advanced Statistics Engine - Filters command conflicts
 */
export default async function executeStatsCommand(sock, { msg, from, pushName, sender }, botSettings) {
  try {
    await sock.sendMessage(from, { react: { text: '📊', key: msg.key } })

    // 1. System Stats
    const totalUptimeSeconds = process.uptime()
    const calculationHours = Math.floor(totalUptimeSeconds / 3600)
    const calculationMinutes = Math.floor((totalUptimeSeconds % 3600) / 60)
    const calculationSeconds = Math.floor(totalUptimeSeconds % 60)
    const structuredUptimeString = `${calculationHours}h ${calculationMinutes}m ${calculationSeconds}s`

    const totalSystemMemoryBytes = os.totalmem()
    const freeSystemMemoryBytes = os.freemem()
    const globalMemoryUtilizationRatio = (totalSystemMemoryBytes - freeSystemMemoryBytes) / totalSystemMemoryBytes
    const dynamicRamProgressBar = '█'.repeat(Math.round(globalMemoryUtilizationRatio * 10)) + '▒'.repeat(10 - Math.round(globalMemoryUtilizationRatio * 10))
    const totalRamUtilizationPercentage = Math.round(globalMemoryUtilizationRatio * 100)

    const underlyingOperatingPlatform = os.platform() === 'linux'? '🐧 Linux' : '🪟 Windows'
    const userIdentity = pushName || sender.split('@')[0]

    // 2. Get all commands from router
    const allCommands = getAllCommands()
    const allObservers = getAllObservers()

    // 3. FILTER MODE - Analyze conflicts
    const commandNames = new Set()
    const allAliases = new Set()
    const aliasToCommand = new Map() // alias -> [commands using it]
    const commandToAliases = new Map() // command -> [its aliases]

    let conflictAliasCount = 0
    let aliasSameAsCommandCount = 0
    let commandSameAsAliasCount = 0
    let uniqueAliasCount = 0

    for (const [cmdName, cmdData] of allCommands) {
      commandNames.add(cmdName.toLowerCase())
      
      const aliases = cmdData.alias || []
      commandToAliases.set(cmdName, aliases)

      aliases.forEach(alias => {
        const lowerAlias = alias.toLowerCase()
        allAliases.add(lowerAlias)

        // Track which commands use this alias
        if (!aliasToCommand.has(lowerAlias)) {
          aliasToCommand.set(lowerAlias, [])
        }
        aliasToCommand.get(lowerAlias).push(cmdName)

        // Check if alias matches a command name
        if (commandNames.has(lowerAlias) && lowerAlias !== cmdName.toLowerCase()) {
          aliasSameAsCommandCount++
        }

        // Check if command name matches any alias
        if (cmdName.toLowerCase() === lowerAlias) {
          commandSameAsAliasCount++
        }
      })
    }

    // Count conflicts: same alias used by multiple commands
    for (const [alias, commands] of aliasToCommand) {
      if (commands.length > 1) {
        conflictAliasCount++
      }
    }

    // Count unique aliases: not used by multiple commands AND not same as command name
    for (const alias of allAliases) {
      const commandsUsingAlias = aliasToCommand.get(alias) || []
      if (commandsUsingAlias.length === 1 && !commandNames.has(alias)) {
        uniqueAliasCount++
      }
    }

    // 4. Observer Count
    const totalObservers = allObservers.size

    // 5. Build stats message
    const systemPrefixToken = botSettings.prefix || '!'
    const configuredBotName = botSettings.botname || 'BUNNY MD'
    const configuredOwnerName = botSettings.owner_name || 'Lupin Starnley'
    const footerText = '*Powered by Bunny Tech*'

    let statsBuffer =
`╭──⌈ ${configuredBotName} STATS ⌋
│ User: ${userIdentity}
│ Owner: ${configuredOwnerName}
│ Prefix: [ ${systemPrefixToken} ]
│ Platform: ${underlyingOperatingPlatform}
│ Uptime: ${structuredUptimeString}
│ RAM: ${dynamicRamProgressBar} ${totalRamUtilizationPercentage}%
╰────────────────\n\n`

    statsBuffer += `╭──⌈ COMMAND ANALYSIS ⌋\n`
    statsBuffer += `│ Total Commands: ${allCommands.size}\n`
    statsBuffer += `│ Total Aliases: ${allAliases.size}\n`
    statsBuffer += `│ Unique Aliases: ${uniqueAliasCount}\n`
    statsBuffer += `│ Conflicted Aliases: ${conflictAliasCount}\n`
    statsBuffer += `│ Alias = Command Name: ${aliasSameAsCommandCount}\n`
    statsBuffer += `│ Command = Alias Name: ${commandSameAsAliasCount}\n`
    statsBuffer += `╰────────────────\n\n`

    statsBuffer += `╭──⌈ OBSERVER ANALYSIS ⌋\n`
    statsBuffer += `│ Total Observers: ${totalObservers}\n`
    statsBuffer += `╰────────────────\n\n`

    statsBuffer += `╭──⌈ SYSTEM HEALTH ⌋\n`
    statsBuffer += `│ Node.js: ${process.version}\n`
    statsBuffer += `│ Memory: ${(totalSystemMemoryBytes / 1024 / 1024 / 1024).toFixed(2)} GB\n`
    statsBuffer += `│ CPU Cores: ${os.cpus().length}\n`
    statsBuffer += `╰────────────────\n\n`

    statsBuffer += footerText

    // 6. Send with image
    await sock.sendMessage(from, {
      image: { url: 'https://i.ibb.co/Mdg2Fkd/file-00000000f41871fdb744b8a6b7b612fa.png' },
      caption: statsBuffer
    }, { quoted: msg })

  } catch (e) {
    console.error("Stats Error:", e.message)
    await sock.sendMessage(from, { text: "> Failed to load system stats. Try again." }, { quoted: msg })
  }
}