/**
 * Servicio para enviar mensajes a grupos de WhatsApp
 */
class MessageSenderService {
    constructor(client) {
        this.client = client;
    }

    /**
     * Envía un mensaje a un grupo específico
     * @param {string} groupId - ID del grupo
     * @param {string} message - Mensaje a enviar
     * @returns {Object} Resultado de la operación
     */
    async sendMessageToGroup(groupId, message) {
        try {
            console.log(`\n📤 Enviando mensaje al grupo: ${groupId}`);
            console.log(`   Mensaje: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);

            // Enviar mensaje al grupo
            await this.client.sendMessage(groupId, message);

            console.log(`✅ Mensaje enviado exitosamente`);

            return {
                success: true,
                message: 'Mensaje enviado exitosamente',
                groupId: groupId
            };

        } catch (error) {
            console.error(`❌ Error al enviar mensaje:`, error.message);
            
            return {
                success: false,
                message: error.message,
                groupId: groupId
            };
        }
    }

    /**
     * Envía un mensaje a múltiples grupos
     * @param {Array} groups - Lista de grupos con sus IDs
     * @param {string} message - Mensaje a enviar
     * @param {number} delay - Delay en milisegundos entre cada envío
     * @returns {Array} Resultados de las operaciones
     */
    async sendMessageToMultipleGroups(groups, message, delay = 5000) {
        const results = [];

        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const result = await this.sendMessageToGroup(group.group_id, message);
            results.push({
                ...result,
                groupName: group.name
            });

            // Esperar antes del siguiente (excepto en el último)
            if (i < groups.length - 1) {
                console.log(`\n⏳ Esperando ${delay / 1000} segundos antes del siguiente grupo...`);
                await this.sleep(delay);
            }
        }

        return results;
    }

    /**
     * Función auxiliar para esperar
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MessageSenderService;
