// Required Libraries
const { 
    Client, GatewayIntentBits, Events, EmbedBuilder, 
    ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder 
} = require('discord.js');
const fs = require('fs').promises; 
require('dotenv').config();

// Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});

let marketData = []; // Will hold the item data
const CUSTOM_ID_PREFIX = 'select_price_'; // Prefix for the interactive menu

// Helper function to parse price (1b, 50m) into a number 
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    const lowerPrice = priceStr.toLowerCase().replace(/,/g, '');
    let multiplier = 1;
    
    if (lowerPrice.includes('b')) { 
        multiplier = 1000000000;
    } else if (lowerPrice.includes('m')) { 
        multiplier = 1000000;
    } else if (lowerPrice.includes('k')) { 
        multiplier = 1000;
    }
    
    const numericPart = parseFloat(lowerPrice.replace(/[bmk]/g, ''));
    return isNaN(numericPart) ? 0 : numericPart * multiplier;
}

// Function to load market data from JSON file
async function loadMarketData() {
    try {
        const data = await fs.readFile('./market_data.json', 'utf8');
        const items = JSON.parse(data);
        
        marketData = items.map(item => ({
            ...item,
            numericPrice: parsePrice(item.price)
        }));
        
        console.log(`✅ Successfully loaded ${marketData.length} items from market_data.json.`);
    } catch (error) {
        console.error('❌ FATAL ERROR: Could not find or parse market_data.json! Commands will fail.', error);
        marketData = [];
    }
}

// Function to generate the price Embed
function createPriceEmbed(item) {
    const statusEmoji = item.sales === 'hot' ? '🔥' : '❄️';
    
    return new EmbedBuilder()
        .setColor(item.sales === 'hot' ? 0xff6b6b : 0x6bb0ff)
        .setTitle(`🏷️ ${item.name}`)
        .addFields(
            { name: '💰 Current Price', value: `**${item.price}**`, inline: true },
            { name: '🌟 Status', value: `${statusEmoji} ${item.sales === 'hot' ? 'Hot' : 'Cold'}`, inline: true },
            { name: '🗓️ Last Update', value: item.lastUpdate, inline: true },
            { name: '📦 Category', value: item.category, inline: true }
        )
        .setThumbnail(item.icon)
        .setFooter({ text: 'Market Search powered by Bot' });
}


// Client Ready Event
client.once(Events.ClientReady, async () => {
    await loadMarketData();
    console.log(`✅ Bot is Ready! Logged in as ${client.user.tag}`);
    console.log(`⚙️ Bot is listening for Slash Commands and Interactions.`);
});


// Interaction (Slash Command) Listener
client.on(Events.InteractionCreate, async interaction => {
    if (marketData.length === 0) {
        if (interaction.isRepliable()) {
             await interaction.reply({ content: 'Error: Market data is currently unavailable. Please check the logs.', ephemeral: true });
        }
        return;
    }

    // --- 1. Handle Slash Commands (/command) ---
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'ping') {
            await interaction.reply({ content: 'Pong!', ephemeral: true });
            
        } else if (commandName === 'price') {
            
            // Build the Select Menu options
            const options = marketData.map(item => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(item.name)
                    // The value will be the exact item name, which we will search for later
                    .setValue(item.name) 
                    .setDescription(`Price: ${item.price} | Status: ${item.sales}`)
            );
            
            // Create the Select Menu
            const select = new StringSelectMenuBuilder()
                .setCustomId(CUSTOM_ID_PREFIX + 'item_select')
                .setPlaceholder('Select an item to check its price...')
                .addOptions(options);

            // Create the Action Row (the container for the menu)
            const row = new ActionRowBuilder()
                .addComponents(select);

            // Send the menu to the user
            await interaction.reply({
                content: 'Please select an item from the list below:',
                components: [row],
                ephemeral: true // Make the message private to the user
            });
        }
    }

    // --- 2. Handle Select Menu Interactions (User selection) ---
    if (interaction.isStringSelectMenu()) {
        if (!interaction.customId.startsWith(CUSTOM_ID_PREFIX)) return;

        await interaction.deferReply({ ephemeral: true }); // Acknowledge the interaction immediately

        const selectedItemName = interaction.values[0];
        
        // Find the selected item from the loaded data
        const foundItem = marketData.find(item => item.name === selectedItemName);

        if (foundItem) {
            const priceEmbed = createPriceEmbed(foundItem);
            // Edit the reply to show the price embed
            await interaction.editReply({ 
                content: `You selected **${foundItem.name}**.`, 
                embeds: [priceEmbed], 
                components: [] // Remove the menu after selection
            });
        } else {
            await interaction.editReply({ content: 'Error: Could not find the price for the selected item.', components: [] });
        }
    }
});

// Bot Login
client.login(process.env.BOT_TOKEN);
