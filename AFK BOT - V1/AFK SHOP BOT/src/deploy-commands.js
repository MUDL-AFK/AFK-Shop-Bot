const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Load config and immediately check its contents
let config;
try {
    config = require('../config.json');
    console.log('Full config loaded:', JSON.stringify(config, null, 2));
} catch (error) {
    console.error('Error loading config:', error);
    process.exit(1);
}

// Validate required config values
if (!config.clientId) {
    console.error('Error: clientId is not defined in config.json');
    process.exit(1);
}

if (!config.guildid) {
    console.error('Error: guildid is not defined in config.json');
    process.exit(1);
}

if (!config.token) {
    console.error('Error: token is not defined in config.json');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Check if commands directory exists
if (!fs.existsSync(commandsPath)) {
    console.error(`Commands directory not found at: ${commandsPath}`);
    process.exit(1);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
console.log('Found command files:', commandFiles);

// Load all command files from the commands directory
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if ('data' in command) {
            commands.push(command.data.toJSON());
            console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" property.`);
        }
    } catch (error) {
        console.error(`Error loading command from ${filePath}:`, error);
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.token);

// Deploy commands
(async () => {
    try {
        console.log('Configuration being used:');
        console.log('Client ID:', config.clientId);
        console.log('Guild ID:', config.guildid);
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Deploy to a specific guild instead of globally
        const data = await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildid),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('Error deploying commands:', error);
        if (error.code === 50035) {
            console.error('Invalid client ID or guild ID. Please check your config.json file.');
            console.error('Client ID type:', typeof config.clientId);
            console.error('Guild ID type:', typeof config.guildid);
        }
    }
})(); 