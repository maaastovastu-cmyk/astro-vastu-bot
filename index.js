const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('✅ Astro Bot 24/7 Active!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const MICRO_SHEET_ID = process.env.MICRO_SHEET_ID;
const MASTER_SHEET_ID = process.env.MASTER_SHEET_ID;

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'astro-bot-v9' }), // Ekdam navo session jethi block hati jay
    puppeteer: { 
        executablePath: '/opt/render/project/src/.cache/chrome/linux-146.0.7680.31/chrome-linux64/chrome',
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', 
            '--disable-gpu',
            '--disable-web-security'
        ] 
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
});

let codeRequested = false;

client.on('qr', (qr) => {
    if (!codeRequested) {
        codeRequested = true;
        console.log('\n⏳ WhatsApp security check thai rahyu che. 15 second wait karo...');
        
        setTimeout(async () => {
            try {
                const pairingCode = await client.requestPairingCode('919426612172');
                console.log('\n====================================================');
                console.log('👉 TAMARO PAIRING CODE (8 Aakda):', pairingCode);
                console.log('====================================================\n');
            } catch (err) {
                console.log('❌ Pairing Code Error:', err.message);
            }
        }, 15000);
    }
});

client.on('ready', () => console.log('✅ Bot is Ready!'));

client.on('disconnected', (reason) => {
    console.log('❌ Bot Disconnected:', reason);
    client.initialize();
});

const userState = {};

client.on('message', async (msg) => {
    const chatId = msg.from;
    const text = msg.body.trim();

    // Bot pote potane message na aape te mate
    if (msg.fromMe) return;

    if (!userState[chatId]) {
        userState[chatId] = { step: 1 };
        return msg.reply('Namaste! Amit bhai ni Astro-Vastu Consultancy ma tamaru swagat che.\n\nKundali ane Vastu margdarshan mate krupa kari tamari details aapo.\nTamaru Naam su che?');
    }

    const state = userState[chatId];

    if (state.step === 1) {
        state.name = text;
        state.step = 2;
        return msg.reply('Tamari Janma Tarikh su che? (Da.ta. 12-05-1990)');
    } 
    else if (state.step === 2) {
        state.dob = text;
        state.step = 3;
        return msg.reply('Tamaro Janma Samay su che? (Da.ta. 10:30 AM)');
    }
    else if (state.step === 3) {
        state.tob = text;
        state.step = 4;
        return msg.reply('Tamaru Janma Sthal (Birth Place) su che?');
    }
    else if (state.step === 4) {
        state.pob = text;
        state.step = 5;
        return msg.reply('Tamaro Prashna su che? (Je plan select karvo hoy te kaho: 199 ke 1100)');
    }
    else if (state.step === 5) {
        state.question = text;
        const targetSheet = text.includes('1100') ? MASTER_SHEET_ID : MICRO_SHEET_ID;

        try {
            await sheets.spreadsheets.values.append({
                spreadsheetId: targetSheet,
                range: 'Sheet1!A:F',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[new Date().toLocaleDateString(), state.name, state.dob, state.tob, state.pob, state.question]] }
            });
            msg.reply(`✅ Dhanyavad ${state.name}! Tamari details save thai gai che. Grah gintari chalu che. Ame jaldij reply karisu.`);
        } catch (err) {
            console.error(err);
            msg.reply('❌ Details save karvama error aavi che.');
        }
        delete userState[chatId];
    }
});

client.initialize();
