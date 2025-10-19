# 🔍 Verificador de Enlaces de Grupos de WhatsApp

## ¿Qué hace este sistema?

Este sistema verifica automáticamente los enlaces de grupos de WhatsApp y determina:

- ✅ **Enlaces que funcionan**: Se puede unir directamente sin aprobación
- ⚠️ **Requieren aprobación**: Necesitan autorización del administrador del grupo
- ❌ **Enlaces expirados**: Ya no son válidos
- ❌ **Enlaces inválidos**: Formato incorrecto

## 🚀 Cómo usar

### Opción 1: Usando el archivo .bat (Más fácil)

1. Haz doble clic en `Verificar-Enlaces.bat`
2. Escanea el código QR si es necesario (solo la primera vez)
3. Espera a que termine la verificación
4. Los resultados se guardarán automáticamente en la base de datos

### Opción 2: Usando la terminal

```bash
npm run verify
```

### Opción 3: Solo verificar sin actualizar base de datos

```bash
npm run verify-only
```

Este comando genera un archivo JSON con los resultados pero NO actualiza la base de datos.

## 📊 ¿Qué información obtengo?

El sistema te mostrará:

1. **Durante la verificación**:
   - Progreso actual (ej: [5/50])
   - Nombre del grupo
   - Estado del enlace
   - Número de miembros (si está disponible)

2. **Al finalizar**:
   - Total de enlaces que funcionan
   - Total que requieren aprobación
   - Total de enlaces expirados
   - Total de enlaces inválidos
   - Estadísticas actualizadas de la base de datos

## 🗄️ Base de Datos

Los resultados se guardan en la base de datos con los siguientes campos:

- `verified`: 1 si el enlace fue verificado
- `requires_approval`: 1 si requiere aprobación del admin, 0 si es unión directa
- `status`: 'pending', 'successful', o 'failed'

## 📋 Consultas útiles

Después de verificar, puedes consultar:

### Ver grupos que funcionan (unión directa)
```javascript
const dbService = new DatabaseService();
const workingGroups = dbService.getWorkingGroups('USA');
console.log(workingGroups);
```

### Ver grupos que requieren aprobación
```javascript
const dbService = new DatabaseService();
const approvalGroups = dbService.getGroupsRequiringApproval('USA');
console.log(approvalGroups);
```

## ⚙️ Configuración

El script verifica hasta 50 grupos por ejecución. Para cambiar este límite, edita el archivo `verify-and-update-db.js`:

```javascript
LIMIT 50  // Cambia este número
```

## 🔄 Proceso recomendado

1. **Primero**: Ejecuta la verificación con `npm run verify`
2. **Segundo**: Revisa los resultados en la base de datos
3. **Tercero**: Ejecuta el script de unión solo con grupos verificados que funcionan

## ⚠️ Notas importantes

- La verificación NO te une a los grupos, solo verifica si los enlaces funcionan
- Se recomienda verificar en lotes de 50 grupos para evitar bloqueos
- Espera 2 segundos entre cada verificación para no saturar WhatsApp
- Los grupos con más de 100 miembros generalmente requieren aprobación

## 🆘 Solución de problemas

### Error: "No hay grupos pendientes sin verificar"
- Todos tus grupos ya fueron verificados
- Agrega más grupos desde Google Sheets primero

### Error de autenticación
- Elimina la carpeta `.wwebjs_auth`
- Vuelve a ejecutar el script y escanea el QR

### El script se detiene
- Verifica tu conexión a internet
- Asegúrate de que WhatsApp Web esté funcionando
- Revisa que no tengas WhatsApp Web abierto en otro navegador
