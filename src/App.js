const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const WhatsAppClient = require('./services/WhatsAppClient');
const MessageSender = require('./services/MessageSender');
const AppConfig = require('./config/AppConfig');
const Logger = require('./utils/Logger');
const DataLoader = require('./utils/DataLoader');

/**
 * Aplicación principal
 * Dependency Inversion: Depende de abstracciones (servicios inyectados)
 * Single Responsibility: Solo orquesta los servicios
 */
class App {
    constructor() {
        this.config = new AppConfig();
        this.logger = new Logger();
        this.dataLoader = new DataLoader();
        this.messageSender = null;
        this.whatsAppClient = null;
    }

    async run() {
        try {
            const data = this.dataLoader.loadMessagingData();
            
            this.whatsAppClient = new WhatsAppClient(
                this.config,
                (qr) => this._handleQR(qr),
                () => this._handleReady(data)
            );
            
            await this.whatsAppClient.initialize();
        } catch (error) {
            console.error('Error fatal:', error.message);
            process.exit(1);
        }
    }

    async _handleQR(qr) {
        this.logger.logQR();
        qrcode.generate(qr, { small: true });
        
        // Guardar QR como imagen
        try {
            await QRCode.toFile('whatsapp-qr.png', qr, {
                width: 400,
                margin: 2
            });
            console.log('\n📱 QR guardado como "whatsapp-qr.png"');
            console.log('🔄 Se actualiza cada 30 segundos automáticamente');
            console.log('📤 Envía esta imagen al muchacho para que la escanee\n');
        } catch (error) {
            console.log('Error guardando QR:', error.message);
        }
    }

    async _handleReady(data) {
        this.logger.logReady();
        
        this.messageSender = new MessageSender(
            this.whatsAppClient,
            this.config,
            this.logger
        );
        
        await this.messageSender.sendBulkMessages(
            data.phoneNumbers,
            data.message
        );
        
        this.logger.logExit();
    }
}

module.exports = App;
