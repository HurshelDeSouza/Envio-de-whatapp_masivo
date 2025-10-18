# 📋 Instrucciones para Configurar Google Sheets API

## Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a: https://console.cloud.google.com/
2. Haz clic en "Seleccionar proyecto" → "Nuevo proyecto"
3. Nombre del proyecto: `WhatsApp-Group-Joiner` (o el que prefieras)
4. Haz clic en "Crear"

## Paso 2: Habilitar Google Sheets API

1. En el menú lateral, ve a: **APIs y servicios** → **Biblioteca**
2. Busca: `Google Sheets API`
3. Haz clic en el resultado
4. Haz clic en **"HABILITAR"**

## Paso 3: Crear API Key

1. En el menú lateral, ve a: **APIs y servicios** → **Credenciales**
2. Haz clic en **"+ CREAR CREDENCIALES"**
3. Selecciona **"Clave de API"**
4. Se creará tu API Key
5. **COPIA LA API KEY** (la necesitarás en el siguiente paso)

### Opcional: Restringir la API Key (Recomendado)

1. Haz clic en **"RESTRINGIR CLAVE"**
2. En "Restricciones de API":
   - Selecciona **"Restringir clave"**
   - Marca solo: **Google Sheets API**
3. Haz clic en **"GUARDAR"**

## Paso 4: Hacer la Hoja de Cálculo Pública (Importante)

1. Abre tu hoja de Google Sheets: 
   https://docs.google.com/spreadsheets/d/1nJxD4B2ht9VsuGowai8Vqk869J5dLRz_r2FFF8UV8fw/edit

2. Haz clic en **"Compartir"** (botón verde arriba a la derecha)

3. En "Acceso general":
   - Cambia de "Restringido" a **"Cualquier persona con el enlace"**
   - Permisos: **"Lector"** (solo lectura)

4. Haz clic en **"Listo"**

## Paso 5: Configurar el Proyecto

1. Crea un archivo `.env` en la raíz del proyecto (copia de `.env.example`):

```bash
copy .env.example .env
```

2. Abre el archivo `.env` y pega tu API Key:

```
GOOGLE_API_KEY=TU_API_KEY_AQUI
WHATSAPP_NUMBER=+12694507166
```

## Paso 6: Ejecutar el Script

```bash
node join-groups.js
```

## ⚠️ Solución de Problemas

### Error: "The caller does not have permission"
- Asegúrate de que la hoja de cálculo sea pública (Paso 4)
- Verifica que Google Sheets API esté habilitada (Paso 2)

### Error: "API key not valid"
- Verifica que copiaste correctamente la API Key
- Asegúrate de que la API Key tenga acceso a Google Sheets API

### Error: "GOOGLE_API_KEY no está configurada"
- Verifica que el archivo `.env` exista en la raíz del proyecto
- Verifica que la variable esté correctamente escrita (sin espacios)

## 📊 Archivos Creados

- `config/groups-config.json` - Configuración de grupos
- `config/joined-groups.json` - Historial de grupos unidos (se crea automáticamente)
- `.env` - Variables de entorno (debes crearlo tú)

## 🔒 Seguridad

- **NUNCA** compartas tu API Key públicamente
- **NUNCA** subas el archivo `.env` a GitHub
- El archivo `.gitignore` ya está configurado para ignorar `.env`
