/**
 * Script para migrar la sesión actual al nuevo sistema de usuarios
 */

const UserService = require('./src/database/UserService');
const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('🔄 MIGRACIÓN DE SESIÓN ACTUAL');
console.log('='.repeat(60) + '\n');

// Buscar sesiones existentes en .wwebjs_sessions
const sessionsDir = path.join(__dirname, '.wwebjs_sessions');

if (!fs.existsSync(sessionsDir)) {
    console.log('❌ No se encontró el directorio de sesiones');
    console.log('   No hay sesiones para migrar\n');
    process.exit(0);
}

const sessions = fs.readdirSync(sessionsDir);

if (sessions.length === 0) {
    console.log('❌ No se encontraron sesiones guardadas');
    console.log('   No hay sesiones para migrar\n');
    process.exit(0);
}

console.log(`📱 Sesiones encontradas: ${sessions.length}\n`);

const userService = new UserService();

// Usuario por defecto
const username = 'admin';

sessions.forEach(sessionId => {
    // Convertir el sessionId de vuelta a formato de teléfono
    // El sessionId es el número sin el +
    const phoneNumber = '+' + sessionId;
    
    console.log(`➕ Agregando número: ${phoneNumber}`);
    
    const added = userService.addPhoneToUser(username, phoneNumber);
    
    if (added) {
        // Marcar como que tiene sesión
        userService.updatePhoneSession(phoneNumber, true);
        console.log(`   ✅ Agregado y marcado con sesión activa`);
    } else {
        console.log(`   ⚠️  Ya existe en la base de datos`);
    }
});

userService.close();

console.log('\n' + '='.repeat(60));
console.log('✅ MIGRACIÓN COMPLETADA');
console.log('='.repeat(60));
console.log('\n📋 Resumen:');
console.log(`   Usuario: ${username}`);
console.log(`   Contraseña: admin`);
console.log(`   Números migrados: ${sessions.length}`);
console.log('\n💡 Ahora puedes iniciar sesión con estas credenciales\n');
