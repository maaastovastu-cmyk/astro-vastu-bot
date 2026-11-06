const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const express = require('express');
const swisseph = require('swisseph-v2');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Astro Bot is Running! Check Logs.'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const MICRO_SHEET_ID = process.env.MICRO_SHEET_ID;
const MASTER_SHEET_ID = process.env.MASTER_SHEET_ID;

const client = new Client({
    // Nayo session ID jethi juno kachro clear thai jay
    authStrategy: new LocalAuth({ clientId: 'astro-bot-v5' }),
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
            '--disable-gpu'
        ] 
    }
});

let codeRequested = false;

client.on('qr', async (qr) => {
    if (!codeRequested) {
        codeRequested = true;
        console.log('\n⏳ Server WhatsApp sathe connect thai rahyu che...');
        
        try {
            // Khali Pairing code j mangshe, QR code print nai kare
            const pairingCode = await client.requestPairingCode('919426612172');
            console.log('\n====================================================');
            console.log('👉 TAMARO PAIRING CODE (8 Aakda):', pairingCode);
            console.log('====================================================\n');
        } catch (err) {
            console.log('❌ Pairing Code Error:', err.message);
        }
    }
});

client.on('ready', () => console.log('✅ Bot is Ready!'));

// Error aave to exact reason khabar pade
client.on('auth_failure', msg => console.error('❌ Auth Failure (Login fail thayu):', msg));
client.on('disconnected', reason => console.log('❌ Disconnected:', reason));

const userState = {};

client.on('message', async (msg) => {
    const chatId = msg.from;
    const text = msg.body.trim();

    if (!userState[chatId]) {
        userState[chatId] = { step: 1 };
        return msg.reply('Namaste! ShivShakti Tour & Travels ane Astro-Vastu ma tamaru swagat che.\n\nKrupa kari tamari details aapo.\nTamaroo Naam su che?');
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
