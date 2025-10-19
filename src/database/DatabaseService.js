const Database = require('better-sqlite3');
const path = require('path');

/**
 * Servicio de base de datos para gestionar grupos de WhatsApp
 */
class DatabaseService {
    static initialized = false;

    constructor() {
        const dbPath = path.join(__dirname, '../../database/groups.db');
        this.db = new Database(dbPath);
        this.initDatabase();
    }

    /**
     * Inicializa las tablas de la base de datos
     */
    initDatabase() {
        // Tabla de grupos
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                link TEXT UNIQUE NOT NULL,
                name TEXT,
                country TEXT,
                country_origin TEXT,
                members TEXT,
                admin_permission TEXT,
                status TEXT DEFAULT 'pending',
                group_id TEXT,
                error_message TEXT,
                requires_approval INTEGER DEFAULT 0,
                verified INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                joined_at DATETIME,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de estadísticas
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS statistics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE DEFAULT (date('now')),
                total_attempts INTEGER DEFAULT 0,
                successful INTEGER DEFAULT 0,
                failed INTEGER DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Solo mostrar mensaje en el primer inicio
        if (!DatabaseService.initialized) {
            console.log('✅ Base de datos inicializada correctamente');
            DatabaseService.initialized = true;
        }
    }

    /**
     * Agrega un nuevo grupo a la base de datos
     */
    addGroup(group) {
        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO groups (link, name, country, country_origin, members, admin_permission)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        try {
            const result = stmt.run(
                group.link,
                group.name || null,
                group.country || null,
                group.countryOrigin || null,
                group.members || null,
                group.adminPermission || null
            );
            return result.changes > 0;
        } catch (error) {
            console.error('Error al agregar grupo:', error.message);
            return false;
        }
    }

    /**
     * Agrega múltiples grupos a la base de datos
     */
    addMultipleGroups(groups) {
        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO groups (link, name, country, country_origin, members, admin_permission)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const insertMany = this.db.transaction((groups) => {
            let added = 0;
            for (const group of groups) {
                const result = stmt.run(
                    group.link,
                    group.name || null,
                    group.country || null,
                    group.countryOrigin || null,
                    group.members || null,
                    group.adminPermission || null
                );
                if (result.changes > 0) added++;
            }
            return added;
        });

        return insertMany(groups);
    }

    /**
     * Marca un grupo como exitoso
     */
    markGroupAsSuccessful(link, groupId) {
        const stmt = this.db.prepare(`
            UPDATE groups 
            SET status = 'successful', 
                group_id = ?, 
                joined_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE link = ?
        `);

        return stmt.run(groupId, link);
    }

    /**
     * Marca un grupo como fallido
     */
    markGroupAsFailed(link, errorMessage) {
        const stmt = this.db.prepare(`
            UPDATE groups 
            SET status = 'failed', 
                error_message = ?,
                joined_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE link = ?
        `);

        return stmt.run(errorMessage, link);
    }

    /**
     * Verifica si un grupo ya fue procesado
     */
    isGroupProcessed(link) {
        const stmt = this.db.prepare(`
            SELECT status FROM groups WHERE link = ? AND status IN ('successful', 'failed')
        `);

        return stmt.get(link) !== undefined;
    }

    /**
     * Obtiene grupos pendientes por país
     */
    getPendingGroupsByCountry(country, limit = 10) {
        const stmt = this.db.prepare(`
            SELECT * FROM groups 
            WHERE country = ? AND status = 'pending'
            ORDER BY created_at ASC
            LIMIT ?
        `);

        return stmt.all(country, limit);
    }

    /**
     * Obtiene estadísticas generales
     */
    getStatistics() {
        const stmt = this.db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'successful' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
            FROM groups
        `);

        return stmt.get();
    }

    /**
     * Obtiene estadísticas por país
     */
    getStatisticsByCountry(country) {
        const stmt = this.db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'successful' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
            FROM groups
            WHERE country = ?
        `);

        return stmt.get(country);
    }

    /**
     * Obtiene todos los grupos exitosos
     */
    getSuccessfulGroups() {
        const stmt = this.db.prepare(`
            SELECT * FROM groups 
            WHERE (status = 'successful' OR (group_id IS NOT NULL AND group_id != 'FAILED'))
            ORDER BY joined_at DESC
        `);

        return stmt.all();
    }

    /**
     * Marca un grupo como verificado
     */
    markGroupAsVerified(link, requiresApproval, groupInfo = null) {
        const stmt = this.db.prepare(`
            UPDATE groups 
            SET verified = 1,
                requires_approval = ?,
                name = COALESCE(?, name),
                updated_at = CURRENT_TIMESTAMP
            WHERE link = ?
        `);

        return stmt.run(requiresApproval ? 1 : 0, groupInfo?.groupName || null, link);
    }

    /**
     * Obtiene grupos que requieren aprobación
     */
    getGroupsRequiringApproval(country = null) {
        let query = `
            SELECT * FROM groups 
            WHERE verified = 1 AND requires_approval = 1 AND status = 'pending'
        `;
        
        if (country) {
            query += ` AND country = ?`;
            const stmt = this.db.prepare(query + ` ORDER BY created_at ASC`);
            return stmt.all(country);
        } else {
            const stmt = this.db.prepare(query + ` ORDER BY created_at ASC`);
            return stmt.all();
        }
    }

    /**
     * Obtiene grupos verificados que funcionan (no requieren aprobación)
     */
    getWorkingGroups(country = null) {
        let query = `
            SELECT * FROM groups 
            WHERE verified = 1 AND requires_approval = 0 AND status = 'pending'
        `;
        
        if (country) {
            query += ` AND country = ?`;
            const stmt = this.db.prepare(query + ` ORDER BY created_at ASC`);
            return stmt.all(country);
        } else {
            const stmt = this.db.prepare(query + ` ORDER BY created_at ASC`);
            return stmt.all();
        }
    }

    /**
     * Cierra la conexión a la base de datos
     */
    close() {
        this.db.close();
    }
}

module.exports = DatabaseService;
