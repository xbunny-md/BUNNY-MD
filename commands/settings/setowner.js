module.exports = { 
    config: commandConfig, 
    execute: executeAutonomousCommand 
};

/**
 * Metadata Configuration Block for Dynamic System Menu Generation
 */
const commandConfig = {
    name: 'setowner',
    alias: ['sowner'],
    category: 'settings',
    description: 'Update the bot owner number in real-time without restart.'
};

/**
 * Owner Update Command Node
 */
async function executeAutonomousCommand(ctx) {
    const { sock, msg, from, state, args, isOwner } = ctx;

    try {
        if (!isOwner) {
            return await ctx.reply('Access Denied. Only the owner can change settings.');
        }

        const newOwner = args.join(' ').trim().replace(/[^0-9]/g, '');

        if (!newOwner) {
            return await ctx.reply(
                `Usage: ${state.prefix}setowner <number>\nExample: ${state.prefix}setowner 255780470905\nNote: Enter number without + or spaces`
            );
        }

        if (newOwner.length < 10) {
            return await ctx.reply(
                `Invalid number format. Use international format without +\nExample: 255780470905`
            );
        }

        const success = await state.updateSetting('owner_number', newOwner);
        
        if (!success) {
            return await ctx.reply('Failed to update owner number. Check database connection.');
        }

        await sock.sendMessage(from, {
            react: { text: '🏵️', key: msg.key }
        });

        const successPayload = 
`╭─⌈ ⚙️ *Settings Updated* ⌋
│ Owner number changed to: ${newOwner}
│ Status: Applied instantly
╰⊷ *${state.botName || 'Bunny MD'}*`;

        await sock.sendMessage(from, { 
            text: successPayload 
        }, { 
            quoted: msg 
        });

    } catch (commandException) {
        console.error(`[Command Exception] Critical failure inside settings/setowner.js execution tree:`, commandException.message);
        await ctx.reply('Failed to update owner number. Check database connection.');
    }
}