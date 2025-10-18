const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Servicio para leer datos de Google Sheets
 */
class GoogleSheetsService {
    constructor() {
        this.sheets = null;
        this.config = null;
    }

    /**
     * Inicializa el servicio con API Key
     */
    async initialize() {
        try {
            // Cargar configuración
            const configPath = path.join(__dirname, '../../config/groups-config.json');
            this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            // Verificar si existe .env
            const envPath = path.join(__dirname, '../../.env');
            if (!fs.existsSync(envPath)) {
                throw new Error('Archivo .env no encontrado. Crea uno basado en .env.example');
            }

            // Cargar variables de entorno
            require('dotenv').config();

            if (!process.env.GOOGLE_API_KEY) {
                throw new Error('GOOGLE_API_KEY no está configurada en .env');
            }

            // Inicializar Google Sheets API con API Key
            this.sheets = google.sheets({
                version: 'v4',
                auth: process.env.GOOGLE_API_KEY
            });

            console.log('✅ Google Sheets Service inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar Google Sheets Service:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene los grupos de la hoja de cálculo
     * @param {string} country - País a filtrar (opcional)
     * @returns {Array} Lista de grupos
     */
    async getGroups(country = null) {
        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.config.spreadsheetId,
                range: this.config.range,
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                console.log('No se encontraron datos en la hoja');
                return [];
            }

            // Procesar filas (saltar encabezado)
            const groups = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                
                // Columnas: B=0(enlace), C=1(país), D=2(país origen), E=3(nombre), F=4(permiso), G=5(usuarios)
                if (row[0] && row[0].includes('chat.whatsapp.com')) {
                    const group = {
                        link: row[0],
                        country: row[1] || '',
                        countryOrigin: row[2] || '',
                        name: row[3] || '',
                        adminPermission: row[4] || '',
                        members: row[5] || ''
                    };

                    // Filtrar por país si se especifica
                    if (!country || group.country.toUpperCase() === country.toUpperCase()) {
                        groups.push(group);
                    }
                }
            }

            console.log(`✅ Se encontraron ${groups.length} grupos${country ? ` de ${country}` : ''}`);
            return groups;
        } catch (error) {
            console.error('❌ Error al obtener grupos:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene un grupo aleatorio de un país específico
     * @param {string} country - País a filtrar
     * @returns {Object} Grupo aleatorio
     */
    async getRandomGroup(country) {
        const groups = await this.getGroups(country);
        if (groups.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * groups.length);
        return groups[randomIndex];
    }
}

module.exports = GoogleSheetsService;
