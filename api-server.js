const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

let client = null;
let isReady = false;

// Inicializar cliente de WhatsApp
function initializeWhatsApp() {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        console.log('\n========================================');
        console.log('ESCANEA ESTE QR CON WHATSAPP:');
        console.log('========================================');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('\n✓ Cliente de WhatsApp conectado y listo!');
        console.log('✓ API REST escuchando en http://localhost:3000');
        isReady = true;
    });

    client.on('disconnected', () => {
        console.log('✗ Cliente desconectado');
        isReady = false;
    });

    client.initialize();
}

// Endpoint: Estado del servicio
app.get('/status', (req, res) => {
    res.json({
        status: isReady ? 'ready' : 'not_ready',
        message: isReady ? 'WhatsApp conectado' : 'WhatsApp no conectado'
    });
});

// Endpoint: Enviar mensaje a un número
app.post('/send-message', async (req, res) => {
    if (!isReady) {
        return res.status(503).json({
            success: false,
            error: 'WhatsApp no está conectado'
        });
    }

    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({
            success: false,
            error: 'Se requieren los campos: phone y message'
        });
    }

    try {
        const formattedNumber = phone.replace(/[^0-9]/g, '') + '@c.us';
        await client.sendMessage(formattedNumber, message);
        
        res.json({
            success: true,
            message: 'Mensaje enviado correctamente',
            phone: phone
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint: Enviar mensajes masivos
app.post('/send-bulk', async (req, res) => {
    if (!isReady) {
        return res.status(503).json({
            success: false,
            error: 'WhatsApp no está conectado'
        });
    }

    const { phones, message } = req.body;

    if (!phones || !Array.isArray(phones) || !message) {
        return res.status(400).json({
            success: false,
            error: 'Se requieren los campos: phones (array) y message'
        });
    }

    const results = {
        successful: [],
        failed: []
    };

    for (const phone of phones) {
        try {
            const formattedNumber = phone.replace(/[^0-9]/g, '') + '@c.us';
            await client.sendMessage(formattedNumber, message);
            results.successful.push(phone);
            
            // Delay entre mensajes
            const delay = Math.floor(Math.random() * 3000) + 2000;
            await new Promise(resolve => setTimeout(resolve, delay));
        } catch (error) {
            results.failed.push({ phone, error: error.message });
        }
    }

    res.json({
        success: true,
        total: phones.length,
        successful: results.successful.length,
        failed: results.failed.length,
        details: results
    });
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('WhatsApp API Server');
    console.log('========================================');
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
    console.log('\nEndpoints disponibles:');
    console.log('  GET  /status');
    console.log('  POST /send-message');
    console.log('  POST /send-bulk');
    console.log('========================================\n');
    
    initializeWhatsApp();
});
