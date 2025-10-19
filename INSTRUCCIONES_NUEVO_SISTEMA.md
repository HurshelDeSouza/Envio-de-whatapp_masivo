# 🚀 Sistema Multi-Usuario WhatsApp Group Manager

## 📋 Descripción del Nuevo Sistema

El sistema ahora funciona con un flujo de autenticación mejorado:

1. **Login con Usuario/Contraseña** → Autenticación inicial
2. **Selector de Números** → Ver y gestionar números de WhatsApp
3. **Conexión WhatsApp** → QR solo si es necesario
4. **Dashboard** → Gestión de grupos y mensajes

---

## 🔐 Credenciales por Defecto

```
Usuario: admin
Contraseña: admin
```

---

## 🎯 Flujo de Uso

### 1️⃣ Iniciar el Sistema

Ejecuta el archivo:
```
Iniciar-Sistema.bat
```

O manualmente:
```bash
node web-interface.js
```

El servidor se iniciará en: **http://localhost:3000**

### 2️⃣ Login de Usuario

1. Abre tu navegador en `http://localhost:3000`
2. Ingresa las credenciales:
   - Usuario: `admin`
   - Contraseña: `admin`
3. Haz clic en **Iniciar Sesión**

### 3️⃣ Selector de Números

Después del login verás:

- **Números Registrados**: Lista de números de WhatsApp asociados a tu usuario
- **Estado de Conexión**: 
  - ✅ Conectado = Tiene sesión guardada
  - ⚠️ Sin conectar = Necesita escanear QR

**Opciones:**
- **Seleccionar un número existente**: Haz clic en cualquier número
- **Agregar nuevo número**: Haz clic en "➕ Agregar Número"

### 4️⃣ Agregar Nuevo Número

1. Haz clic en **"➕ Agregar Número"**
2. Ingresa el número en formato internacional: `+[código país][número]`
   - Ejemplo: `+573001234567` (Colombia)
   - Ejemplo: `+12694507166` (USA)
3. Haz clic en **Agregar**

### 5️⃣ Conectar WhatsApp

**Si el número YA tiene sesión guardada:**
- Te llevará directamente al Dashboard
- No necesitas escanear QR

**Si el número es NUEVO o no tiene sesión:**
- Se mostrará la pantalla de QR
- Sigue las instrucciones:
  1. Abre WhatsApp en tu teléfono
  2. Ve a **Configuración** → **Dispositivos vinculados**
  3. Toca **Vincular un dispositivo**
  4. Escanea el código QR que aparece en pantalla

### 6️⃣ Dashboard

Una vez conectado, tendrás acceso a:

- **Estadísticas en tiempo real**
- **Gestión de grupos por país**
- **Envío de mensajes a grupos**
- **Verificación de permisos**

---

## 📱 Gestión de Múltiples Números

### Ventajas del Sistema Multi-Número

- ✅ Cada usuario puede tener **múltiples números de WhatsApp**
- ✅ Las sesiones se guardan **permanentemente**
- ✅ No necesitas escanear QR cada vez
- ✅ Puedes cambiar entre números fácilmente
- ✅ Cada número mantiene su propia sesión

### Cambiar de Número

1. En el Dashboard, haz clic en **"🚪 Cerrar Sesión"**
2. Volverás al selector de números
3. Selecciona otro número de la lista

---

## 🔧 Comandos Útiles

### Migrar Sesiones Existentes

Si ya tenías sesiones de WhatsApp guardadas:

```bash
node migrate-current-session.js
```

Este comando:
- Detecta sesiones existentes en `.wwebjs_sessions`
- Las agrega automáticamente al usuario `admin`
- Las marca como activas

### Verificar Base de Datos

```bash
node check-db.js
```

---

## 🗂️ Estructura de Archivos

```
📁 Proyecto
├── 📁 public/
│   ├── auth-login.html      # Login usuario/contraseña
│   ├── phone-selector.html  # Selector de números
│   ├── qr-scan.html         # Pantalla de QR
│   └── index.html           # Dashboard principal
├── 📁 src/
│   ├── 📁 database/
│   │   └── UserService.js   # Gestión de usuarios
│   └── 📁 services/
│       └── WhatsAppSessionManager.js  # Gestión de sesiones
├── 📁 database/
│   └── users.db             # Base de datos de usuarios
├── web-interface.js         # Servidor principal
└── Iniciar-Sistema.bat      # Iniciar servidor
```

---

## 🔒 Seguridad

### Cambiar Contraseña

Para cambiar la contraseña del usuario `admin`:

1. Abre `src/database/UserService.js`
2. Modifica el método `createDefaultUser()`
3. Cambia `const defaultPassword = 'admin';` por tu nueva contraseña
4. Elimina el archivo `database/users.db`
5. Reinicia el servidor (se creará con la nueva contraseña)

### Crear Nuevos Usuarios

Actualmente el sistema usa un usuario por defecto. Para agregar más usuarios:

1. Modifica `UserService.js` para agregar métodos de creación
2. O edita directamente la base de datos `users.db`

---

## ❓ Preguntas Frecuentes

### ¿Puedo usar el mismo número en múltiples computadoras?

No. WhatsApp Web solo permite una sesión activa por número. Si conectas el mismo número en otra computadora, se desconectará de esta.

### ¿Qué pasa si cierro el navegador?

La sesión de WhatsApp se mantiene activa en el servidor. Solo cierra el navegador, no el servidor.

### ¿Cómo detengo el servidor?

Presiona `Ctrl+C` en la terminal donde está corriendo el servidor.

### ¿Los números se guardan automáticamente?

Sí. Una vez que agregas un número y escaneas el QR, la sesión se guarda permanentemente.

### ¿Puedo eliminar un número?

Actualmente no hay interfaz para eliminar números. Puedes hacerlo manualmente editando la base de datos `users.db`.

---

## 🐛 Solución de Problemas

### No aparece el código QR

1. Verifica que el servidor esté corriendo
2. Revisa la consola del servidor para ver errores
3. Intenta con otro navegador
4. Asegúrate de que el puerto 3000 no esté en uso

### Error "WhatsApp no está conectado"

1. Ve al selector de números
2. Selecciona el número nuevamente
3. Si es necesario, escanea el QR de nuevo

### El número no aparece en la lista

1. Ejecuta `node migrate-current-session.js`
2. O agrégalo manualmente desde el selector

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en la consola del servidor
2. Verifica que todos los archivos estén presentes
3. Asegúrate de tener las dependencias instaladas: `npm install`

---

## ✨ Características Futuras

- [ ] Interfaz para eliminar números
- [ ] Múltiples usuarios con diferentes permisos
- [ ] Historial de mensajes enviados
- [ ] Programación de mensajes
- [ ] Estadísticas por número de WhatsApp

---

**¡Disfruta del nuevo sistema! 🎉**
