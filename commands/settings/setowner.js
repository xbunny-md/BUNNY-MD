module.exports = { 
    commandConfig, 
    executeAutonomousCommand 
};

/**
 * Metadata Configuration Block for Dynamic System Menu Generation
 */
const commandConfig = {
    name: 'setowner',
    category: 'settings',
    description: 'Update the bot owner number in real-time without restart.'
};

/**
 * Owner Update Command Node
 */
async function executeAutonomousCommand(context) {
    const { sock, msg, remoteJid, query, supabase, config, isOwner, clientId } = context;

    try {
        if (!isOwner) {
            return await sock.sendMessage(remoteJid, {
                text: 'Access Denied. Only the owner can change settings.'
            }, { quoted: msg });
        }

        if (!query) {
            return await sock.sendMessage(remoteJid, {
                text: `Usage: ${config.prefix || '.'}setowner <number>\nExample: ${config.prefix || '.'}setowner 2557xxxxxxx\nNote: Enter number without + or spaces`
            }, { quoted: msg });
        }

        const newOwner = query.trim().replace(/[^0-9]/g, '');

        if (newOwner.length < 10) {
            return await sock.sendMessage(remoteJid, {
                text: `Invalid number format. Use international format without +\nExample: 255780470905`
            }, { quoted: msg });
        }

        await supabase
            .from('bunny_settings')
            .update({ extra_data: { current: newOwner } })
            .eq('client_id', clientId)
            .eq('setting_name', 'owner_number');

        await sock.sendMessage(remoteJid, {
            react: { text: '🏵️', key: msg.key }
        });

        const successPayload = 
`╭─⌈ ⚙️ *Settings Updated* ⌋
│ Owner number changed to: ${newOwner}
│ Status: Applied instantly
╰⊷ *${config.bot_name || 'Bunny MD'}*`;

        await sock.sendMessage(remoteJid, { 
            text: successPayload 
        }, { 
            quoted: msg 
        });

    } catch (commandException) {
        console.error(`[Command Exception] Critical failure inside settings/setowner.js execution tree:`, commandException.message);
        
        await sock.sendMessage(remoteJid, { 
            text: `\`\`Failed to update owner number. Check database connection.\`\`` 
        }, { 
            quoted: msg 
        });
    }
}
