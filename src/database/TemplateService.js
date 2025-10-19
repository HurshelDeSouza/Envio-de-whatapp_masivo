/**
 * Servicio para gestionar templates de mensajes
 */
const Database = require('better-sqlite3');
const path = require('path');

class TemplateService {
    constructor() {
        const dbPath = path.join(__dirname, '../../database/templates.db');
        this.db = new Database(dbPath);
        this.initDatabase();
    }

    initDatabase() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                message TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear templates por defecto
        this.createDefaultTemplates();
    }

    createDefaultTemplates() {
        const defaults = [
            {
                name: 'Bienvenida',
                message: '¡Hola! 👋\n\nBienvenido a nuestro grupo. Estamos felices de tenerte aquí.',
                category: 'general'
            },
            {
                name: 'Promoción',
                message: '🎉 ¡OFERTA ESPECIAL! 🎉\n\nDescuento del 50% en todos nuestros productos.\n\n¡No te lo pierdas!',
                category: 'marketing'
            },
            {
                name: 'Recordatorio',
                message: '⏰ Recordatorio:\n\nNo olvides [EVENTO] el [FECHA] a las [HORA].\n\n¡Te esperamos!',
                category: 'eventos'
            }
        ];

        for (const template of defaults) {
            const exists = this.db.prepare('SELECT id FROM templates WHERE name = ?').get(template.name);
            if (!exists) {
                this.db.prepare('INSERT INTO templates (name, message, category) VALUES (?, ?, ?)').run(
                    template.name,
                    template.message,
                    template.category
                );
            }
        }
    }

    /**
     * Crear nuevo template
     */
    createTemplate(name, message, category = 'general') {
        try {
            const result = this.db.prepare(`
                INSERT INTO templates (name, message, category)
                VALUES (?, ?, ?)
            `).run(name, message, category);

            return { success: true, id: result.lastInsertRowid };
        } catch (error) {
            console.error('Error creando template:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener todos los templates
     */
    getAllTemplates() {
        return this.db.prepare('SELECT * FROM templates ORDER BY category, name').all();
    }

    /**
     * Obtener template por ID
     */
    getTemplateById(id) {
        return this.db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    }

    /**
     * Obtener templates por categoría
     */
    getTemplatesByCategory(category) {
        return this.db.prepare('SELECT * FROM templates WHERE category = ? ORDER BY name').all(category);
    }

    /**
     * Actualizar template
     */
    updateTemplate(id, name, message, category) {
        try {
            this.db.prepare(`
                UPDATE templates 
                SET name = ?, message = ?, category = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(name, message, category, id);

            return { success: true };
        } catch (error) {
            console.error('Error actualizando template:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Eliminar template
     */
    deleteTemplate(id) {
        try {
            this.db.prepare('DELETE FROM templates WHERE id = ?').run(id);
            return { success: true };
        } catch (error) {
            console.error('Error eliminando template:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener categorías únicas
     */
    getCategories() {
        const rows = this.db.prepare('SELECT DISTINCT category FROM templates ORDER BY category').all();
        return rows.map(row => row.category);
    }

    close() {
        this.db.close();
    }
}

module.exports = TemplateService;
