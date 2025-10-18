/**
 * Script principal para unirse a grupos de WhatsApp
 * Reemplaza el index.js original para unirse a grupos en lugar de enviar mensajes
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const GoogleSheetsService = require('./src/services/GoogleSheetsService');
const GroupJoinerService = require('./src/services/GroupJoinerService');
const DatabaseService = require('./src/database/DatabaseService');
const fs = require('fs');
const path = require('path');

// Cargar configuración
const config = JSON.parse(fs.readFileSync('./config/groups-config.json', 'utf8'));

console.log('='.repeat(60));
console.log('🤖 WhatsApp Group Auto-Joiner');
console.log('='.repeat(60));

// Inicializar cliente de WhatsApp (sesión única compartida)
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: false, // Cambiar a false para mantener sesión
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
    console.log('\n⚠️  IMPORTANTE: Solo necesitas escanear UNA VEZ');
    console.log('    Después de esto, nunca más te pedirá QR\n');
});

// Evento: Cliente listo
client.on('ready', async () => {
    console.log('\n✅ Cliente de WhatsApp conectado y listo!');
    
    try {
        // Inicializar servicios
        dbService = new DatabaseService();
        const sheetsService = new GoogleSheetsService();
        await sheetsService.initialize();

        const joinerService = new GroupJoinerService(client);

        // Obtener grupos del país configurado desde Google Sheets
        console.log(`\n🔍 Buscando grupos de ${config.targetCountry} en Google Sheets...`);
        const sheetGroups = await sheetsService.getGroups(config.targetCountry);
        
        // Agregar grupos nuevos a la base de datos
        const newGroupsAdded = dbService.addMultipleGroups(sheetGroups);
        if (newGroupsAdded > 0) {
            console.log(`✅ Se agregaron ${newGroupsAdded} grupos nuevos a la base de datos`);
        }
        
        // Obtener grupos pendientes de la base de datos
        console.log(`\n🔍 Buscando grupos pendientes en la base de datos...`);
        const groups = dbService.getPendingGroupsByCountry(config.targetCountry, 100);

        if (groups.length === 0) {
            console.log(`\n❌ No se encontraron grupos de ${config.targetCountry}`);
            process.exit(0);
        }

        console.log(`\n📋 Se encontraron ${groups.length} grupos pendientes en la base de datos`);

        // Los grupos ya están filtrados (solo pendientes)
        const newGroups = groups;
        
        if (newGroups.length === 0) {
            console.log('\n✅ No hay grupos pendientes para procesar');
            const stats = dbService.getStatisticsByCountry(config.targetCountry);
            console.log('\n📊 ESTADÍSTICAS GENERALES:');
            console.log(`   Total de grupos en base de datos: ${stats.total}`);
            console.log(`   ✅ Grupos agregados exitosamente: ${stats.successful}`);
            console.log(`   ❌ Grupos fallidos: ${stats.failed}`);
            console.log(`   ⏳ Grupos pendientes: ${stats.pending}`);
            dbService.close();
            process.exit(0);
        }

        console.log(`\n🆕 Grupos pendientes disponibles: ${newGroups.length}`);

        // Seleccionar grupos a unirse (máximo según configuración)
        const groupsToJoin = newGroups.slice(0, config.maxGroupsPerDay);
        
        console.log(`\n🎯 Se intentará unir a ${groupsToJoin.length} grupo(s):`);
        groupsToJoin.forEach((g, i) => {
            console.log(`   ${i + 1}. ${g.name || 'Sin nombre'} (${g.members} miembros)`);
        });

        // Confirmar antes de proceder
        console.log(`\n⏳ Iniciando proceso en 5 segundos...`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Unirse a los grupos y actualizar base de datos
        const results = [];
        for (let i = 0; i < groupsToJoin.length; i++) {
            const group = groupsToJoin[i];
            const result = await joinerService.joinGroup(group);
            results.push(result);
            
            // Actualizar estado en la base de datos
            if (result.success) {
                dbService.markGroupAsSuccessful(group.link, result.groupId);
            } else {
                dbService.markGroupAsFailed(group.link, result.message);
            }
            
            // Esperar antes del siguiente (excepto en el último)
            if (i < groupsToJoin.length - 1 && result.success) {
                console.log(`\n⏳ Esperando ${config.delayBetweenJoins / 1000} segundos antes del siguiente grupo...`);
                await new Promise(resolve => setTimeout(resolve, config.delayBetweenJoins));
            }
        }

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

        // Estadísticas finales desde la base de datos
        const stats = dbService.getStatisticsByCountry(config.targetCountry);
        console.log(`\n📊 ESTADÍSTICAS GENERALES (${config.targetCountry}):`);
        console.log(`   Total de grupos en base de datos: ${stats.total}`);
        console.log(`   ✅ Grupos agregados exitosamente: ${stats.successful}`);
        console.log(`   ❌ Grupos fallidos: ${stats.failed}`);
        console.log(`   ⏳ Grupos pendientes: ${stats.pending}`);
        
        console.log('\n✅ Proceso completado!');
        dbService.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error en el proceso:', error.message);
        if (dbService) dbService.close();
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

// Variable global para la base de datos
let dbService = null;

// Inicializar cliente
console.log('\n🔄 Inicializando cliente de WhatsApp...');
client.initialize();
