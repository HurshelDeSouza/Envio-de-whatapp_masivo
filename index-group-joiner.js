/**
 * Script principal para unirse a grupos de WhatsApp
 * Reemplaza el index.js original para unirse a grupos en lugar de enviar mensajes
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const GoogleSheetsService = require('./src/services/GoogleSheetsService');
const GroupJoinerService = require('./src/services/GroupJoinerService');
const fs = require('fs');
const path = require('path');

// Cargar configuración
const config = JSON.parse(fs.readFileSync('./config/groups-config.json', 'utf8'));

console.log('='.repeat(60));
console.log('🤖 WhatsApp Group Auto-Joiner');
console.log('='.repeat(60));

// Inicializar cliente de WhatsApp (sesión única compartida)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Evento: QR Code
client.on('qr', (qr) => {
    console.log('\n📱 Escanea este código QR con WhatsApp:');
    qrcode.generate(qr, { small: true });
    console.log('\n⚠️  IMPORTANTE: Solo necesitas escanear UNA VEZ');
    console.log('    Después de esto, nunca más te pedirá QR\n');
});

// Evento: Cliente listo
client.on('ready', async () => {
    console.log('\n✅ Cliente de WhatsApp conectado y listo!');
    
    try {
        // Inicializar servicios
        const sheetsService = new GoogleSheetsService();
        await sheetsService.initialize();

        const joinerService = new GroupJoinerService(client);

        // Obtener grupos del país configurado
        console.log(`\n🔍 Buscando grupos de ${config.targetCountry}...`);
        const groups = await sheetsService.getGroups(config.targetCountry);

        if (groups.length === 0) {
            console.log(`\n❌ No se encontraron grupos de ${config.targetCountry}`);
            process.exit(0);
        }

        console.log(`\n📋 Se encontraron ${groups.length} grupos disponibles`);

        // Filtrar grupos a los que no se ha unido
        const newGroups = groups.filter(g => !joinerService.hasJoinedGroup(g.link));
        
        if (newGroups.length === 0) {
            console.log('\n✅ Ya te has unido a todos los grupos disponibles');
            console.log('\n📊 Estadísticas:');
            const stats = joinerService.getStats();
            console.log(`   Total de grupos unidos: ${stats.totalGroups}`);
            console.log(`   Última unión: ${stats.lastJoinDate}`);
            process.exit(0);
        }

        console.log(`\n🆕 Grupos nuevos disponibles: ${newGroups.length}`);

        // Seleccionar grupos a unirse (máximo según configuración)
        const groupsToJoin = newGroups.slice(0, config.maxGroupsPerDay);
        
        console.log(`\n🎯 Se unirá a ${groupsToJoin.length} grupo(s) hoy:`);
        groupsToJoin.forEach((g, i) => {
            console.log(`   ${i + 1}. ${g.name || 'Sin nombre'} (${g.members} miembros)`);
        });

        // Confirmar antes de proceder
        console.log(`\n⏳ Iniciando proceso en 5 segundos...`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Unirse a los grupos
        const results = await joinerService.joinMultipleGroups(
            groupsToJoin,
            config.delayBetweenJoins
        );

        // Mostrar resumen
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE OPERACIONES');
        console.log('='.repeat(60));

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log(`\n✅ Exitosos: ${successful}`);
        console.log(`❌ Fallidos: ${failed}`);

        if (failed > 0) {
            console.log('\n❌ Grupos con error:');
            results.filter(r => !r.success).forEach(r => {
                console.log(`   - ${r.group.name}: ${r.message}`);
            });
        }

        // Estadísticas finales
        const stats = joinerService.getStats();
        console.log(`\n📈 Total de grupos unidos hasta ahora: ${stats.totalGroups}`);
        
        console.log('\n✅ Proceso completado!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error en el proceso:', error.message);
        process.exit(1);
    }
});

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
