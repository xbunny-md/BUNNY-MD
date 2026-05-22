const fs = require('fs');
const path = require('path');

async function loadCommands() {
    const commands = new Map();
    const aliases = new Map();
    const observers = [];

    const commandsPath = path.join(__dirname, 'commands');

    if (!fs.existsSync(commandsPath)) {
        console.log('[Loader] No commands folder found');
        return { commands, aliases, observers };
    }

    const categories = fs.readdirSync(commandsPath).filter(file =>
        fs.statSync(path.join(commandsPath, file)).isDirectory()
    );

    for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);
        const files = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

        for (const file of files) {
            const filePath = path.join(categoryPath, file);
            try {
                delete require.cache[require.resolve(filePath)];
                const module = require(filePath);

                // Handle both formats:
                // New: module.exports = { config, execute }
                // Old: module.exports = { commandConfig, executeAutonomousCommand }
                let config, execute;

                if (module.config && module.execute) {
                    config = module.config;
                    execute = module.execute;
                } else if (module.commandConfig && module.executeAutonomousCommand) {
                    config = module.commandConfig;
                    execute = module.executeAutonomousCommand;
                } else {
                    console.log(`[Loader] Skipped ${file}: Invalid export format`);
                    continue;
                }

                if (!config?.name ||!execute) {
                    console.log(`[Loader] Skipped ${file}: Missing name or execute`);
                    continue;
                }

                commands.set(config.name, { config, execute });

                // Register aliases
                if (config.alias && Array.isArray(config.alias)) {
                    config.alias.forEach(alias => aliases.set(alias, config.name));
                }

                console.log(`[Loader] Loaded ${config.name} from ${category}/${file}`);

            } catch (err) {
                console.error(`[Loader] Failed to load ${file}:`, err.message);
            }
        }
    }

    console.log(`[Loader] Loaded ${commands.size} commands, ${aliases.size} aliases`);
    return { commands, aliases, observers };
}

module.exports = { loadCommands };