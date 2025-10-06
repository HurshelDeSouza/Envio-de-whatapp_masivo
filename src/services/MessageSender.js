/**
 * Servicio de envío de mensajes
 * Single Responsibility: Solo maneja la lógica de envío masivo
 * Open/Closed: Abierto para extensión (nuevos tipos de envío)
 */
class MessageSender {
    constructor(whatsAppClient, config, logger) {
        this.client = whatsAppClient;
        this.config = config;
        this.logger = logger;
    }

    async sendBulkMessages(phoneNumbers, message) {
        const results = {
            successful: 0,
            failed: 0,
            details: []
        };

        this.logger.logStart(phoneNumbers.length);

        for (let i = 0; i < phoneNumbers.length; i++) {
            const phoneNumber = phoneNumbers[i];
            const result = await this._sendSingleMessage(phoneNumber, message, i + 1, phoneNumbers.length);
            
            this._updateResults(results, result);
            
            if (i < phoneNumbers.length - 1) {
                await this._delay();
            }
        }

        this.logger.logSummary(results);
        return results;
    }

    async _sendSingleMessage(phoneNumber, message, current, total) {
        try {
            await this.client.sendMessage(phoneNumber, message);
            this.logger.logSuccess(phoneNumber, current, total);
            return { phoneNumber, status: 'success' };
        } catch (error) {
            this.logger.logError(phoneNumber, current, total, error.message);
            return { phoneNumber, status: 'failed', error: error.message };
        }
    }

    _updateResults(results, result) {
        if (result.status === 'success') {
            results.successful++;
        } else {
            results.failed++;
        }
        results.details.push(result);
    }

    async _delay() {
        const delayTime = this.config.getRandomDelay();
        return new Promise(resolve => setTimeout(resolve, delayTime));
    }
}

module.exports = MessageSender;
