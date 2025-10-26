// Required Libraries
const { 
    Client, GatewayIntentBits, Events, EmbedBuilder 
} = require('discord.js');
const fs = require('fs').promises; 
require('dotenv').config();

// Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages, // Needed for reading messages
        GatewayIntentBits.MessageContent // Needed for reading message content (the '!')
    ],
});

const PREFIX = '!'; // Define the command prefix
let marketData = []; // Will hold the item data

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
        .setFooter({ text: `Use ${PREFIX}price [Item Name] to check price.` });
}


// Client Ready Event
client.once(Events.ClientReady, async () => {
    await loadMarketData();
    console.log(`✅ Bot is Ready! Logged in as ${client.user.tag}`);
    console.log(`⚙️ Bot is listening for '${PREFIX}' commands.`);
});

// Message Listener for Prefix Commands
client.on(Events.MessageCreate, async message => {
    // Ignore messages from other bots or messages that don't start with the prefix
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    if (marketData.length === 0) {
        await message.reply('Error: Market data is currently unavailable. Please check the logs.');
        return;
    }

    // Split message into command and arguments
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ping') {
        await message.reply('Pong!');
        return;
    }

    if (command === 'price') {
        const query = args.join(' ').toLowerCase().trim();

        if (!query) {
            // Case 1: No query provided (show the list)
            const allItems = marketData.map(item => `\`${item.name}\``).join(' | ');
            
            const listEmbed = new EmbedBuilder()
                .setColor(0xfdcb6e)
                .setTitle('📋 Market Item List')
                .setDescription(`Please specify an item from the list below:\n\n${allItems}`)
                .setFooter({ text: `Use ${PREFIX}price [Item Name]` });

            await message.reply({ embeds: [listEmbed] });
            return;
        }

        // Case 2: Query provided (search for the item)
        const foundItem = marketData.find(item => 
            item.name.toLowerCase() === query || 
            item.name.toLowerCase().includes(query)
        );

        if (foundItem) {
            const priceEmbed = createPriceEmbed(foundItem);
            await message.reply({ embeds: [priceEmbed] });
        } else {
            await message.reply(`❌ Item not found. Please use \`${PREFIX}price\` for the full list of items.`);
        }
    }
});

// Bot Login
client.login(process.env.BOT_TOKEN).catch(error => {
    // This catches the TokenInvalid error if the token is still wrong.
    console.error('❌ BOT LOGIN FAILED. Please ensure BOT_TOKEN in Railway variables is correct.', error);
});
