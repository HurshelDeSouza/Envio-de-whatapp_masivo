# 📊 Dashboard Web - Instrucciones de Uso

## 🚀 Cómo Acceder al Dashboard

### Opción 1: Usando el archivo .bat (Más fácil)
1. Asegúrate de que el servidor web esté corriendo (ejecuta `Iniciar-Web.bat` si no está corriendo)
2. Haz doble clic en `Abrir-Dashboard.bat`
3. Se abrirá automáticamente en tu navegador

### Opción 2: Manualmente
1. Abre tu navegador
2. Ve a: `http://localhost:3000`

## 📋 Pestañas Disponibles

### 1. ✅ Grupos Exitosos
Muestra todos los grupos a los que te has unido exitosamente:
- Nombre del grupo
- País
- Número de miembros
- Fecha de unión

### 2. ⏳ Grupos Pendientes
Lista de grupos que aún no han sido procesados:
- Muestra hasta 20 grupos pendientes
- Se actualiza automáticamente cada 2 segundos
- Filtra por país seleccionado

### 3. ⚠️ Requieren Aprobación (NUEVO)
**Esta es la nueva pestaña que muestra:**
- Grupos que requieren aprobación del administrador
- Enlace directo al grupo (puedes hacer clic para solicitar unirte)
- Número de miembros
- País de origen
- Estos grupos generalmente tienen más de 100 miembros

**¿Qué hacer con estos grupos?**
- Puedes hacer clic en el enlace para abrir WhatsApp
- Solicitar unirte manualmente
- El administrador del grupo recibirá tu solicitud
- Una vez aprobado, podrás participar en el grupo

### 4. ❌ Grupos Fallidos
Grupos que no se pudieron procesar:
- Muestra el error específico
- Enlaces expirados
- Enlaces inválidos
- Otros errores

## 🎯 Filtro por País

En la parte superior del dashboard puedes seleccionar el país:
- 🇺🇸 USA
- 🇨🇴 Colombia
- 🇻🇪 Venezuela
- 🇦🇷 Argentina
- 🇲🇽 México
- 🌎 LATAM
- 🌎 Latinos

Al cambiar el país, todas las estadísticas y listas se actualizan automáticamente.

## 📊 Estadísticas en Tiempo Real

El dashboard muestra 4 tarjetas con estadísticas:

1. **Total de Grupos**: Todos los grupos en la base de datos
2. **Grupos Exitosos**: Grupos unidos correctamente
3. **Grupos Fallidos**: Grupos con errores
4. **Grupos Pendientes**: Grupos por procesar

Estas estadísticas se actualizan automáticamente cada 2 segundos.

## 🔄 Botón de Actualizar

Cada pestaña tiene un botón "🔄 Actualizar" que te permite:
- Refrescar los datos manualmente
- Ver los cambios más recientes
- Útil si quieres ver actualizaciones inmediatas

## ➕ Botón "Agregar Grupo"

Este botón inicia el proceso automático de:
1. Leer grupos desde Google Sheets
2. Agregar nuevos grupos a la base de datos
3. Intentar unirse a un grupo pendiente
4. Actualizar las estadísticas

**Nota**: El proceso puede tardar varios minutos dependiendo de la configuración.

## 💡 Consejos de Uso

### Para Grupos que Requieren Aprobación:

1. **Revisa la lista** en la pestaña "⚠️ Requieren Aprobación"
2. **Haz clic en el enlace** del grupo que te interese
3. **Se abrirá WhatsApp Web** o la app de WhatsApp
4. **Solicita unirte** al grupo
5. **Espera la aprobación** del administrador

### Estrategia Recomendada:

1. **Primero**: Ejecuta la verificación de enlaces (`npm run verify`)
2. **Segundo**: Revisa el dashboard para ver qué grupos requieren aprobación
3. **Tercero**: Solicita unirte manualmente a los grupos que te interesen
4. **Cuarto**: Usa el proceso automático solo para grupos que no requieren aprobación

## 🔧 Solución de Problemas

### El dashboard no carga
- Verifica que el servidor web esté corriendo
- Ejecuta `npm run web` en la terminal
- Espera unos segundos y recarga la página

### No veo datos
- Asegúrate de tener grupos en la base de datos
- Ejecuta primero `npm run verify` para verificar enlaces
- Verifica que el país seleccionado tenga grupos

### Los datos no se actualizan
- Haz clic en el botón "🔄 Actualizar"
- Recarga la página del navegador (F5)
- Verifica la consola del navegador para errores (F12)

## 📱 Acceso desde Otros Dispositivos

Si quieres acceder al dashboard desde tu teléfono o tablet en la misma red:

1. Encuentra la IP de tu computadora (ejecuta `ipconfig` en CMD)
2. En tu dispositivo móvil, abre el navegador
3. Ve a: `http://[TU_IP]:3000`
4. Ejemplo: `http://192.168.1.100:3000`

## 🎨 Características Visuales

- **Diseño responsive**: Funciona en móviles, tablets y computadoras
- **Actualización automática**: Los datos se refrescan cada 2 segundos
- **Colores intuitivos**:
  - Verde: Exitoso
  - Amarillo/Naranja: Pendiente o Requiere Aprobación
  - Rojo: Fallido
  - Morado: Acción principal

## 🔐 Seguridad

- El dashboard solo es accesible en tu red local
- No expone información sensible
- Los enlaces de grupos son visibles solo para ti
