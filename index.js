const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { google } = require('googleapis');
const express = require('express');
const swisseph = require('swisseph-v2');

const app = express();
const PORT = process.env.PORT || 3000;

let currentQR = '';

app.get('/', (req, res) => {
    if (currentQR === 'READY') {
        res.send('<h1 style="text-align:center; margin-top:50px; color:green;">✅ Bot is Ready and Linked with WhatsApp!</h1>');
    } else if (currentQR) {
        res.send(`
            <html>
            <head>
                <title>Scan WhatsApp QR</title>
                <meta http-equiv="refresh" content="10">
            </head>
            <body style="display:flex; justify-content:center; align-items:center; height:100vh; background-color:#f4f4f9; font-family:sans-serif;">
                <div style="text-align:center; background:#fff; padding:40px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color:#333;">WhatsApp thi Scan Karo</h2>
                    <div id="qrcode" style="margin:20px auto; display:flex; justify-content:center;"></div>
                    <p style="color:#666; font-size:14px;">Aa code har 10 second e automatic nyo aavse (Auto-refresh).</p>
                    <p style="color:red; font-size:13px; font-weight:bold;">Jo "Couldn't link" aave to fari scan karo (Server ne set thata 2-3 try lagi sake che).</p>
                </div>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
                <script>
                    new QRCode(document.getElementById("qrcode"), {
                        text: "${currentQR}",
                        width: 260,
                        height: 260,
                        colorDark : "#000000",
                        colorLight : "#ffffff",
                        correctLevel : QRCode.CorrectLevel.M
                    });
                </script>
            </body>
            </html>
        `);
    } else {
        res.send('<h1 style="text-align:center; margin-top:50px;">⏳ Loading QR Code... 10 second pachi page refresh karo.</h1>');
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
    authStrategy: new LocalAuth({ clientId: 'astro-bot' }),
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
    // Bot ne asli browser tarike batavva mate:
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

client.on('qr', (qr) => {
    currentQR = qr;
    console.log('👉 Navo QR Code web page par aavi gayo che!');
});

client.on('ready', () => {
    currentQR = 'READY';
    console.log('✅ Bot is Ready!');
});

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
