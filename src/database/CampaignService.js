/**
 * Servicio para gestionar campañas programadas
 */
const Database = require('better-sqlite3');
const path = require('path');

class CampaignService {
    constructor() {
        const dbPath = path.join(__dirname, '../../database/campaigns.db');
        this.db = new Database(dbPath);
        this.initDatabase();
    }

    initDatabase() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                message TEXT NOT NULL,
                group_ids TEXT NOT NULL,
                scheduled_at DATETIME,
                status TEXT DEFAULT 'pending',
                config TEXT,
                results TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME,
                completed_at DATETIME
            )
        `);
    }

    /**
     * Crear nueva campaña
     */
    createCampaign(data) {
        const {
            name,
            phone,
            message,
            groupIds,
            scheduledAt = null,
            config = {}
        } = data;

        try {
            const result = this.db.prepare(`
                INSERT INTO campaigns (name, phone, message, group_ids, scheduled_at, config, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                name,
                phone,
                message,
                JSON.stringify(groupIds),
                scheduledAt,
                JSON.stringify(config),
                scheduledAt ? 'scheduled' : 'pending'
            );

            return { success: true, id: result.lastInsertRowid };
        } catch (error) {
            console.error('Error creando campaña:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener todas las campañas
     */
    getAllCampaigns(phone = null) {
        let query = 'SELECT * FROM campaigns ORDER BY created_at DESC';
        let params = [];

        if (phone) {
            query = 'SELECT * FROM campaigns WHERE phone = ? ORDER BY created_at DESC';
            params = [phone];
        }

        const campaigns = this.db.prepare(query).all(...params);
        
        return campaigns.map(campaign => ({
            ...campaign,
            group_ids: JSON.parse(campaign.group_ids),
            config: campaign.config ? JSON.parse(campaign.config) : {},
            results: campaign.results ? JSON.parse(campaign.results) : null
        }));
    }

    /**
     * Obtener campañas programadas pendientes
     */
    getScheduledCampaigns() {
        const now = new Date().toISOString();
        const campaigns = this.db.prepare(`
            SELECT * FROM campaigns 
            WHERE status = 'scheduled' AND scheduled_at <= ?
            ORDER BY scheduled_at ASC
        `).all(now);

        return campaigns.map(campaign => ({
            ...campaign,
            group_ids: JSON.parse(campaign.group_ids),
            config: campaign.config ? JSON.parse(campaign.config) : {},
            results: campaign.results ? JSON.parse(campaign.results) : null
        }));
    }

    /**
     * Obtener campañas pausadas
     */
    getPausedCampaigns(phone = null) {
        let query = 'SELECT * FROM campaigns WHERE status = ? ORDER BY created_at DESC';
        let params = ['paused'];

        if (phone) {
            query = 'SELECT * FROM campaigns WHERE status = ? AND phone = ? ORDER BY created_at DESC';
            params = ['paused', phone];
        }

        const campaigns = this.db.prepare(query).all(...params);
        
        return campaigns.map(campaign => ({
            ...campaign,
            group_ids: JSON.parse(campaign.group_ids),
            config: campaign.config ? JSON.parse(campaign.config) : {},
            results: campaign.results ? JSON.parse(campaign.results) : null
        }));
    }

    /**
     * Obtener campaña por ID
     */
    getCampaignById(id) {
        const campaign = this.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
        
        if (!campaign) return null;

        return {
            ...campaign,
            group_ids: JSON.parse(campaign.group_ids),
            config: campaign.config ? JSON.parse(campaign.config) : {},
            results: campaign.results ? JSON.parse(campaign.results) : null
        };
    }

    /**
     * Actualizar estado de campaña
     */
    updateCampaignStatus(id, status, results = null) {
        try {
            let query = 'UPDATE campaigns SET status = ?';
            let params = [status];

            if (status === 'running') {
                query += ', started_at = CURRENT_TIMESTAMP';
            } else if (status === 'completed' || status === 'failed') {
                query += ', completed_at = CURRENT_TIMESTAMP';
            }

            if (results) {
                query += ', results = ?';
                params.push(JSON.stringify(results));
            }

            query += ' WHERE id = ?';
            params.push(id);

            this.db.prepare(query).run(...params);

            return { success: true };
        } catch (error) {
            console.error('Error actualizando campaña:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Eliminar campaña
     */
    deleteCampaign(id) {
        try {
            this.db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
            return { success: true };
        } catch (error) {
            console.error('Error eliminando campaña:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener estadísticas de campañas
     */
    getStatistics(phone = null) {
        let query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
                SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
                SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM campaigns
        `;

        if (phone) {
            query += ' WHERE phone = ?';
            return this.db.prepare(query).get(phone);
        }

        return this.db.prepare(query).get();
    }

    close() {
        this.db.close();
    }
}

module.exports = CampaignService;
