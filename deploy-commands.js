const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// Get the necessary environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; 
const GUILD_ID = process.env.GUILD_ID; 

// Define the /price command structure (It does not need any options now, as it will use a Select Menu)
const commands = [
    new SlashCommandBuilder()
        .setName('price')
        .setDescription('Get the current price and details of a market item using a select menu.'),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong! (Health check).')
];

// Convert commands to JSON format
const commandsJson = commands.map(command => command.toJSON());

// Deploy the commands using REST API
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
    // Check if required IDs are set
    if (!CLIENT_ID || !GUILD_ID || !BOT_TOKEN) {
        console.error("Missing CLIENT_ID, GUILD_ID, or BOT_TOKEN. Cannot deploy commands.");
        return;
    }

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Deploy to the specific Guild (Server) ID
        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commandsJson },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands on Guild ID: ${GUILD_ID}`);
        
    } catch (error) {
        console.error('Error deploying commands:', error);
        console.log('----------------------------------------------------');
        console.log('Deployment Failed. Please ensure BOT_TOKEN, CLIENT_ID, and GUILD_ID are correctly set in your .env or Railway variables.');
        console.log('----------------------------------------------------');
    }
})();
