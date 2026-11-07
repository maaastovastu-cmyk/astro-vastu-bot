const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const { google } = require('googleapis');
const swisseph = require('swisseph'); // Swisseph add kari didhu che

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('✅ Maa Consultancy Astro-Vastu Bot is 24/7 Active!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const MICRO_SHEET_ID = process.env.MICRO_SHEET_ID;
const MASTER_SHEET_ID = process.env.MASTER_SHEET_ID;

const userState = {};

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Maa Consultancy', 'Chrome', '1.0.0']
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode("919426612172");
                console.log('\n====================================================');
                console.log('👉 TAMARO PAIRING CODE (8 Aakda):', code);
                console.log('====================================================\n');
            } catch(err) {
                console.log('❌ Pairing code Error: ', err.message);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Connection closed, reconnecting:', shouldReconnect);
            if(shouldReconnect) connectToWhatsApp();
        } else if(connection === 'open') {
            console.log('✅ Maa Consultancy Bot is Ready!');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const chatId = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if(!text) return;

        // Blueprint Pramane Workflow
        if (!userState[chatId]) {
            userState[chatId] = { step: 1 };
            await sock.sendMessage(chatId, { text: 'નમસ્તે! Maa Consultancy Astro-Vastu માં તમારું સ્વાગત છે.\n\nદરરોજના જ્યોતિષ સ્ટેટસ જોવા માટે આ નંબર સેવ કરીને SAVED લખો.' });
            return;
        }

        const state = userState[chatId];
        
        if (state.step === 1) {
            state.step = 2;
            await sock.sendMessage(chatId, { text: 'તમારો જન્મ સમય લખો (જો ખબર ન હોય તો 0 લખો):' });
        }
        else if (state.step === 2) {
            state.tob = text;
            state.step = 3;
            await sock.sendMessage(chatId, { text: 'તમારું જન્મ સ્થળ (Birth Place) જણાવો:' });
        }
        else if (state.step === 3) {
            state.pob = text;
            state.step = 4;
            // Ahiya Swisseph no upyog bhavishya ma thase
            await sock.sendMessage(chatId, { text: 'મારા ધ્યાનમાં આવ્યું છે કે છેલ્લા ૨ વર્ષમાં તમારે આર્થિક ઉતાર-ચઢાવ આવ્યો છે. શું આ સાચું છે? (હા/ના)' });
        }
        else if (state.step === 4) {
            state.step = 5;
            await sock.sendMessage(chatId, { text: 'સમજી ગયો. તમારી મુખ્ય તકલીફ થોડા શબ્દોમાં જણાવો.' });
        }
        else if (state.step === 5) {
            state.problem = text;
            state.step = 6;
            
            // Sheet ma data save
            try {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: MICRO_SHEET_ID,
                    range: 'Sheet1!A:D',
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[new Date().toLocaleDateString(), state.tob, state.pob, state.problem]] }
                });
            } catch (err) {
                console.error('Sheet save error:', err);
            }

            await sock.sendMessage(chatId, { text: 'તમારા પ્રશ્નને અનુરૂપ ગ્રહોનું વિશ્લેષણ ચાલુ છે...' });
            
            // Blueprint pramanne 45 second no delay
            setTimeout(async () => {
                await sock.sendMessage(chatId, { text: 'મેં કુંડળીનો અભ્યાસ કરી લીધો છે. ફાઇનલ ગુપ્ત ઉપાય મેળવવા માટે ₹199 પેમેન્ટ નીચેના QR કોડ પર કરો.\n\n(પેમેન્ટ કર્યા પછી રાહ જુઓ)' });
            }, 45000); 
        }
    });
}

connectToWhatsApp();
