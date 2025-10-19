/**
 * Interfaz Web para WhatsApp Group Auto-Joiner
 * Con soporte para múltiples sesiones de WhatsApp
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const DatabaseService = require('./src/database/DatabaseService');
const UserService = require('./src/database/UserService');
const WhatsAppSessionManager = require('./src/services/WhatsAppSessionManager');
const GroupPermissionChecker = require('./src/services/GroupPermissionChecker');
const TemplateService = require('./src/database/TemplateService');
const CampaignService = require('./src/database/CampaignService');
const MessageCampaignService = require('./src/services/MessageCampaignService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

// Gestor de sesiones de WhatsApp
let sessionManager = null;

// Configurar archivos estáticos
app.use(express.static('public'));
app.use(express.json());

// Ruta principal - redirige al login de usuario
app.get('/', (req, res) => {
    res.redirect('/auth-login');
});

// Ruta de login de usuario
app.get('/auth-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth-login.html'));
});

// Ruta de selector de números
app.get('/phone-selector', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'phone-selector.html'));
});

// Ruta de login - redirige al login de usuario
app.get('/login', (req, res) => {
    res.redirect('/auth-login');
});

// Ruta para mostrar QR de un número nuevo
app.get('/qr-scan', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'qr-scan.html'));
});

// Ruta del dashboard (requiere phone)
app.get('/dashboard', (req, res) => {
    const phone = req.query.phone;
    if (!phone) {
        return res.redirect('/auth-login');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de envío de mensajes
app.get('/send-messages', (req, res) => {
    const phone = req.query.phone;
    if (!phone) {
        return res.redirect('/auth-login');
    }
    res.sendFile(path.join(__dirname, 'public', 'send-messages.html'));
});

// API: Login de usuario (usuario y contraseña)
app.post('/api/auth/user-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('\n' + '='.repeat(60));
        console.log('👤 LOGIN DE USUARIO');
        console.log('='.repeat(60));
        console.log(`Usuario: ${username}`);
        
        if (!username || !password) {
            console.log('❌ Faltan credenciales');
            return res.status(400).json({ 
                success: false, 
                message: 'Usuario y contraseña requeridos' 
            });
        }

        const userService = new UserService();
        const user = userService.verifyUser(username, password);
        userService.close();

        if (user) {
            console.log('✅ Login exitoso');
            console.log('='.repeat(60) + '\n');
            // Generar token simple (en producción usar JWT)
            const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
            res.json({ 
                success: true, 
                token: token,
                username: user.username
            });
        } else {
            console.log('❌ Credenciales inválidas');
            console.log('='.repeat(60) + '\n');
            res.status(401).json({ 
                success: false, 
                message: 'Usuario o contraseña incorrectos' 
            });
        }
        
    } catch (error) {
        console.error('❌ Error en login de usuario:', error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// API: Listar números de un usuario
app.get('/api/phones/list', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No autorizado' 
            });
        }

        const username = Buffer.from(token, 'base64').toString().split(':')[0];
        
        const userService = new UserService();
        const phones = userService.getUserPhones(username);
        userService.close();

        // Verificar si cada número tiene sesión guardada en el sistema
        const phonesWithStatus = phones.map(phone => ({
            ...phone,
            hasSession: sessionManager.hasStoredSession(phone.number)
        }));

        res.json({ 
            success: true, 
            phones: phonesWithStatus 
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// API: Agregar número a un usuario
app.post('/api/phones/add', async (req, res) => {
    try {
        const { phone, username } = req.body;
        
        console.log('\n' + '='.repeat(60));
        console.log('➕ AGREGAR NÚMERO');
        console.log('='.repeat(60));
        console.log(`Usuario: ${username}`);
        console.log(`Número: ${phone}`);
        
        if (!phone || !username) {
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan parámetros' 
            });
        }

        const userService = new UserService();
        const added = userService.addPhoneToUser(username, phone);
        userService.close();

        if (added) {
            console.log('✅ Número agregado exitosamente');
            console.log('='.repeat(60) + '\n');
            res.json({ 
                success: true, 
                message: 'Número agregado exitosamente' 
            });
        } else {
            console.log('❌ Error al agregar número');
            console.log('='.repeat(60) + '\n');
            res.status(400).json({ 
                success: false, 
                message: 'No se pudo agregar el número (puede que ya exista)' 
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// API: Login - Iniciar sesión con número de teléfono
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone } = req.body;
        
        console.log('\n' + '='.repeat(60));
        console.log('🔐 INICIO DE SESIÓN');
        console.log('='.repeat(60));
        
        if (!phone) {
            console.log('❌ Número de teléfono no proporcionado');
            return res.status(400).json({ 
                success: false, 
                message: 'Número de teléfono requerido' 
            });
        }

        console.log(`📱 Número: ${phone}`);

        // Verificar si ya existe una sesión guardada
        const hasStored = sessionManager.hasStoredSession(phone);
        
        if (hasStored) {
            console.log(`✅ Sesión guardada encontrada`);
            console.log(`🔄 Recuperando sesión...`);
            // Iniciar sesión existente
            await sessionManager.getSession(phone);
            console.log('='.repeat(60) + '\n');
            res.json({ 
                success: true, 
                needsQR: false,
                message: 'Sesión encontrada, conectando...' 
            });
        } else {
            console.log(`📱 Primera vez con este número`);
            console.log(`🔄 Creando nueva sesión...`);
            console.log(`⚠️  Se requerirá escanear código QR`);
            // Crear nueva sesión (mostrará QR)
            await sessionManager.getSession(phone);
            console.log('='.repeat(60) + '\n');
            res.json({ 
                success: true, 
                needsQR: true,
                message: 'Escanea el código QR' 
            });
        }
        
    } catch (error) {
        console.error('\n❌ Error en login:', error.message);
        console.error(error.stack);
        console.log('='.repeat(60) + '\n');
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// API: Verificar si un número tiene sesión guardada
app.get('/api/check-session', (req, res) => {
    const phone = req.query.phone;
    
    if (!phone) {
        return res.status(400).json({ 
            success: false, 
            message: 'Número de teléfono requerido' 
        });
    }

    const hasSession = sessionManager.hasStoredSession(phone);
    res.json({ 
        success: true, 
        hasSession: hasSession,
        phone: phone
    });
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
        
        console.log('\n' + '='.repeat(60));
        console.log('🔐 VERIFICACIÓN DE PERMISOS MÚLTIPLES');
        console.log('='.repeat(60));
        console.log(`📱 Usuario: ${phone}`);
        console.log(`📊 Grupos a verificar: ${groupIds.length}`);
        
        if (!groupIds || !phone || !Array.isArray(groupIds)) {
            console.log('❌ Faltan parámetros requeridos');
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan parámetros: groupIds (array) y phone son requeridos' 
            });
        }

        // Obtener la sesión del usuario
        const session = await sessionManager.getSession(phone);
        
        if (!session || session.status !== 'ready') {
            console.log('❌ WhatsApp no está conectado');
            return res.status(503).json({ 
                success: false, 
                message: 'WhatsApp no está conectado para este número' 
            });
        }

        console.log('✅ Sesión de WhatsApp lista');
        console.log('🔄 Iniciando verificación...\n');

        // Verificar permisos de todos los grupos
        const checker = new GroupPermissionChecker(session.client);
        const permissions = await checker.checkMultipleGroups(groupIds);

        // Guardar permisos en la base de datos
        console.log('\n💾 Guardando permisos en base de datos...');
        const db = new DatabaseService();
        let canSendCount = 0;
        let cannotSendCount = 0;
        
        for (const [groupId, permission] of Object.entries(permissions)) {
            db.updateGroupPermissions(groupId, permission.canSend, permission.reason);
            if (permission.canSend) {
                canSendCount++;
            } else {
                cannotSendCount++;
            }
        }
        db.close();

        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE VERIFICACIÓN');
        console.log('='.repeat(60));
        console.log(`✅ Pueden enviar mensajes: ${canSendCount}`);
        console.log(`🚫 NO pueden enviar mensajes: ${cannotSendCount}`);
        console.log(`💾 Total guardados en BD: ${groupIds.length}`);
        console.log('='.repeat(60) + '\n');

        res.json({ 
            success: true, 
            permissions: permissions 
        });
        
    } catch (error) {
        console.error('\n❌ Error al verificar permisos múltiples:', error.message);
        console.error(error.stack);
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

// ============================================================
// APIs DE TEMPLATES
// ============================================================

// API: Obtener todos los templates
app.get('/api/templates', (req, res) => {
    try {
        const templateService = new TemplateService();
        const templates = templateService.getAllTemplates();
        templateService.close();
        
        res.json({ success: true, templates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Crear template
app.post('/api/templates', (req, res) => {
    try {
        const { name, message, category } = req.body;
        
        const templateService = new TemplateService();
        const result = templateService.createTemplate(name, message, category);
        templateService.close();
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Actualizar template
app.put('/api/templates/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, message, category } = req.body;
        
        const templateService = new TemplateService();
        const result = templateService.updateTemplate(id, name, message, category);
        templateService.close();
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Eliminar template
app.delete('/api/templates/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        const templateService = new TemplateService();
        const result = templateService.deleteTemplate(id);
        templateService.close();
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// APIs DE CAMPAÑAS
// ============================================================

// API: Crear campaña
app.post('/api/campaigns', (req, res) => {
    try {
        const campaignService = new CampaignService();
        const result = campaignService.createCampaign(req.body);
        campaignService.close();
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Obtener todas las campañas
app.get('/api/campaigns', (req, res) => {
    try {
        const { phone } = req.query;
        
        const campaignService = new CampaignService();
        const campaigns = campaignService.getAllCampaigns(phone);
        campaignService.close();
        
        res.json({ success: true, campaigns });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Obtener campañas programadas
app.get('/api/campaigns/scheduled', (req, res) => {
    try {
        const campaignService = new CampaignService();
        const campaigns = campaignService.getScheduledCampaigns();
        campaignService.close();
        
        res.json({ success: true, campaigns });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Obtener campañas pausadas
app.get('/api/campaigns/paused', (req, res) => {
    try {
        const { phone } = req.query;
        
        const campaignService = new CampaignService();
        const campaigns = campaignService.getPausedCampaigns(phone);
        campaignService.close();
        
        res.json({ success: true, campaigns });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Ejecutar campaña con configuración avanzada
app.post('/api/campaigns/send', async (req, res) => {
    try {
        const { phone, groupIds, message, config } = req.body;
        
        if (!phone || !groupIds || !message) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos'
            });
        }

        // Obtener sesión de WhatsApp
        const session = await sessionManager.getSession(phone);
        
        if (!session || session.status !== 'ready') {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp no está conectado'
            });
        }

        // Crear servicio de campaña
        const campaignService = new MessageCampaignService(session.client, phone);
        
        // Ejecutar campaña en segundo plano
        campaignService.sendCampaign({
            groupIds,
            message,
            ...config
        }).then(results => {
            io.emit('campaign-completed', { phone, results });
        }).catch(error => {
            io.emit('campaign-error', { phone, error: error.message });
        });

        res.json({
            success: true,
            message: 'Campaña iniciada'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Pausar campaña
app.post('/api/campaigns/:id/pause', (req, res) => {
    try {
        const { id } = req.params;
        
        const campaignService = new CampaignService();
        const result = campaignService.updateCampaignStatus(id, 'paused');
        campaignService.close();
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Reanudar campaña
app.post('/api/campaigns/:id/resume', (req, res) => {
    try {
        const { id } = req.params;
        
        const campaignService = new CampaignService();
        const result = campaignService.updateCampaignStatus(id, 'running');
        campaignService.close();
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Eliminar campaña
app.delete('/api/campaigns/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        const campaignService = new CampaignService();
        const result = campaignService.deleteCampaign(id);
        campaignService.close();
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
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
