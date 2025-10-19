/**
 * Interfaz Web para WhatsApp Group Auto-Joiner
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const DatabaseService = require('./src/database/DatabaseService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

// Configurar archivos estáticos
app.use(express.static('public'));
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Obtener estadísticas generales
app.get('/api/stats', (req, res) => {
    const country = req.query.country || 'USA';
    const db = new DatabaseService();
    const stats = db.getStatistics();
    const statsByCountry = db.getStatisticsByCountry(country);
    db.close();
    
    res.json({
        general: stats,
        country: statsByCountry,
        selectedCountry: country
    });
});

// API: Obtener grupos exitosos
app.get('/api/groups/successful', (req, res) => {
    const country = req.query.country || 'USA';
    const db = new DatabaseService();
    const stmt = db.db.prepare(`
        SELECT * FROM groups 
        WHERE (status = 'successful' OR (group_id IS NOT NULL AND group_id != 'FAILED'))
        AND country = ?
        ORDER BY joined_at DESC
    `);
    const groups = stmt.all(country);
    db.close();
    
    res.json(groups);
});

// API: Obtener grupos pendientes
app.get('/api/groups/pending', (req, res) => {
    const country = req.query.country || 'USA';
    const db = new DatabaseService();
    const groups = db.getPendingGroupsByCountry(country, 50);
    db.close();
    
    res.json(groups);
});

// API: Obtener grupos que requieren aprobación
app.get('/api/groups/approval', (req, res) => {
    const country = req.query.country || 'USA';
    const db = new DatabaseService();
    const groups = db.getGroupsRequiringApproval(country);
    db.close();
    
    res.json(groups);
});

// API: Obtener grupos fallidos
app.get('/api/groups/failed', (req, res) => {
    const country = req.query.country || 'USA';
    const db = new DatabaseService();
    const stmt = db.db.prepare(`
        SELECT * FROM groups 
        WHERE (status = 'failed' OR group_id = 'FAILED')
        AND country = ?
        ORDER BY joined_at DESC
        LIMIT 50
    `);
    const groups = stmt.all(country);
    db.close();
    
    res.json(groups);
});

// API: Ejecutar proceso de unirse a grupos
app.post('/api/join-group', async (req, res) => {
    try {
        const { spawn } = require('child_process');
        
        console.log('\n' + '='.repeat(60));
        console.log('🚀 Iniciando proceso de agregar grupo...');
        console.log('='.repeat(60) + '\n');
        
        // Ejecutar el script de unirse a grupos
        const process = spawn('node', ['index-group-joiner.js'], {
            stdio: 'inherit' // Mostrar output en la terminal del servidor
        });
        
        process.on('close', (code) => {
            if (code === 0) {
                console.log('\n✅ Proceso de unirse a grupo completado exitosamente\n');
                io.emit('join-complete', { message: 'Proceso completado' });
            } else {
                console.error('\n❌ Proceso terminó con errores\n');
                io.emit('join-error', { message: 'Error en el proceso' });
            }
        });
        
        res.json({ success: true, message: 'Proceso iniciado' });
        io.emit('join-started', { message: 'Iniciando proceso...' });
        
    } catch (error) {
        console.error('❌ Error al iniciar proceso:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// WebSocket para actualizaciones en tiempo real
io.on('connection', (socket) => {
    console.log('✅ Cliente conectado a la interfaz web');
    
    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado');
    });
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🌐 Interfaz Web Iniciada');
    console.log('='.repeat(60));
    console.log(`\n📱 Abre tu navegador en: http://localhost:${PORT}`);
    console.log('\n✨ Funcionalidades disponibles:');
    console.log('   - Ver estadísticas en tiempo real');
    console.log('   - Lista de grupos exitosos');
    console.log('   - Lista de grupos pendientes');
    console.log('   - Gráficos y visualizaciones');
    console.log('\n⚠️  Presiona Ctrl+C para detener el servidor\n');
});

module.exports = { io };
