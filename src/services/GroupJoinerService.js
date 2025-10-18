const fs = require('fs');
const path = require('path');

/**
 * Servicio para unirse a grupos de WhatsApp
 */
class GroupJoinerService {
    constructor(client) {
        this.client = client;
        this.joinedGroupsFile = path.join(__dirname, '../../config/joined-groups.json');
        this.joinedGroups = this.loadJoinedGroups();
    }

    /**
     * Carga el historial de grupos unidos
     */
    loadJoinedGroups() {
        try {
            if (fs.existsSync(this.joinedGroupsFile)) {
                return JSON.parse(fs.readFileSync(this.joinedGroupsFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error al cargar historial de grupos:', error.message);
        }
        return { groups: [], lastJoinDate: null };
    }

    /**
     * Guarda el historial de grupos unidos
     */
    saveJoinedGroups() {
        try {
            fs.writeFileSync(this.joinedGroupsFile, JSON.stringify(this.joinedGroups, null, 2));
        } catch (error) {
            console.error('Error al guardar historial de grupos:', error.message);
        }
    }

    /**
     * Verifica si ya se unió a un grupo
     */
    hasJoinedGroup(link) {
        return this.joinedGroups.groups.some(g => g.link === link);
    }

    /**
     * Extrae el código de invitación del enlace
     */
    extractInviteCode(link) {
        const match = link.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
        return match ? match[1] : null;
    }

    /**
     * Se une a un grupo de WhatsApp
     * @param {Object} group - Objeto con información del grupo
     * @returns {Object} Resultado de la operación
     */
    async joinGroup(group) {
        try {
            // Verificar si ya se unió
            if (this.hasJoinedGroup(group.link)) {
                return {
                    success: false,
                    message: 'Ya te uniste a este grupo anteriormente',
                    group: group
                };
            }

            // Extraer código de invitación
            const inviteCode = this.extractInviteCode(group.link);
            if (!inviteCode) {
                return {
                    success: false,
                    message: 'Enlace de invitación inválido',
                    group: group
                };
            }

            console.log(`\n🔄 Intentando unirse al grupo: ${group.name || 'Sin nombre'}`);
            console.log(`   País: ${group.country}`);
            console.log(`   Miembros: ${group.members}`);
            console.log(`   Enlace: ${group.link}`);

            // Unirse al grupo usando whatsapp-web.js
            const result = await this.client.acceptInvite(inviteCode);

            // Guardar en historial
            this.joinedGroups.groups.push({
                link: group.link,
                name: group.name,
                country: group.country,
                members: group.members,
                joinedAt: new Date().toISOString(),
                groupId: result
            });
            this.joinedGroups.lastJoinDate = new Date().toISOString();
            this.saveJoinedGroups();

            console.log(`✅ ¡Unido exitosamente al grupo!`);
            console.log(`   ID del grupo: ${result}`);

            return {
                success: true,
                message: 'Unido exitosamente al grupo',
                group: group,
                groupId: result
            };

        } catch (error) {
            console.error(`❌ Error al unirse al grupo:`, error.message);
            
            // Guardar grupo fallido en historial para no volver a intentar
            this.joinedGroups.groups.push({
                link: group.link,
                name: group.name,
                country: group.country,
                members: group.members,
                joinedAt: new Date().toISOString(),
                groupId: 'FAILED',
                error: error.message,
                status: 'failed'
            });
            this.joinedGroups.lastJoinDate = new Date().toISOString();
            this.saveJoinedGroups();
            
            console.log(`⚠️  Grupo marcado como fallido, se saltará en próximas ejecuciones`);
            
            return {
                success: false,
                message: error.message,
                group: group
            };
        }
    }

    /**
     * Se une a múltiples grupos con delay
     * @param {Array} groups - Lista de grupos
     * @param {number} delay - Delay en milisegundos entre cada unión
     * @returns {Array} Resultados de las operaciones
     */
    async joinMultipleGroups(groups, delay = 600000) {
        const results = [];

        for (let i = 0; i < groups.length; i++) {
            const result = await this.joinGroup(groups[i]);
            results.push(result);

            // Esperar antes del siguiente (excepto en el último)
            if (i < groups.length - 1 && result.success) {
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

    /**
     * Obtiene estadísticas de grupos unidos
     */
    getStats() {
        const successful = this.joinedGroups.groups.filter(g => g.groupId !== 'FAILED').length;
        const failed = this.joinedGroups.groups.filter(g => g.groupId === 'FAILED').length;
        
        return {
            totalGroups: this.joinedGroups.groups.length,
            successfulGroups: successful,
            failedGroups: failed,
            lastJoinDate: this.joinedGroups.lastJoinDate,
            groups: this.joinedGroups.groups
        };
    }
}

module.exports = GroupJoinerService;
