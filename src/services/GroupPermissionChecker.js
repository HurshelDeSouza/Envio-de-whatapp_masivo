/**
 * Servicio para verificar permisos en grupos de WhatsApp
 */
class GroupPermissionChecker {
    constructor(client) {
        this.client = client;
    }

    /**
     * Verifica si el usuario puede enviar mensajes en un grupo
     * @param {string} groupId - ID del grupo de WhatsApp
     * @returns {Object} Resultado con permisos y detalles
     */
    async checkGroupPermissions(groupId) {
        try {
            // Obtener información del grupo
            const chat = await this.client.getChatById(groupId);
            
            if (!chat.isGroup) {
                return {
                    canSend: false,
                    reason: 'No es un grupo',
                    isInGroup: false
                };
            }

            // Verificar si el usuario está en el grupo
            const participants = await chat.participants;
            const myNumber = this.client.info.wid._serialized;
            const isParticipant = participants.some(p => p.id._serialized === myNumber);

            if (!isParticipant) {
                return {
                    canSend: false,
                    reason: 'Ya no estás en este grupo',
                    isInGroup: false
                };
            }

            // Verificar si el grupo está activo
            if (chat.archived) {
                return {
                    canSend: true,
                    reason: 'Grupo archivado pero puedes enviar',
                    isInGroup: true,
                    isArchived: true
                };
            }

            // Verificar si solo admins pueden enviar mensajes
            // Usar la propiedad del chat directamente
            if (chat.groupMetadata && chat.groupMetadata.announce) {
                // Verificar si el usuario es admin
                const myParticipant = participants.find(p => p.id._serialized === myNumber);
                const isAdmin = myParticipant && myParticipant.isAdmin;

                if (!isAdmin) {
                    return {
                        canSend: false,
                        reason: 'Solo administradores pueden enviar mensajes',
                        isInGroup: true,
                        isAdmin: false,
                        restrictedToAdmins: true
                    };
                }
            }

            // Todo bien, puede enviar mensajes
            return {
                canSend: true,
                reason: 'Puedes enviar mensajes',
                isInGroup: true,
                groupName: chat.name,
                participantsCount: participants.length
            };

        } catch (error) {
            console.error(`Error al verificar permisos del grupo ${groupId}:`, error.message);
            
            // Clasificar el error
            if (error.message.includes('not found') || error.message.includes('404')) {
                return {
                    canSend: false,
                    reason: 'El grupo ya no existe',
                    isInGroup: false,
                    error: true
                };
            }

            return {
                canSend: false,
                reason: 'Error al verificar permisos: ' + error.message,
                isInGroup: false,
                error: true
            };
        }
    }

    /**
     * Verifica permisos de múltiples grupos
     * @param {Array} groupIds - Lista de IDs de grupos
     * @returns {Object} Mapa de groupId -> permisos
     */
    async checkMultipleGroups(groupIds) {
        const results = {};
        
        for (const groupId of groupIds) {
            results[groupId] = await this.checkGroupPermissions(groupId);
            // Pequeña pausa para no saturar
            await this.sleep(500);
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

module.exports = GroupPermissionChecker;
