// Required Libraries
const { Client, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs').promises; // File system module
require('dotenv').config();

// Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,    // REQUIRED for reading !commands
        GatewayIntentBits.MessageContent,   // REQUIRED for reading message content
    ],
});

let marketData = []; // Will hold the item data

// Helper function to parse price (1b, 50m) into a number 
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    const lowerPrice = priceStr.toLowerCase().replace(/,/g, '');
    let multiplier = 1;
    
    if (lowerPrice.includes('b')) { // billion
        multiplier = 1000000000;
    } else if (lowerPrice.includes('m')) { // million
        multiplier = 1000000;
    } else if (lowerPrice.includes('k')) { // thousand
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
        console.error('❌ FATAL ERROR: Could not find or parse market_data.json! Price commands will fail.', error);
        marketData = [];
    }
}

// Client Ready Event
client.once(Events.ClientReady, async () => {
    // Load data when the bot starts
    await loadMarketData();

    console.log(`✅ Bot is Ready! Logged in as ${client.user.tag}`);
    console.log(`⚙️ Bot is listening for '!' commands.`);
});


// Message Command Listener
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    const prefix = '!';
    const content = message.content.trim();

    // 1. Price Command: !price <item name>
    if (content.toLowerCase().startsWith(`${prefix}price `)) {
        
        if (marketData.length === 0) {
            return message.reply('Error: Market data is unavailable. Check the console for errors.');
        }

        const command = `${prefix}price `;
        const itemName = message.content.slice(command.length).trim();
        
        if (!itemName) {
            return message.reply(`Please specify the item name. Example: \`!price Jester Hat\``);
        }

        // Search for the item (partial and case-insensitive)
        const normalizedSearchTerm = itemName.toLowerCase();
        const foundItem = marketData.find(item => 
            item.name.toLowerCase().includes(normalizedSearchTerm)
        );

        if (foundItem) {
            const statusEmoji = foundItem.sales === 'hot' ? '🔥' : '❄️';
            
            // Build the Embed response
            const replyMessage = {
                embeds: [{
                    color: foundItem.sales === 'hot' ? 0xff6b6b : 0x6bb0ff, // Red (Hot) or Blue (Cold)
                    title: `🏷️ ${foundItem.name}`,
                    fields: [
                        {
                            name: '💰 Current Price',
                            value: `**${foundItem.price}**`,
                            inline: true,
                        },
                        {
                            name: '🌟 Status',
                            value: `${statusEmoji} ${foundItem.sales === 'hot' ? 'Hot' : 'Cold'}`,
                            inline: true,
                        },
                        {
                            name: '🗓️ Last Update',
                            value: foundItem.lastUpdate,
                            inline: true,
                        },
                        {
                            name: '📦 Category',
                            value: foundItem.category,
                            inline: true,
                        },
                    ],
                    thumbnail: {
                        url: foundItem.icon,
                    },
                    footer: {
                        text: 'Market Search powered by Bot',
                    },
                }]
            };
            await message.reply(replyMessage);

        } else {
            await message.reply(`Sorry, could not find an item named **${itemName}**. Try searching for part of the name.`);
        }
    }
    
    // 2. Ping Command: !ping
    if (content.toLowerCase() === `${prefix}ping`) {
        await message.reply('Pong! Bot is operational.');
    }
});

// Bot Login
client.login(process.env.BOT_TOKEN);
