const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const { google } = require('googleapis');
const swisseph = require('swisseph-v2');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('✅ Maa Consultancy Astro-Vastu Bot is 24/7 Active!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// Admin Mobile Number
const ADMIN_NUMBER = '919426612172@s.whatsapp.net';

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
    // Navo session name to avoid RAM Crashes and restart loops
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys_v14');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        // Windows desktop target simulate secure authentication
        browser: ['Windows', 'Chrome', '110.0.5481.177'],
        
        // 🚀 RAM CRASH THAVATHI BACHAVAVA MATE STABLE SETTINGS 👇
        historyCacheSize: 0,        // Extra old cached data reject
        syncFullHistory: false,     // Avoid downloading past message loops
        maxMsgRetryCount: 1,        // Minimize retry overhead
        defaultQueryTimeoutMs: undefined, // Timeout problems resolve
        markOnlineOnConnect: true   // Stay connected with priority status
    });

    sock.ev.on('creds.update', saveCreds);

    let isCodeRequested = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Connection closed, Reconnecting:', shouldReconnect);
            if(shouldReconnect) {
                // Wait to make sure server doesn't hit memory crashes
                setTimeout(() => connectToWhatsApp(), 10000);
            }
        } 
        else if(connection === 'open') {
            console.log('====================================================');
            console.log('✅ MAA CONSULTANCY ASTRO-VASTU BOT IS READY!');
            console.log('====================================================');
        }

        // Check registration and delay request to avoid spam/loop blocks
        if (qr && !sock.authState.creds.registered && !isCodeRequested) {
            isCodeRequested = true;
            console.log('\n⏳ WhatsApp Server sathe handshake thav dyo, wait 10 seconds...');
            
            await delay(12000); // 12 seconds safe handshake delay to satisfy pairing limits
            try {
                const code = await sock.requestPairingCode("919426612172");
                console.log('\n====================================================');
                console.log('👉 TAMARO PAIRING CODE (8 Aakda):', code);
                console.log('====================================================\n');
            } catch(err) {
                console.log('❌ Pairing code request fail thai: ', err.message);
                isCodeRequested = false; // reset flag on errors
            }
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const chatId = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if(!text) return;

        // 1. ADMIN COMMANDS
        if (chatId === ADMIN_NUMBER) {
            if (text.startsWith('OK 199')) {
                const clientNum = text.split(' ')[2] + '@s.whatsapp.net';
                await sock.sendMessage(clientNum, { text: '✅ પેમેન્ટ કન્ફર્મ! આ રહ્યો તમારો ખાસ લાલ કિતાબનો ઉપાય (₹199):\n\nરોજ સવારે સૂર્ય નારાયણને જળ ચડાવો અને વડીલોના આશીર્વાદ લો. તમારા મુખ્ય પ્રશ્નનું વિગતવાર નિવારણ ટૂંક સમયમાં મોકલવામાં આવશે.' });
                userState[clientNum] = { paid: '199' };
            } 
            else if (text.startsWith('OK 1100')) {
                const clientNum = text.split(' ')[2] + '@s.whatsapp.net';
                await sock.sendMessage(clientNum, { text: '✅ પેમેન્ટ કન્ફર્મ! આ રહ્યો તમારો સંપૂર્ણ જન્માક્ષર અને વાસ્તુ રિપોર્ટ (₹1100). ટૂંક સમયમાં પીડીએફ (PDF) મોકલવામાં આવશે. ગુરુજી આપનો સંપર્ક કરશે.' });
                userState[clientNum] = { paid: '1100' };
            }
            return;
        }

        if (msg.key.fromMe) return;

        // 2. CLIENT FUNNEL (Blueprint)
        if (!userState[chatId]) {
            userState[chatId] = { step: 1 };
            await sock.sendMessage(chatId, { text: 'નમસ્તે! Maa Consultancy Astro-Vastu માં તમારું સ્વાગત છે.\n\nકુંડળી અને વાસ્તુ માર્ગદર્શન માટે આ નંબર સેવ કરીને "SAVED" લખો.' });
            return;
        }

        const state = userState[chatId];
        
        if (state.step === 1) {
            state.name = text;
            state.step = 2;
            await sock.sendMessage(chatId, { text: 'તમારો જન્મ સમય લખો (જો ખબર ન હોય તો "0" લખો):' });
        }
        else if (state.step === 2) {
            state.tob = text;
            state.step = 3;
            await sock.sendMessage(chatId, { text: 'તમારું જન્મ સ્થળ (Birth Place) જણાવો:' });
        }
        else if (state.step === 3) {
            state.pob = text;
            state.step = 4;
            await sock.sendMessage(chatId, { text: 'મારા વિશ્લેષણ મુજબ છેલ્લા ૨ વર્ષમાં તમારે આર્થિક ઉતાર-ચઢાવ રહ્યો છે. શું આ સાચું છે? (હા/ના)' });
        }
        else if (state.step === 4) {
            state.trust = text;
            state.step = 5;
            await sock.sendMessage(chatId, { text: 'સમજી ગયો. તમારી મુખ્ય તકલીફ થોડા શબ્દોમાં જણાવો.' });
        }
        else if (state.step === 5) {
            state.problem = text;
            state.step = 6;
            
            const targetSheet = text.includes('1100') ? MASTER_SHEET_ID : MICRO_SHEET_ID;

            try {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: targetSheet,
                    range: 'Sheet1!A:F',
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[new Date().toLocaleDateString(), state.name, state.tob, state.pob, state.trust, state.problem]] }
                });
            } catch (err) {
                console.error('Sheet update failed: ', err);
            }

            await sock.sendMessage(chatId, { text: 'તમારા પ્રશ્નને અનુરૂપ ગ્રહોનું વિશ્લેષણ ચાલુ છે...' });
            
            setTimeout(async () => {
                await sock.sendMessage(chatId, { text: 'મેં તમારી કુંડળી અને પ્રશ્નનો અભ્યાસ કરી લીધો છે.\n\nફાઇનલ ગુપ્ત ઉપાય અને માર્ગદર્શન મેળવવા માટે ₹199 પેમેન્ટ કરો અને તેનો સ્ક્રીનશોટ અહીં મોકલો.\n\nપેમેન્ટ મેળવવા માટે નીચેના QR કોડ અને ID નો ઉપયોગ કરો.' });
            }, 45000); 
        }
    });
}

connectToWhatsApp();
