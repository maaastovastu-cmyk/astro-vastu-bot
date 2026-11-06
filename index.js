const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const express = require('express');
const swisseph = require('swisseph-v2');

const app = express();
const PORT = process.env.PORT || 3000;

// 👇 CHANGE THIS TO YOUR WHATSAPP NUMBER (Start with 91 for India) 👇
const MY_PHONE_NUMBER = '919426612172'; 
// 👆 ----------------------------------------------------------- 👆

let pairingCode = '';

app.get('/', (req, res) => {
    if (pairingCode === 'READY') {
        res.send('<h1 style="text-align:center; margin-top:50px; color:green;">✅ Bot is Ready and Linked with WhatsApp!</h1>');
    } else if (pairingCode) {
        res.send(`
            <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
                <h2>Your WhatsApp Pairing Code:</h2>
                <h1 style="font-size: 50px; letter-spacing: 5px; color: #075E54; background: #e9edef; padding: 20px; display: inline-block; border-radius: 10px;">${pairingCode}</h1>
                <p style="font-size: 18px; color: #555;">Open WhatsApp > Linked Devices > <b>Link with phone number</b> > Enter this code.</p>
            </div>
        `);
    } else {
        res.send('<h1 style="text-align:center; margin-top:50px;">⏳ Generating Pairing Code... Please wait 15-20 seconds and refresh this page.</h1>');
    }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const MICRO_SHEET_ID = process.env.MICRO_SHEET_ID;
const MASTER_SHEET_ID = process.env.MASTER_SHEET_ID;

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'astro-bot-v2' }), 
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
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

let codeRequested = false;

client.on('qr', async (qr) => {
    if (!codeRequested) {
        try {
            console.log('Generating pairing code for:', MY_PHONE_NUMBER);
            const code = await client.requestPairingCode(MY_PHONE_NUMBER);
            pairingCode = code;
            console.log('\n========================================');
            console.log('👉 YOUR PAIRING CODE IS:', code);
            console.log('========================================\n');
            codeRequested = true;
        } catch (error) {
            console.error('Error generating pairing code:', error);
        }
    }
});

client.on('ready', () => {
    pairingCode = 'READY';
    console.log('✅ Bot is Ready!');
});

const userState = {};

client.on('message', async (msg) => {
    const chatId = msg.from;
    const text = msg.body.trim();

    if (!userState[chatId]) {
        userState[chatId] = { step: 1 };
        return msg.reply('Namaste! ShivShakti Tour & Travels and Astro-Vastu welcomes you.\n\nPlease provide your details.\nWhat is your Name?');
    }

    const state = userState[chatId];

    if (state.step === 1) {
        state.name = text;
        state.step = 2;
        return msg.reply('What is your Date of Birth? (e.g. 12-05-1990)');
    } 
    else if (state.step === 2) {
        state.dob = text;
        state.step = 3;
        return msg.reply('What is your Time of Birth? (e.g. 10:30 AM)');
    }
    else if (state.step === 3) {
        state.tob = text;
        state.step = 4;
        return msg.reply('What is your Place of Birth?');
    }
    else if (state.step === 4) {
        state.pob = text;
        state.step = 5;
        return msg.reply('What is your Question? (Mention the plan you want: 199 or 1100)');
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
            msg.reply(`✅ Thank you ${state.name}! Your details are saved. Planetary calculation is in progress. We will reply shortly.`);
        } catch (err) {
            console.error(err);
            msg.reply('❌ Error saving details.');
        }
        delete userState[chatId];
    }
});

client.initialize();
