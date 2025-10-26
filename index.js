// استدعاء مكتبات ديسكورد
const { Client, GatewayIntentBits } = require('discord.js');

// تعريف البوت وتحديد المهام (Intents)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           
        GatewayIntentBits.GuildMessages,    
        GatewayIntentBits.MessageContent,   
    ],
});

// عندما يتصل البوت بنجاح
client.once('ready', () => {
    console.log(`✅ البوت جاهز! تم تسجيل الدخول كـ ${client.user.tag}`);
});

// عندما يرسل أي مستخدم رسالة (الأمر التجريبي)
client.on('messageCreate', message => {
    if (message.author.bot) return;

    if (message.content === '!ping') {
        message.reply('Pong!');
    }
});

// تسجيل دخول البوت باستخدام التوكن المحفوظ في متغير بيئة
client.login(process.env.BOT_TOKEN);
