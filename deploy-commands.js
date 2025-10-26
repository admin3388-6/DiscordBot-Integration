const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// Get the necessary environment variables from .env file (BOT_TOKEN and CLIENT_ID)
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; 
const GUILD_ID = process.env.GUILD_ID; // The ID of your Discord Server (Guild)

// Define the /price command structure
const commands = [
    new SlashCommandBuilder()
        .setName('price')
        .setDescription('Checks the current price and details of a market item.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The name of the item you want to check.')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong! (Health check).')
];

// Convert commands to JSON format
const commandsJson = commands.map(command => command.toJSON());

// Deploy the commands using REST API
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Use GUILD_ID for development (faster) or Routes.applicationCommands(CLIENT_ID) for global deployment (slower)
        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commandsJson },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands on Guild ID: ${GUILD_ID}`);
        
    } catch (error) {
        console.error('Error deploying commands:', error);
        console.log('----------------------------------------------------');
        console.log('Deployment Failed. Please check the following:');
        console.log('1. BOT_TOKEN, CLIENT_ID, and GUILD_ID are correct.');
        console.log('2. The bot has the application.commands scope enabled.');
        console.log('3. Run the script using "npm run deploy-commands"');
        console.log('----------------------------------------------------');
    }
})();
