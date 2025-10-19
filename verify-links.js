/**
 * Script para verificar enlaces de grupos de WhatsApp
 * Detecta cuáles funcionan y cuáles requieren aprobación de administrador
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const DatabaseService = require('./src/database/DatabaseService');
const fs = require('fs');

console.log('='.repeat(60));
console.log('🔍 Verificador de Enlaces de Grupos de WhatsApp');
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
        
        // Obtener grupos pendientes
        console.log('\n🔍 Obteniendo grupos pendientes de la base de datos...');
        const groups = dbService.getPendingGroupsByCountry('USA', 100);
        
        if (groups.length === 0) {
            console.log('\n❌ No hay grupos pendientes para verificar');
            dbService.close();
            process.exit(0);
        }
        
        console.log(`\n📋 Se encontraron ${groups.length} grupos pendientes`);
        console.log(`\n⏳ Iniciando verificación en 3 segundos...`);
        await sleep(3000);
        
        const results = {
            working: [],
            requiresApproval: [],
            expired: [],
            invalid: [],
            errors: []
        };
        
        // Verificar cada grupo
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            console.log(`\n[${i + 1}/${groups.length}] Verificando: ${group.name || 'Sin nombre'}`);
            console.log(`   Enlace: ${group.link}`);
            
            const verification = await verifyGroupLink(client, group);
            
            // Clasificar resultado
            switch (verification.status) {
                case 'working':
                    results.working.push({ ...group, verification });
                    console.log(`   ✅ FUNCIONA - Se puede unir directamente`);
                    break;
                case 'requires_approval':
                    results.requiresApproval.push({ ...group, verification });
                    console.log(`   ⚠️  REQUIERE APROBACIÓN - Necesita autorización del admin`);
                    break;
                case 'expired':
                    results.expired.push({ ...group, verification });
                    console.log(`   ❌ EXPIRADO - Enlace no válido o grupo lleno`);
                    break;
                case 'invalid':
                    results.invalid.push({ ...group, verification });
                    console.log(`   ❌ INVÁLIDO - Formato de enlace incorrecto`);
                    break;
                default:
                    results.errors.push({ ...group, verification });
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
        console.log(`\n✅ Enlaces que funcionan: ${results.working.length}`);
        console.log(`⚠️  Requieren aprobación: ${results.requiresApproval.length}`);
        console.log(`❌ Enlaces expirados: ${results.expired.length}`);
        console.log(`❌ Enlaces inválidos: ${results.invalid.length}`);
        console.log(`⚠️  Errores: ${results.errors.length}`);
        
        // Guardar resultados en archivo JSON
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `verification-results-${timestamp}.json`;
        fs.writeFileSync(filename, JSON.stringify(results, null, 2));
        console.log(`\n💾 Resultados guardados en: ${filename}`);
        
        // Mostrar detalles de grupos que requieren aprobación
        if (results.requiresApproval.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log('⚠️  GRUPOS QUE REQUIEREN APROBACIÓN:');
            console.log('='.repeat(60));
            results.requiresApproval.forEach((g, i) => {
                console.log(`\n${i + 1}. ${g.name || 'Sin nombre'}`);
                console.log(`   País: ${g.country}`);
                console.log(`   Miembros: ${g.members}`);
                console.log(`   Enlace: ${g.link}`);
            });
        }
        
        // Mostrar detalles de grupos que funcionan
        if (results.working.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log('✅ GRUPOS QUE FUNCIONAN (UNIÓN DIRECTA):');
            console.log('='.repeat(60));
            results.working.forEach((g, i) => {
                console.log(`\n${i + 1}. ${g.name || 'Sin nombre'}`);
                console.log(`   País: ${g.country}`);
                console.log(`   Miembros: ${g.members}`);
                console.log(`   Enlace: ${g.link}`);
            });
        }
        
        dbService.close();
        console.log('\n✅ Verificación completada!');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Error en el proceso:', error.message);
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
        // Verificar si requiere aprobación
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
