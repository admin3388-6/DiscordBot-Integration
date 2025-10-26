// استدعاء المكتبات الضرورية
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs').promises; // لقراءة ملفات النظام
require('dotenv').config(); // لتعمل متغيرات البيئة مثل BOT_TOKEN

// إعدادات البوت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // مهم لقراءة محتوى الأمر
    ],
});

let marketData = []; // المتغير الذي سيحمل بيانات السوق

// دالة تحويل السعر (1b, 50m) إلى رقم 
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    const lowerPrice = priceStr.toLowerCase().replace(/,/g, '');
    let multiplier = 1;
    
    if (lowerPrice.includes('b')) { // مليار
        multiplier = 1000000000;
    } else if (lowerPrice.includes('m')) { // مليون
        multiplier = 1000000;
    } else if (lowerPrice.includes('k')) { // ألف
        multiplier = 1000;
    }
    
    const numericPart = parseFloat(lowerPrice.replace(/[bmk]/g, ''));
    return isNaN(numericPart) ? 0 : numericPart * multiplier;
}

// دالة تحميل بيانات السوق
async function loadMarketData() {
    try {
        const data = await fs.readFile('./market_data.json', 'utf8');
        const items = JSON.parse(data);
        
        // تجهيز البيانات
        marketData = items.map(item => ({
            ...item,
            numericPrice: parsePrice(item.price)
        }));
        
        console.log(`✅ تم تحميل ${marketData.length} غرضاً من ملف السوق.`);
    } catch (error) {
        console.error('❌ خطأ فادح: لم يتم العثور على ملف market_data.json أو كان تالفا! لن يتمكن البوت من الرد على أوامر الأسعار.', error);
        marketData = [];
    }
}

// تشغيل البوت
client.once('ready', async () => {
    // تحميل البيانات عند تشغيل البوت
    await loadMarketData();

    console.log(`✅ البوت جاهز! تم تسجيل الدخول كـ ${client.user.tag}`);
    console.log(`⚙️ البوت الآن يستطيع الرد على أمر !سعر`);
});


// منطق الرد على الأوامر
client.on('messageCreate', message => {
    if (message.author.bot) return;

    const prefix = '!';
    const content = message.content.trim();

    // 1. أمر البحث عن السعر
    if (content.startsWith(`${prefix}سعر `) || content.startsWith(`${prefix}price `)) {
        
        // تحديد الأمر المستخدم واستخراج اسم الغرض المطلوب
        const command = content.startsWith(`${prefix}سعر `) ? `${prefix}سعر ` : `${prefix}price `;
        const itemName = message.content.slice(command.length).trim();
        
        if (!itemName) {
            return message.reply(`الرجاء تحديد اسم الغرض بعد الأمر. مثال: \`!سعر Jester Hat\``);
        }

        // البحث عن الغرض (البحث الجزئي وغير الحساس لحالة الأحرف)
        const normalizedSearchTerm = itemName.toLowerCase();
        const foundItem = marketData.find(item => 
            item.name.toLowerCase().includes(normalizedSearchTerm)
        );

        if (foundItem) {
            const statusEmoji = foundItem.sales === 'hot' ? '🔥' : '❄️';
            
            // بناء رسالة الرد بتنسيق Embed جميل
            const replyMessage = {
                embeds: [{
                    color: foundItem.sales === 'hot' ? 0xff6b6b : 0x6bb0ff, // لون أحمر (ساخن) أو أزرق (بارد)
                    title: `🏷️ ${foundItem.name}`,
                    fields: [
                        {
                            name: '💰 السعر الحالي',
                            value: `**${foundItem.price}**`,
                            inline: true,
                        },
                        {
                            name: '🌟 الحالة',
                            value: `${statusEmoji} ${foundItem.sales === 'hot' ? 'ساخن (Hot)' : 'بارد (Cold)'}`,
                            inline: true,
                        },
                        {
                            name: '🗓️ آخر تحديث',
                            value: foundItem.lastUpdate,
                            inline: true,
                        },
                        {
                            name: '📦 التصنيف',
                            value: foundItem.category,
                            inline: true,
                        },
                    ],
                    thumbnail: {
                        url: foundItem.icon,
                    },
                    footer: {
                        text: 'بحث السوق عبر البوت',
                    },
                }]
            };
            message.reply(replyMessage);
        } else {
            message.reply(`عفواً، لم أجد غرضاً باسم **${itemName}** في قائمة الأسعار. (حاول كتابة جزء من الاسم فقط).`);
        }
    }
    
    // 2. أمر البينج التجريبي
    if (content === `${prefix}ping`) {
        message.reply('Pong! البوت يعمل.');
    }
});

// تسجيل دخول البوت
client.login(process.env.BOT_TOKEN);
