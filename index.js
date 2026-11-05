const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { google } = require('googleapis');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Render માટે પોર્ટ ચાલુ રાખવો જરૂરી છે
app.get('/', (req, res) => res.send('Astro Bot is Running!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// Google Sheets Authentication
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const MICRO_SHEET_ID = process.env.MICRO_SHEET_ID;
const MASTER_SHEET_ID = process.env.MASTER_SHEET_ID;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => {
    console.log('--- SCAN THIS QR CODE WITH YOUR WHATSAPP ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot is ready and online!');
});

client.on('message', async (msg) => {
    const text = msg.body.trim();
    
    // જો કોઈ યુઝર '199' કે '1100' લખીને વિગતો મોકલે તો તેની શીટમાં એન્ટ્રી
    // ફોર્મેટ: "199, નામ, જન્મ તારીખ, સમય, સ્થળ, પ્રશ્ન"
    if (text.startsWith('199') || text.startsWith('1100')) {
        const parts = text.split(',').map(p => p.trim());
        if (parts.length >= 6) {
            const [type, name, dob, tob, pob, question] = parts;
            const targetSheetId = type === '1100' ? MASTER_SHEET_ID : MICRO_SHEET_ID;
            
            try {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: targetSheetId,
                    range: 'Sheet1!A:F',
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [[new Date().toLocaleDateString(), name, dob, tob, pob, question]]
                    }
                });
                msg.reply(`✅ ધન્યવાદ ${name}! તમારી વિગતો મળી ગઈ છે. અમારો સંપર્ક ટૂંક સમયમાં થશે.`);
            } catch (err) {
                console.error('Error writing to Sheet:', err);
                msg.reply('❌ વિગતો સેવ કરવામાં કંઈક ભૂલ થઈ છે. કૃપા કરીને ફરી પ્રયાસ કરો.');
            }
        } else {
            msg.reply('⚠️ કૃપા કરીને વિગતો આ ફોર્મેટમાં મોકલો: "૧૯૯, તમારું નામ, જન્મ તારીખ, સમય, સ્થળ, તમારો પ્રશ્ન"');
        }
    }
});

client.initialize();
