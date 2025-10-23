/**
 * Servicio para gestionar campañas de mensajes con delays, lotes y programación
 */
const DatabaseService = require('../database/DatabaseService');

class MessageCampaignService {
    constructor(whatsappClient, phone) {
        this.client = whatsappClient;
        this.phone = phone;
        this.isPaused = false;
        this.isStopped = false;
        this.currentCampaign = null;
    }

    /**
     * Enviar mensajes a múltiples grupos o números con configuración avanzada
     */
    async sendCampaign(config) {
        const {
            groupIds,
            numbers,
            contactIds,
            message,
            attachments = [],
            delays = { min: 5, max: 15 },
            batchSize = 50,
            batchDelay = 30,
            pauseEvery = 50,
            pauseDuration = 10
        } = config;

        this.isStopped = false;
        this.isPaused = false;
        
        // Determinar destinatarios
        let recipients = [];
        let recipientType = '';
        
        if (numbers && numbers.length > 0) {
            recipients = numbers;
            recipientType = 'numbers';
        } else if (groupIds && groupIds.length > 0) {
            recipients = groupIds;
            recipientType = 'groups';
        } else if (contactIds && contactIds.length > 0) {
            recipients = contactIds;
            recipientType = 'contacts';
        } else {
            throw new Error('No se especificaron destinatarios');
        }
        
        const results = {
            total: recipients.length,
            sent: 0,
            failed: 0,
            details: []
        };

        console.log('\n' + '='.repeat(60));
        console.log('📤 INICIANDO CAMPAÑA DE MENSAJES');
        console.log('='.repeat(60));
        console.log(`📱 Número: ${this.phone}`);
        console.log(`📊 Total destinatarios (${recipientType}): ${recipients.length}`);
        console.log(`📦 Tamaño de lote: ${batchSize}`);
        console.log(`⏱️  Delay entre mensajes: ${delays.min}-${delays.max} segundos`);
        console.log(`⏸️  Pausa cada ${pauseEvery} mensajes por ${pauseDuration} minutos`);
        console.log('='.repeat(60) + '\n');

        // Dividir en lotes
        const batches = this.createBatches(recipients, batchSize);
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            if (this.isStopped) {
                console.log('🛑 Campaña detenida por el usuario');
                break;
            }

            const batch = batches[batchIndex];
            console.log(`\n📦 Procesando lote ${batchIndex + 1}/${batches.length} (${batch.length} grupos)`);

            for (let i = 0; i < batch.length; i++) {
                // Verificar si está pausado
                while (this.isPaused && !this.isStopped) {
                    console.log('⏸️  Campaña pausada, esperando...');
                    await this.sleep(5000);
                }

                if (this.isStopped) break;

                const recipient = batch[i];
                const messageNumber = batchIndex * batchSize + i + 1;

                try {
                    console.log(`\n[${messageNumber}/${results.total}] Enviando a ${recipientType}: ${recipient}`);
                    
                    // Enviar mensaje según el tipo de destinatario
                    if (recipientType === 'numbers') {
                        await this.sendMessageToNumber(recipient, message, attachments);
                    } else if (recipientType === 'groups') {
                        await this.sendMessageToGroup(recipient, message, attachments);
                    } else if (recipientType === 'contacts') {
                        await this.sendMessageToContact(recipient, message, attachments);
                    }
                    
                    results.sent++;
                    results.details.push({
                        recipient,
                        type: recipientType,
                        status: 'sent',
                        timestamp: new Date(),
                        error: null
                    });

                    console.log(`✅ Mensaje enviado exitosamente`);

                    // Pausa cada X mensajes
                    if (messageNumber % pauseEvery === 0 && messageNumber < results.total) {
                        console.log(`\n⏸️  Pausa programada: ${pauseDuration} minutos`);
                        await this.sleep(pauseDuration * 60 * 1000);
                        console.log('▶️  Reanudando envíos...\n');
                    }

                    // Delay aleatorio entre mensajes
                    if (i < batch.length - 1) {
                        const delay = this.getRandomDelay(delays.min, delays.max);
                        console.log(`⏱️  Esperando ${delay} segundos...`);
                        await this.sleep(delay * 1000);
                    }

                } catch (error) {
                    console.error(`❌ Error enviando a ${recipient}:`, error.message);
                    results.failed++;
                    results.details.push({
                        recipient,
                        type: recipientType,
                        status: 'failed',
                        timestamp: new Date(),
                        error: error.message
                    });
                }
            }

            // Delay entre lotes
            if (batchIndex < batches.length - 1 && !this.isStopped) {
                console.log(`\n⏳ Pausa entre lotes: ${batchDelay} minutos`);
                await this.sleep(batchDelay * 60 * 1000);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE CAMPAÑA');
        console.log('='.repeat(60));
        console.log(`✅ Enviados: ${results.sent}`);
        console.log(`❌ Fallidos: ${results.failed}`);
        console.log(`📊 Total: ${results.total}`);
        console.log(`📈 Tasa de éxito: ${((results.sent / results.total) * 100).toFixed(2)}%`);
        console.log('='.repeat(60) + '\n');

        return results;
    }

    /**
     * Enviar mensaje a un grupo específico
     */
    async sendMessageToGroup(groupId, message, attachments = []) {
        const chatId = `${groupId}@g.us`;

        // Enviar archivos adjuntos si hay
        for (const attachment of attachments) {
            if (attachment.type === 'image') {
                await this.client.sendMessage(chatId, attachment.data, {
                    caption: attachment.caption || ''
                });
            } else if (attachment.type === 'document') {
                await this.client.sendMessage(chatId, attachment.data, {
                    caption: attachment.caption || ''
                });
            }
        }

        // Enviar mensaje de texto
        if (message && message.trim()) {
            await this.client.sendMessage(chatId, message);
        }

        return true;
    }

    /**
     * Enviar mensaje a un número específico
     */
    async sendMessageToNumber(number, message, attachments = []) {
        // Limpiar el número (solo dígitos)
        const cleanNumber = number.replace(/\D/g, '');
        const chatId = `${cleanNumber}@c.us`;

        // Enviar archivos adjuntos si hay
        for (const attachment of attachments) {
            if (attachment.type === 'image') {
                await this.client.sendMessage(chatId, attachment.data, {
                    caption: attachment.caption || ''
                });
            } else if (attachment.type === 'document') {
                await this.client.sendMessage(chatId, attachment.data, {
                    caption: attachment.caption || ''
                });
            }
        }

        // Enviar mensaje de texto
        if (message && message.trim()) {
            await this.client.sendMessage(chatId, message);
        }

        return true;
    }

    /**
     * Enviar mensaje a un contacto específico
     */
    async sendMessageToContact(contactId, message, attachments = []) {
        const chatId = `${contactId}@c.us`;

        // Enviar archivos adjuntos si hay
        for (const attachment of attachments) {
            if (attachment.type === 'image') {
                await this.client.sendMessage(chatId, attachment.data, {
                    caption: attachment.caption || ''
                });
            } else if (attachment.type === 'document') {
                await this.client.sendMessage(chatId, attachment.data, {
                    caption: attachment.caption || ''
                });
            }
        }

        // Enviar mensaje de texto
        if (message && message.trim()) {
            await this.client.sendMessage(chatId, message);
        }

        return true;
    }

    /**
     * Dividir array en lotes
     */
    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Obtener delay aleatorio
     */
    getRandomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Dormir por X milisegundos
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Pausar campaña
     */
    pause() {
        this.isPaused = true;
        console.log('⏸️  Campaña pausada');
    }

    /**
     * Reanudar campaña
     */
    resume() {
        this.isPaused = false;
        console.log('▶️  Campaña reanudada');
    }

    /**
     * Detener campaña
     */
    stop() {
        this.isStopped = true;
        console.log('🛑 Campaña detenida');
    }

    /**
     * Obtener estado de la campaña
     */
    getStatus() {
        return {
            isPaused: this.isPaused,
            isStopped: this.isStopped,
            isRunning: this.currentCampaign !== null
        };
    }
}

module.exports = MessageCampaignService;
