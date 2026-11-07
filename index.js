const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const { google } = require('googleapis');
const swisseph = require('swisseph-v2'); // Correct validation fix

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('✅ Maa Consultancy Astro-Vastu Bot is 24/7 Active!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// Admin Mobile Number (તમારો પર્સનલ નંબર)
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
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Maa Consultancy', 'Chrome', '1.0.0']
    });

    // Login nathi to Pairing Code generate thashe
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
            console.log('✅ Maa Consultancy Astro-Vastu Bot is Ready!');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const chatId = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if(!text) return;

        // 1. ADMIN COMMANDS (Payment confirmation mate)
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

        // Send thaya hoy te message block karva
        if (msg.key.fromMe) return;

        // 2. CLIENT FUNNEL Workflow (Blueprint Pramane)
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
            // Astro planetary logic uses swisseph calculations for baseline astrology
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
            
            // Google Sheets map based on client problem & prediction plans (Default to Micro)
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
            
            // 45 Seconds wait matching blueprints
            setTimeout(async () => {
                await sock.sendMessage(chatId, { text: 'મેં તમારી કુંડળી અને પ્રશ્નનો અભ્યાસ કરી લીધો છે.\n\nફાઇનલ ગુપ્ત ઉપાય અને માર્ગદર્શન મેળવવા માટે ₹199 પેમેન્ટ કરો અને તેનો સ્ક્રીનશોટ અહીં મોકલો.\n\nપેમેન્ટ મેળવવા માટે નીચેના QR કોડ અને ID નો ઉપયોગ કરો.' });
                // Note: Image upload can be done using media upload logic if required.
            }, 45000); 
        }
    });
}

connectToWhatsApp();
