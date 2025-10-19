/**
 * Script para verificar enlaces y actualizar la base de datos
 * Marca cuáles funcionan y cuáles requieren aprobación
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const DatabaseService = require('./src/database/DatabaseService');
const fs = require('fs');

console.log('='.repeat(60));
console.log('🔍 Verificador de Enlaces - Actualización de Base de Datos');
console.log('='.repeat(60));

// Inicializar cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled'
        ]
    }
});

// Evento: QR Code
client.on('qr', (qr) => {
    console.log('\n📱 Escanea este código QR con WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Evento: Cliente listo
client.on('ready', async () => {
    console.log('\n✅ Cliente de WhatsApp conectado y listo!');
    
    try {
        const dbService = new DatabaseService();
        
        // Obtener grupos pendientes no verificados
        const stmt = dbService.db.prepare(`
            SELECT * FROM groups 
            WHERE status = 'pending' AND verified = 0
            ORDER BY created_at ASC
            LIMIT 50
        `);
        const groups = stmt.all();
        
        if (groups.length === 0) {
            console.log('\n❌ No hay grupos pendientes sin verificar');
            dbService.close();
            process.exit(0);
        }
        
        console.log(`\n📋 Se encontraron ${groups.length} grupos para verificar`);
        console.log(`\n⏳ Iniciando verificación en 3 segundos...`);
        await sleep(3000);
        
        const results = {
            working: 0,
            requiresApproval: 0,
            expired: 0,
            invalid: 0,
            errors: 0
        };
        
        // Verificar cada grupo
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            console.log(`\n[${i + 1}/${groups.length}] Verificando: ${group.name || 'Sin nombre'}`);
            console.log(`   Enlace: ${group.link}`);
            
            const verification = await verifyGroupLink(client, group);
            
            // Actualizar base de datos según resultado
            switch (verification.status) {
                case 'working':
                    dbService.markGroupAsVerified(group.link, false, verification.info);
                    results.working++;
                    console.log(`   ✅ FUNCIONA - Se puede unir directamente`);
                    if (verification.info) {
                        console.log(`      Nombre: ${verification.info.groupName}`);
                        console.log(`      Miembros: ${verification.info.members}`);
                    }
                    break;
                    
                case 'requires_approval':
                    dbService.markGroupAsVerified(group.link, true, verification.info);
                    results.requiresApproval++;
                    console.log(`   ⚠️  REQUIERE APROBACIÓN`);
                    if (verification.info) {
                        console.log(`      Nombre: ${verification.info.groupName}`);
                        console.log(`      Miembros: ${verification.info.members}`);
                    }
                    break;
                    
                case 'expired':
                    dbService.markGroupAsFailed(group.link, 'Enlace expirado o revocado');
                    results.expired++;
                    console.log(`   ❌ EXPIRADO - Marcado como fallido`);
                    break;
                    
                case 'invalid':
                    dbService.markGroupAsFailed(group.link, 'Enlace inválido');
                    results.invalid++;
                    console.log(`   ❌ INVÁLIDO - Marcado como fallido`);
                    break;
                    
                default:
                    results.errors++;
                    console.log(`   ⚠️  ERROR - ${verification.message}`);
            }
            
            // Pequeña pausa entre verificaciones
            if (i < groups.length - 1) {
                await sleep(2000);
            }
        }
        
        // Mostrar resumen
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE VERIFICACIÓN');
        console.log('='.repeat(60));
        console.log(`\n✅ Enlaces que funcionan: ${results.working}`);
        console.log(`⚠️  Requieren aprobación: ${results.requiresApproval}`);
        console.log(`❌ Enlaces expirados: ${results.expired}`);
        console.log(`❌ Enlaces inválidos: ${results.invalid}`);
        console.log(`⚠️  Errores: ${results.errors}`);
        
        // Mostrar estadísticas actualizadas
        console.log('\n' + '='.repeat(60));
        console.log('📊 ESTADÍSTICAS DE BASE DE DATOS');
        console.log('='.repeat(60));
        
        const workingGroups = dbService.getWorkingGroups();
        const approvalGroups = dbService.getGroupsRequiringApproval();
        const stats = dbService.getStatistics();
        
        console.log(`\n✅ Grupos verificados que funcionan: ${workingGroups.length}`);
        console.log(`⚠️  Grupos que requieren aprobación: ${approvalGroups.length}`);
        console.log(`❌ Grupos fallidos: ${stats.failed}`);
        console.log(`⏳ Grupos pendientes sin verificar: ${stats.pending - workingGroups.length - approvalGroups.length}`);
        
        dbService.close();
        console.log('\n✅ Verificación completada y base de datos actualizada!');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Error en el proceso:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
});

/**
 * Verifica un enlace de grupo sin unirse
 */
async function verifyGroupLink(client, group) {
    try {
        // Extraer código de invitación
        const inviteCode = extractInviteCode(group.link);
        if (!inviteCode) {
            return {
                status: 'invalid',
                message: 'Formato de enlace inválido'
            };
        }
        
        // Obtener información del grupo sin unirse
        const inviteInfo = await client.getInviteInfo(inviteCode);
        
        // Si llegamos aquí, el enlace es válido
        // Verificar si requiere aprobación (grupos grandes o con restricción)
        if (inviteInfo.size >= 100 || inviteInfo.restrict) {
            return {
                status: 'requires_approval',
                message: 'Requiere aprobación de administrador',
                info: {
                    groupName: inviteInfo.subject,
                    members: inviteInfo.size,
                    description: inviteInfo.description || 'Sin descripción'
                }
            };
        }
        
        return {
            status: 'working',
            message: 'Enlace funcional - Unión directa posible',
            info: {
                groupName: inviteInfo.subject,
                members: inviteInfo.size,
                description: inviteInfo.description || 'Sin descripción'
            }
        };
        
    } catch (error) {
        // Clasificar el error
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('not found') || errorMsg.includes('revoked') || errorMsg.includes('expired')) {
            return {
                status: 'expired',
                message: 'Enlace expirado o revocado'
            };
        }
        
        if (errorMsg.includes('invalid')) {
            return {
                status: 'invalid',
                message: 'Enlace inválido'
            };
        }
        
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Extrae el código de invitación del enlace
 */
function extractInviteCode(link) {
    const match = link.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    return match ? match[1] : null;
}

/**
 * Función auxiliar para esperar
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Evento: Autenticación exitosa
client.on('authenticated', () => {
    console.log('✅ Autenticación exitosa');
});

// Evento: Error de autenticación
client.on('auth_failure', (msg) => {
    console.error('❌ Error de autenticación:', msg);
    process.exit(1);
});

// Evento: Desconexión
client.on('disconnected', (reason) => {
    console.log('⚠️ Cliente desconectado:', reason);
    process.exit(1);
});

// Inicializar cliente
console.log('\n🔄 Inicializando cliente de WhatsApp...');
client.initialize();
