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
    const db = new DatabaseService();
    const stats = db.getStatistics();
    const statsByCountry = db.getStatisticsByCountry('USA');
    db.close();
    
    res.json({
        general: stats,
        usa: statsByCountry
    });
});

// API: Obtener grupos exitosos
app.get('/api/groups/successful', (req, res) => {
    const db = new DatabaseService();
    const groups = db.getSuccessfulGroups();
    db.close();
    
    res.json(groups);
});

// API: Obtener grupos pendientes
app.get('/api/groups/pending', (req, res) => {
    const db = new DatabaseService();
    const groups = db.getPendingGroupsByCountry('USA', 50);
    db.close();
    
    res.json(groups);
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
