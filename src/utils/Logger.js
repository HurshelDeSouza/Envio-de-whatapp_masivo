/**
 * Logger para mensajes de consola
 * Single Responsibility: Solo maneja el logging
 * Dependency Inversion: Podría implementar una interfaz ILogger
 */
class Logger {
    logStart(totalNumbers) {
        console.log(`\nIniciando envío de mensajes a ${totalNumbers} números...`);
    }

    logSuccess(phoneNumber, current, total) {
        console.log(`✓ [${current}/${total}] Mensaje enviado a ${phoneNumber}`);
    }

    logError(phoneNumber, current, total, errorMessage) {
        console.error(`✗ [${current}/${total}] Error enviando a ${phoneNumber}: ${errorMessage}`);
    }

    logSummary(results) {
        console.log(`\n=== Resumen ===`);
        console.log(`Exitosos: ${results.successful}`);
        console.log(`Fallidos: ${results.failed}`);
        console.log(`Total: ${results.successful + results.failed}`);
    }

    logReady() {
        console.log('Cliente de WhatsApp conectado y listo!');
    }

    logQR() {
        console.log('Escanea este código QR con tu WhatsApp:');
    }

    logExit() {
        console.log('\nPresiona Ctrl+C para salir');
    }
}

module.exports = Logger;
