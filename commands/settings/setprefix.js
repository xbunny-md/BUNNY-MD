module.exports = { 
    config: commandConfig, 
    execute: executeAutonomousCommand 
};

/**
 * Metadata Configuration Block for Dynamic System Menu Generation
 */
const commandConfig = {
    name: 'setprefix',
    alias: ['prefix'],
    category: 'settings',
    description: 'Update the bot command prefix in real-time without restart.'
};

/**
 * Prefix Update Command Node
 */
async function executeAutonomousCommand(ctx) {
    const { sock, msg, from, state, args, isOwner } = ctx;

    try {
        if (!isOwner) {
            return await ctx.reply('Access Denied. Only the owner can change settings.');
        }

        const newPrefix = args.join(' ').trim();

        if (!newPrefix) {
            return await ctx.reply(
                `Usage: ${state.prefix}setprefix <new_prefix>\nExample: ${state.prefix}setprefix !`
            );
        }

        if (newPrefix.length > 3) {
            return await ctx.reply('Prefix too long. Use 1-3 characters max.');
        }

        const success = await state.updateSetting('prefix', newPrefix);
        
        if (!success) {
            return await ctx.reply('Failed to update prefix. Check database connection.');
        }

        await sock.sendMessage(from, {
            react: { text: '🌀', key: msg.key }
        });

        const successPayload = 
`╭─⌈ ⚙️ *Settings Updated* ⌋
│ Prefix changed to: ${newPrefix}
│ Status: Applied instantly
╰⊷ *${state.botName || 'Bunny MD'}*`;

        await sock.sendMessage(from, { 
            text: successPayload 
        }, { 
            quoted: msg 
        });

    } catch (commandException) {
        console.error(`[Command Exception] Critical failure inside settings/setprefix.js execution tree:`, commandException.message);
        await ctx.reply('Failed to update prefix. Check database connection.');
    }
}