// Required Libraries
const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises; // File system module
require('dotenv').config();

// Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
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
    await loadMarketData();
    console.log(`✅ Bot is Ready! Logged in as ${client.user.tag}`);
    console.log(`⚙️ Bot is listening for '!' commands.`);
});


// Message Command Listener
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    const prefix = '!';
    const content = message.content.trim().toLowerCase();
    const fullContent = message.content.trim();

    // 1. HELP Command: !help
    if (content === `${prefix}help`) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Bot Commands List')
            .setDescription('Here are the available commands to interact with the market data:')
            .addFields(
                { name: `\`${prefix}price <Item Name>\``, value: 'Get the current price and details of a specific item. (e.g., `!price Jester Hat`)', inline: false },
                { name: `\`${prefix}list\``, value: `Show a list of all available items in the database.`, inline: true },
                { name: `\`${prefix}ping\``, value: 'Check if the bot is operational.', inline: true },
                { name: 'Tip', value: 'For `!price`, you can search for just part of the item name!', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Use these commands to access the market database.' });
        
        return message.reply({ embeds: [helpEmbed] });
    }

    // 2. LIST Command: !list
    if (content === `${prefix}list`) {
        if (marketData.length === 0) {
            return message.reply('Error: Market data is unavailable. Cannot list items.');
        }

        // Get only the item names
        const itemNames = marketData.map(item => item.name);
        
        // Format the names into columns/groups for a clean message
        let listMessage = "## Available Market Items:\n";
        
        // Split list into chunks of 10 items per line for better readability
        const chunkSize = 10;
        for (let i = 0; i < itemNames.length; i += chunkSize) {
            listMessage += itemNames.slice(i, i + chunkSize).join(' | ') + '\n';
        }

        // Add note to copy-paste the name for the price command
        listMessage += "\n**Copy the name of the item and use it with the `!price` command.**";

        // Since the list might be long, check if it exceeds Discord's limit (2000 chars)
        if (listMessage.length > 2000) {
            // If too long, simplify the list (Discord has limits for simple messages)
            listMessage = `List too long for one message. Found ${marketData.length} items. Use \`!price <part of name>\` to search.`;
        }

        return message.reply(listMessage);
    }
    
    // 3. Price Command: !price <item name>
    if (fullContent.toLowerCase().startsWith(`${prefix}price `)) {
        
        if (marketData.length === 0) {
            return message.reply('Error: Market data is unavailable. Check the console for errors.');
        }

        const command = `${prefix}price `;
        // Note: Use fullContent here to preserve item name casing
        const itemName = fullContent.slice(command.length).trim();
        
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
            const replyMessage = new EmbedBuilder()
                .setColor(foundItem.sales === 'hot' ? 0xff6b6b : 0x6bb0ff)
                .setTitle(`🏷️ ${foundItem.name}`)
                .addFields(
                    { name: '💰 Current Price', value: `**${foundItem.price}**`, inline: true },
                    { name: '🌟 Status', value: `${statusEmoji} ${foundItem.sales === 'hot' ? 'Hot' : 'Cold'}`, inline: true },
                    { name: '🗓️ Last Update', value: foundItem.lastUpdate, inline: true },
                    { name: '📦 Category', value: foundItem.category, inline: true }
                )
                .setThumbnail(foundItem.icon)
                .setFooter({ text: 'Market Search powered by Bot' });
            
            await message.reply({ embeds: [replyMessage] });

        } else {
            await message.reply(`Sorry, could not find an item named **${itemName}**. Try searching for part of the name.`);
        }
    }
    
    // 4. Ping Command: !ping
    if (content === `${prefix}ping`) {
        await message.reply('Pong! Bot is operational.');
    }
});

// Bot Login
client.login(process.env.BOT_TOKEN);
