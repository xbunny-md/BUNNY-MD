// commands/general/alive.js
export const name = 'alive'
export const alias = ['status']
export const category = 'General'
export const desc = 'Checks if the bot is online and responsive'

export default async function alive(sock, { msg, from }, botSettings) {
  try {
    await sock.sendMessage(from, {
      react: {
        text: '🦋',
        key: msg.key
      }
    })

    const activeBotIdentityName = botSettings.botname || 'BUNNY MD'

    const alivePayload = 
`╭─⌈ ⚡ *${activeBotIdentityName}* ⌋
│ Status: Online
╰⊷ *${activeBotIdentityName}*`

    await sock.sendMessage(from, { 
      text: alivePayload 
    }, { 
      quoted: msg 
    })

  } catch (commandException) {
    console.error(`[Command Exception] Critical failure inside general/alive.js:`, commandException.message)

    try {
      await sock.sendMessage(from, { 
        text: '> System health check anomaly detected. Framework safe-mode enforced.' 
      }, { quoted: msg })
    } catch (secondaryFault) {
      console.error(`[Command Fatal] Emergency reporting pipe severed:`, secondaryFault.message)
    }
  }
}