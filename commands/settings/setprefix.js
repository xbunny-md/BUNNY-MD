module.exports = { 
    commandConfig, 
    executeAutonomousCommand 
};

/**
 * Metadata Configuration Block for Dynamic System Menu Generation
 */
const commandConfig = {
    name: 'setprefix',
    category: 'settings',
    description: 'Update the bot command prefix in real-time without restart.'
};

/**
 * Prefix Update Command Node
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
                text: `Usage: ${config.prefix || '.'}setprefix <new_prefix>\nExample: ${config.prefix || '.'}setprefix !`
            }, { quoted: msg });
        }

        const newPrefix = query.trim();

        await supabase
            .from('bunny_settings')
            .update({ extra_data: { current: newPrefix } })
            .eq('client_id', clientId)
            .eq('setting_name', 'prefix');

        await sock.sendMessage(remoteJid, {
            react: { text: '🌀', key: msg.key }
        });

        const successPayload = 
`╭─⌈ ⚙️ *Settings Updated* ⌋
│ Prefix changed to: ${newPrefix}
│ Status: Applied instantly
╰⊷ *${config.bot_name || 'Bunny MD'}*`;

        await sock.sendMessage(remoteJid, { 
            text: successPayload 
        }, { 
            quoted: msg 
        });

    } catch (commandException) {
        console.error(`[Command Exception] Critical failure inside settings/setprefix.js execution tree:`, commandException.message);
        
        await sock.sendMessage(remoteJid, { 
            text: `\`\`Failed to update prefix. Check database connection.\`\`` 
        }, { 
            quoted: msg 
        });
    }
}
