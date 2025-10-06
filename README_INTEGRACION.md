# Integración WhatsApp con Odoo 18

## 🎯 Qué tienes ahora

Una aplicación Node.js que funciona como **API REST** para enviar mensajes de WhatsApp, lista para integrarse con Odoo 18.

## 📦 Estructura del proyecto

```
whatsapp-sender/
├── api-server.js              ← API REST (nuevo)
├── index.js                   ← Versión standalone
├── Iniciar-API.bat            ← Ejecutable para iniciar API
├── test-api.py                ← Script de prueba Python
├── odoo_integration/
│   ├── README_ODOO.md         ← Documentación completa
│   ├── whatsapp_service.py    ← Servicio para Odoo
│   └── example_usage.py       ← Ejemplos de uso
└── src/                       ← Código fuente organizado
```

## 🚀 Pasos para integrar con Odoo

### 1. Iniciar la API de WhatsApp

```bash
# Opción A: Doble click
Iniciar-API.bat

# Opción B: Terminal
npm run api
```

Escanea el QR que aparece (solo la primera vez).

### 2. Probar la API desde Python

```bash
python test-api.py
```

Si funciona, verás mensajes enviados.

### 3. Copiar archivos a Odoo

Copia estos archivos a tu módulo `gemini_chatbot`:

```
custom_addons/gemini_chatbot/
├── services/
│   └── whatsapp_service.py    ← Copiar desde odoo_integration/
└── models/
    └── (agregar código de example_usage.py)
```

### 4. Instalar dependencias en Docker

```bash
docker exec -it <tu_contenedor_odoo> pip install requests
```

### 5. Usar en Odoo

```python
from .services.whatsapp_service import WhatsAppService

whatsapp = WhatsAppService()
result = whatsapp.send_message("5215512345678", "Hola desde Odoo!")
```

## 📡 Endpoints de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/status` | Verificar estado |
| POST | `/send-message` | Enviar mensaje individual |
| POST | `/send-bulk` | Enviar mensajes masivos |

## 🔧 Configuración Docker

Si Odoo corre en Docker, usa una de estas opciones:

**Opción 1:** host.docker.internal
```python
whatsapp = WhatsAppService(api_url="http://host.docker.internal:3000")
```

**Opción 2:** IP de tu máquina
```python
whatsapp = WhatsAppService(api_url="http://192.168.1.X:3000")
```

## ✅ Ventajas de esta solución

- ✓ **Gratis** - No usa API oficial de pago
- ✓ **Sin QR repetido** - Solo escaneas una vez
- ✓ **Separado de Odoo** - No afecta el rendimiento
- ✓ **Fácil de usar** - API REST simple
- ✓ **Escalable** - Puedes usarlo desde otros servicios
- ✓ **SOLID** - Código limpio y mantenible

## 📚 Documentación completa

Lee `odoo_integration/README_ODOO.md` para:
- Ejemplos completos de uso
- Integración con modelos de Odoo
- Crear botones en vistas
- Enviar desde Sale Orders, Contacts, etc.
- Troubleshooting

## 🧪 Probar antes de integrar

1. Inicia la API: `npm run api`
2. Ejecuta: `python test-api.py`
3. Verifica que los mensajes se envíen
4. Luego integra con Odoo

## ❓ Preguntas frecuentes

**¿Necesito la API oficial de WhatsApp?**
No, esta solución usa whatsapp-web.js (gratis).

**¿Funciona con Docker?**
Sí, solo ajusta la URL a `host.docker.internal:3000`.

**¿Cuántos mensajes puedo enviar?**
50-100 por día de forma segura.

**¿Se puede usar en producción?**
Sí, pero para volúmenes altos considera la API oficial.

## 🆘 Soporte

Si tienes problemas:
1. Verifica que la API esté corriendo
2. Verifica que el QR esté escaneado
3. Prueba con `test-api.py` primero
4. Revisa los logs en la terminal de la API
