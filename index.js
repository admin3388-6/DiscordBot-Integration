// Required Libraries
const { 
    Client, GatewayIntentBits, Events, EmbedBuilder 
} = require('discord.js');
const fs = require('fs').promises; 
require('dotenv').config();

// Client Setup: We need intents to read messages and content
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ],
});

const PREFIX = '!'; // Define the command prefix
let marketData = []; // Will hold the item data

// New: Map for Arabic-to-English translation to support Arabic search
const arabicItemMap = new Map([
    // أضف هنا المزيد من الترجمات التي تحتاجها - القيمة هنا يجب أن تكون الاسم الإنجليزي الصحيح في market_data.json
    ['الماس', 'Diamond'],
    ['دايموند', 'Diamond'],
    ['ذهب', 'Gold'],
    ['سيف', 'Sword'],
    ['فأس', 'Axe'],
    ['حديد', 'Iron'],
    ['خشب', 'Wood'],
    ['درع', 'Armor'],
]);

// --- Helper Functions ---

// Function to parse price (1b, 50m) into a number 
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

// Function to generate the price Embed for a specific item
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


// --- Bot Events ---

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

    // Split message into command and arguments
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Check if market data is loaded
    if (marketData.length === 0 && command !== 'ping') {
        await message.reply('Error: Market data is currently unavailable. Please check the bot host logs.');
        return;
    }

    // 1. !ping command
    if (command === 'ping') {
        await message.reply('Pong!');
        return;
    }

    // 2. !help command
    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099ff) 
            .setTitle('📚 Bot Command Guide')
            .setDescription(`مرحباً! أنا هنا لمساعدتك في الحصول على أسعار أغراض السوق. جميع الأوامر تبدأ بالبادئة \`${PREFIX}\`.\n\n**الأوامر المتاحة:**`)
            .addFields(
                { 
                    name: `💡 \`${PREFIX}price\``, 
                    value: 'لعرض **قائمة بجميع الأغراض المتاحة** للاستعلام عنها في السوق.', 
                    inline: false 
                },
                { 
                    name: `🏷️ \`${PREFIX}price [اسم الغرض]\``, 
                    value: 'للحصول على **سعر وتفاصيل غرض محدد**. مثال: `!price Diamond` أو `!price الماس`', 
                    inline: false 
                },
                { 
                    name: `❓ \`${PREFIX}help\``, 
                    value: 'لعرض هذا الدليل مجدداً.', 
                    inline: true 
                },
                { 
                    name: `🧪 \`${PREFIX}ping\``, 
                    value: 'لفحص حالة البوت (يجب أن يرد بـ Pong!).', 
                    inline: true 
                }
            )
            .setFooter({ text: 'سهولة الوصول إلى معلومات السوق بين يديك!' });

        await message.reply({ embeds: [helpEmbed] });
        return;
    }

    // 3. !price command
    if (command === 'price') {
        const query = args.join(' ').toLowerCase().trim();

        if (!query) {
            // Case 1: No query provided (show the list)
            const allItems = marketData.map(item => `\`${item.name}\``);
            
            // Chunk the list into fields
            const chunkedItems = [];
            for (let i = 0; i < allItems.length; i += 20) {
                chunkedItems.push(allItems.slice(i, i + 20));
            }

            const listEmbed = new EmbedBuilder()
                .setColor(0xfdcb6e)
                .setTitle('📋 Market Item List (Available Items)')
                .setDescription(`الرجاء تحديد غرض من القوائم أدناه. استخدم \`${PREFIX}price [Item Name]\`:\n\n`)
                .setFooter({ text: `Total Items: ${marketData.length}` });

            // Add fields for the items
            chunkedItems.forEach((chunk, index) => {
                listEmbed.addFields({ 
                    name: `Group ${index + 1}`, 
                    value: chunk.join(' | '), 
                    inline: false 
                });
            });


            await message.reply({ embeds: [listEmbed] });
            return;
        }

        // Case 2: Query provided (search for the item)
        let searchName = query;
        
        // Check if the query is an Arabic name and map it to the English name
        if (arabicItemMap.has(query)) {
            searchName = arabicItemMap.get(query).toLowerCase();
        }

        const foundItem = marketData.find(item => 
            // 1. Exact match with English name (or mapped Arabic name)
            item.name.toLowerCase() === searchName || 
            // 2. Partial match with English name (for easier typing)
            item.name.toLowerCase().includes(searchName)
        );

        if (foundItem) {
            const priceEmbed = createPriceEmbed(foundItem);
            await message.reply({ embeds: [priceEmbed] });
        } else {
            await message.reply(`❌ الغرض غير موجود. الرجاء استخدام \`${PREFIX}price\` لرؤية القائمة الكاملة.`);
        }
    }
});

// Bot Login
client.login(process.env.BOT_TOKEN).catch(error => {
    // Crucial error logging for token issue
    if (error.code === 'TokenInvalid') {
        console.error('❌ FATAL ERROR: BOT LOGIN FAILED. The provided BOT_TOKEN is INVALID.');
        console.error('>> الرجاء التأكد من تغيير الرمز السري (Token) في بوابة مطوري ديسكورد ثم تحديث متغير BOT_TOKEN في Railway.');
    } else {
        console.error('❌ An unexpected error occurred during bot login:', error);
    }
});
