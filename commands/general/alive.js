module.exports = { 
    config: commandConfig, 
    execute: executeAutonomousCommand 
};

/**
 * Metadata Configuration Block for Dynamic System Menu Generation
 */
const commandConfig = {
    name: 'alive',
    alias: ['status'],
    category: 'general',
    description: 'Checks if the bot is online and responsive.'
};

/**
 * Simple Alive Command Node
 */
async function executeAutonomousCommand(ctx) {
    const { sock, msg, from, state } = ctx;

    try {
        await sock.sendMessage(from, {
            react: {
                text: '🦋',
                key: msg.key
            }
        });

        const activeBotIdentityName = state.botName || 'Bunny MD';

        const alivePayload = 
`╭─⌈ ⚡ *${activeBotIdentityName}* ⌋
│ Status: Online
╰⊷ *${activeBotIdentityName}*`;

        await sock.sendMessage(from, { 
            text: alivePayload 
        }, { 
            quoted: msg 
        });

    } catch (commandException) {
        console.error(`[Command Exception] Critical failure inside general/alive.js execution tree:`, commandException.message);

        try {
            await ctx.reply(`\`\`System health check anomaly detected. Framework safe-mode enforced.\`\``);
        } catch (secondaryFault) {
            console.error(`[Command Fatal] Emergency reporting pipe severed:`, secondaryFault.message);
        }
    }
}