/**
 * Configuración de la aplicación
 * Single Responsibility: Solo maneja la configuración
 */
class AppConfig {
    constructor() {
        this.puppeteerConfig = {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        };
        
        this.delayConfig = {
            min: 2000, // 2 segundos
            max: 5000  // 5 segundos
        };
    }

    getPuppeteerConfig() {
        return this.puppeteerConfig;
    }

    getRandomDelay() {
        const { min, max } = this.delayConfig;
        return Math.floor(Math.random() * (max - min)) + min;
    }
}

module.exports = AppConfig;
