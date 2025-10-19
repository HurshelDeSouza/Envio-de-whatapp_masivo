/**
 * Gestor de múltiples sesiones de WhatsApp
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');

class WhatsAppSessionManager {
    constructor(io) {
        this.io = io;
        this.sessions = new Map(); // phone -> { client, status, messageSender }
        this.sessionsDir = path.join(__dirname, '../../.wwebjs_sessions');
        
        // Crear directorio de sesiones si no existe
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir, { recursive: true });
        }
    }

    /**
     * Obtiene o crea una sesión para un número de teléfono
     */
    async getSession(phone) {
        // Limpiar el número de teléfono (solo dígitos y +)
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        
        // Si ya existe una sesión, devolverla (sin importar el estado)
        if (this.sessions.has(cleanPhone)) {
            return this.sessions.get(cleanPhone);
        }

        // Crear nueva sesión solo si no existe
        console.log(`🆕 Creando nueva sesión para ${cleanPhone}`);
        return await this.createSession(cleanPhone);
    }

    /**
     * Crea una nueva sesión de WhatsApp
     */
    async createSession(phone) {
        console.log(`\n🔄 Creando sesión para: ${phone}`);

        // Convertir el número a un formato válido para clientId (sin +)
        const clientId = phone.replace(/\+/g, '');
        const sessionPath = path.join(this.sessionsDir, clientId);
        
        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: clientId,
                dataPath: sessionPath
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

        const session = {
            phone: phone,
            client: client,
            status: 'initializing',
            messageSender: null,
            createdAt: new Date()
        };

        this.sessions.set(phone, session);

        // Configurar eventos
        this.setupClientEvents(phone, client);

        // Inicializar cliente
        client.initialize();

        return session;
    }

    /**
     * Configura los eventos del cliente de WhatsApp
     */
    setupClientEvents(phone, client) {
        client.on('qr', async (qr) => {
            console.log(`📱 QR generado para ${phone}`);
            const session = this.sessions.get(phone);
            if (session) {
                session.status = 'qr_ready';
            }
            
            // Convertir QR a imagen base64
            const QRCode = require('qrcode');
            try {
                const qrImage = await QRCode.toDataURL(qr, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                });
                console.log(`✅ QR convertido a imagen para ${phone}`);
                this.io.emit('whatsapp-qr', { phone, qr: qrImage });
            } catch (error) {
                console.error('Error generando QR:', error);
                this.io.emit('whatsapp-qr', { phone, qr });
            }
        });

        client.on('authenticated', () => {
            console.log(`✅ ${phone} autenticado`);
            const session = this.sessions.get(phone);
            if (session) {
                session.status = 'authenticated';
            }
            this.io.emit('whatsapp-authenticated', { phone });
        });

        client.on('ready', () => {
            console.log(`✅ ${phone} conectado y listo!`);
            const session = this.sessions.get(phone);
            if (session) {
                session.status = 'ready';
                // Crear servicio de mensajes
                const MessageSenderService = require('./MessageSenderService');
                session.messageSender = new MessageSenderService(client);
            }
            
            // Actualizar estado en la base de datos
            const UserService = require('../database/UserService');
            const userService = new UserService();
            userService.updatePhoneSession(phone, true);
            userService.close();
            
            this.io.emit('whatsapp-ready', { phone });
        });

        client.on('auth_failure', (msg) => {
            console.error(`❌ Error de autenticación para ${phone}:`, msg);
            const session = this.sessions.get(phone);
            if (session) {
                session.status = 'auth_failed';
            }
            this.io.emit('whatsapp-error', { 
                phone, 
                message: 'Error de autenticación. Intenta nuevamente.' 
            });
        });

        client.on('disconnected', (reason) => {
            console.log(`⚠️ ${phone} desconectado:`, reason);
            const session = this.sessions.get(phone);
            if (session) {
                session.status = 'disconnected';
            }
            this.io.emit('whatsapp-disconnected', { phone, reason });
        });
    }

    /**
     * Verifica si existe una sesión guardada para un número
     */
    hasStoredSession(phone) {
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        const clientId = cleanPhone.replace(/\+/g, '');
        const sessionPath = path.join(this.sessionsDir, clientId);
        return fs.existsSync(sessionPath);
    }

    /**
     * Obtiene el estado de una sesión
     */
    getSessionStatus(phone) {
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        const session = this.sessions.get(cleanPhone);
        
        if (!session) {
            return this.hasStoredSession(cleanPhone) ? 'stored' : 'not_found';
        }
        
        return session.status;
    }

    /**
     * Obtiene el servicio de mensajes para una sesión
     */
    getMessageSender(phone) {
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        const session = this.sessions.get(cleanPhone);
        
        if (!session || session.status !== 'ready') {
            return null;
        }
        
        return session.messageSender;
    }

    /**
     * Cierra una sesión específica
     */
    async closeSession(phone) {
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        const session = this.sessions.get(cleanPhone);
        
        if (session && session.client) {
            await session.client.destroy();
            this.sessions.delete(cleanPhone);
            console.log(`🔒 Sesión cerrada para ${phone}`);
        }
    }

    /**
     * Cierra todas las sesiones
     */
    async closeAllSessions() {
        console.log('🔒 Cerrando todas las sesiones...');
        for (const [phone, session] of this.sessions) {
            if (session.client) {
                await session.client.destroy();
            }
        }
        this.sessions.clear();
    }

    /**
     * Obtiene información de todas las sesiones activas
     */
    getAllSessions() {
        const sessions = [];
        for (const [phone, session] of this.sessions) {
            sessions.push({
                phone: phone,
                status: session.status,
                createdAt: session.createdAt
            });
        }
        return sessions;
    }
}

module.exports = WhatsAppSessionManager;
