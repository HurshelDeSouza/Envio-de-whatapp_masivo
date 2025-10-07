const QRCode = require('qrcode-generator');
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
        
        // Crear QR compacto con qrcode-generator
        const qrCode = QRCode(0, 'L'); // Tipo 0 (auto), nivel L (bajo)
        qrCode.addData(qr);
        qrCode.make();
        
        const size = qrCode.getModuleCount();
        
        // Mostrar QR completo usando caracteres de media altura
        for (let row = 0; row < size; row += 2) {
            let line = '';
            for (let col = 0; col < size; col++) {
                const top = qrCode.isDark(row, col);
                const bottom = (row + 1 < size) ? qrCode.isDark(row + 1, col) : false;
                
                if (top && bottom) line += '█';
                else if (top) line += '▀';
                else if (bottom) line += '▄';
                else line += ' ';
            }
            console.log(line);
        }
        
        console.log('\n🔄 Se actualiza cada 30 segundos automáticamente\n');
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
