/**
 * Interfaz Web para WhatsApp Group Auto-Joiner
 * Con soporte para múltiples sesiones de WhatsApp
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const DatabaseService = require('./src/database/DatabaseService');
const WhatsAppSessionManager = require('./src/services/WhatsAppSessionManager');
const GroupPermissionChecker = require('./src/services/GroupPermissionChecker');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

// Gestor de sesiones de WhatsApp
let sessionManager = null;

// Configurar archivos estáticos
app.use(express.static('public'));
app.use(express.json());

// Ruta principal - redirige al login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Ruta de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Ruta del dashboard (requiere phone)
app.get('/dashboard', (req, res) => {
    const phone = req.query.phone;
    if (!phone) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Login - Iniciar sesión con número de teléfono
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Número de teléfono requerido' 
            });
        }

        console.log(`\n🔐 Intento de login: ${phone}`);

        // Verificar si ya existe una sesión guardada
        const hasStored = sessionManager.hasStoredSession(phone);
        
        if (hasStored) {
            console.log(`✅ Sesión encontrada para ${phone}`);
            // Iniciar sesión existente
            await sessionManager.getSession(phone);
            res.json({ 
                success: true, 
                needsQR: false,
                message: 'Sesión encontrada, conectando...' 
            });
        } else {
            console.log(`📱 Primera vez para ${phone}, se requiere QR`);
            // Crear nueva sesión (mostrará QR)
            await sessionManager.getSession(phone);
            res.json({ 
                success: true, 
                needsQR: true,
                message: 'Escanea el código QR' 
            });
        }
        
    } catch (error) {
        console.error('❌ Error en login:', error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// API: Verificar estado de sesión
app.get('/api/auth/status', (req, res) => {
    const phone = req.query.phone;
    
    if (!phone) {
        return res.status(400).json({ 
            success: false, 
            message: 'Número de teléfono requerido' 
        });
    }

    const status = sessionManager.getSessionStatus(phone);
    res.json({ 
        success: true, 
        status: status,
        phone: phone
    });
});

// API: Cerrar sesión
app.post('/api/auth/logout', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Número de teléfono requerido' 
            });
        }

        await sessionManager.closeSession(phone);
        res.json({ 
            success: true, 
            message: 'Sesión cerrada correctamente' 
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// API: Verificar permisos de un grupo
app.post('/api/check-group-permissions', async (req, res) => {
    try {
        const { groupId, phone } = req.body;
        
        if (!groupId || !phone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan parámetros: groupId y phone son requeridos' 
            });
        }

        // Obtener la sesión del usuario
        const session = await sessionManager.getSession(phone);
        
        if (!session || session.status !== 'ready') {
            return res.status(503).json({ 
                success: false, 
                message: 'WhatsApp no está conectado para este número' 
            });
        }

        // Verificar permisos
        const checker = new GroupPermissionChecker(session.client);
        const permissions = await checker.checkGroupPermissions(groupId);

        res.json({ 
            success: true, 
            permissions: permissions 
        });
        
    } catch (error) {
        console.error('❌ Error al verificar permisos:', error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// API: Verificar permisos de múltiples grupos
app.post('/api/check-multiple-permissions', async (req, res) => {
    try {
        const { groupIds, phone } = req.body;
        
        if (!groupIds || !phone || !Array.isArray(groupIds)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan parámetros: groupIds (array) y phone son requeridos' 
            });
        }

        // Obtener la sesión del usuario
        const session = await sessionManager.getSession(phone);
        
        if (!session || session.status !== 'ready') {
            return res.status(503).json({ 
                success: false, 
                message: 'WhatsApp no está conectado para este número' 
            });
        }

        // Verificar permisos de todos los grupos
        const checker = new GroupPermissionChecker(session.client);
        const permissions = await checker.checkMultipleGroups(groupIds);

        // Guardar permisos en la base de datos
        const db = new DatabaseService();
        for (const [groupId, permission] of Object.entries(permissions)) {
            db.updateGroupPermissions(groupId, permission.canSend, permission.reason);
        }
        db.close();

        console.log(`✅ Permisos verificados y guardados para ${groupIds.length} grupos`);

        res.json({ 
            success: true, 
            permissions: permissions 
        });
        
    } catch (error) {
        console.error('❌ Error al verificar permisos múltiples:', error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
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

// API: Enviar mensaje a un grupo
app.post('/api/send-message', async (req, res) => {
    try {
        const { groupId, message, phone } = req.body;
        
        if (!groupId || !message || !phone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan parámetros: groupId, message y phone son requeridos' 
            });
        }

        // Obtener el servicio de mensajes para esta sesión
        const messageSender = sessionManager.getMessageSender(phone);
        
        if (!messageSender) {
            return res.status(503).json({ 
                success: false, 
                message: 'WhatsApp no está conectado para este número. Por favor inicia sesión nuevamente.' 
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log(`📤 Enviando mensaje desde ${phone}...`);
        console.log('='.repeat(60));
        console.log(`Grupo ID: ${groupId}`);
        console.log(`Mensaje: ${message.substring(0, 50)}...`);
        console.log('='.repeat(60) + '\n');

        // Enviar mensaje usando el servicio
        const result = await messageSender.sendMessageToGroup(groupId, message);

        if (result.success) {
            io.emit('message-sent', { 
                phone: phone,
                groupId: groupId,
                message: 'Mensaje enviado exitosamente' 
            });
        }

        res.json(result);
        
    } catch (error) {
        console.error('❌ Error al enviar mensaje:', error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
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
    console.log('🌐 Interfaz Web Iniciada - Sistema Multi-Sesión');
    console.log('='.repeat(60));
    console.log(`\n📱 Abre tu navegador en: http://localhost:${PORT}`);
    console.log('\n✨ Funcionalidades disponibles:');
    console.log('   - Login con número de teléfono');
    console.log('   - Múltiples sesiones de WhatsApp');
    console.log('   - Ver estadísticas en tiempo real');
    console.log('   - Enviar mensajes a grupos');
    console.log('   - Gestión de grupos por usuario');
    console.log('\n⚠️  Presiona Ctrl+C para detener el servidor\n');
    
    // Inicializar gestor de sesiones
    sessionManager = new WhatsAppSessionManager(io);
    console.log('✅ Gestor de sesiones inicializado\n');
});

// Manejar cierre del servidor
process.on('SIGINT', async () => {
    console.log('\n\n🔒 Cerrando servidor...');
    if (sessionManager) {
        await sessionManager.closeAllSessions();
    }
    process.exit(0);
});

module.exports = { io };
