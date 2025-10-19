/**
 * Servicio para gestionar usuarios y sus números de teléfono
 */
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

class UserService {
    constructor() {
        const dbPath = path.join(__dirname, '../../database/users.db');
        this.db = new Database(dbPath);
        this.initDatabase();
    }

    initDatabase() {
        // Tabla de usuarios
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de números de teléfono por usuario
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_phones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                phone_number TEXT NOT NULL,
                has_session INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, phone_number)
            )
        `);

        // Crear usuario por defecto si no existe
        this.createDefaultUser();
    }

    createDefaultUser() {
        const defaultUsername = 'admin';
        const defaultPassword = 'admin';
        
        const exists = this.db.prepare('SELECT id FROM users WHERE username = ?').get(defaultUsername);
        
        if (!exists) {
            const passwordHash = this.hashPassword(defaultPassword);
            this.db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(defaultUsername, passwordHash);
            console.log('✅ Usuario por defecto creado: admin / admin');
        }
    }

    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    verifyUser(username, password) {
        const passwordHash = this.hashPassword(password);
        const user = this.db.prepare('SELECT id, username FROM users WHERE username = ? AND password_hash = ?').get(username, passwordHash);
        return user || null;
    }

    getUserPhones(username) {
        const user = this.db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (!user) return [];

        const phones = this.db.prepare(`
            SELECT phone_number, has_session 
            FROM user_phones 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `).all(user.id);

        return phones.map(p => ({
            number: p.phone_number,
            hasSession: p.has_session === 1
        }));
    }

    addPhoneToUser(username, phoneNumber) {
        const user = this.db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (!user) return false;

        try {
            this.db.prepare('INSERT INTO user_phones (user_id, phone_number) VALUES (?, ?)').run(user.id, phoneNumber);
            return true;
        } catch (error) {
            console.error('Error al agregar teléfono:', error.message);
            return false;
        }
    }

    updatePhoneSession(phoneNumber, hasSession) {
        this.db.prepare('UPDATE user_phones SET has_session = ? WHERE phone_number = ?').run(hasSession ? 1 : 0, phoneNumber);
    }

    close() {
        this.db.close();
    }
}

module.exports = UserService;
