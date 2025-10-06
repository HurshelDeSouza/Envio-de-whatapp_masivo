const { Client, LocalAuth } = require('whatsapp-web.js');

/**
 * Cliente de WhatsApp
 * Single Responsibility: Solo maneja la conexión con WhatsApp
 */
class WhatsAppClient {
    constructor(config, qrHandler, readyHandler) {
        this.config = config;
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: config.getPuppeteerConfig()
        });
        
        this._setupEventHandlers(qrHandler, readyHandler);
    }

    _setupEventHandlers(qrHandler, readyHandler) {
        this.client.on('qr', qrHandler);
        this.client.on('ready', readyHandler);
    }

    async initialize() {
        await this.client.initialize();
    }

    async sendMessage(phoneNumber, message) {
        const formattedNumber = this._formatPhoneNumber(phoneNumber);
        return await this.client.sendMessage(formattedNumber, message);
    }

    _formatPhoneNumber(phoneNumber) {
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        return `${cleanNumber}@c.us`;
    }
}

module.exports = WhatsAppClient;
