const fs = require('fs');
const path = require('path');

/**
 * Cargador de datos desde archivos
 * Single Responsibility: Solo maneja la carga de datos
 */
class DataLoader {
    loadMessagingData(filePath = 'numeros.json') {
        try {
            const fullPath = path.join(process.cwd(), filePath);
            const rawData = fs.readFileSync(fullPath, 'utf8');
            const data = JSON.parse(rawData);
            
            this._validateData(data);
            
            return {
                message: data.mensaje,
                phoneNumbers: data.numeros
            };
        } catch (error) {
            throw new Error(`Error al cargar datos: ${error.message}`);
        }
    }

    _validateData(data) {
        if (!data.mensaje || typeof data.mensaje !== 'string') {
            throw new Error('El campo "mensaje" es requerido y debe ser texto');
        }
        
        if (!Array.isArray(data.numeros) || data.numeros.length === 0) {
            throw new Error('El campo "numeros" debe ser un array con al menos un número');
        }
    }
}

module.exports = DataLoader;
