# Integración WhatsApp con Odoo 18

## Arquitectura

```
┌─────────────────┐         HTTP REST API        ┌──────────────────┐
│                 │ ◄──────────────────────────► │                  │
│   Odoo 18       │   http://localhost:3000      │  Node.js API     │
│   (Python)      │                              │  (whatsapp-web)  │
│                 │                              │                  │
└─────────────────┘                              └──────────────────┘
                                                           │
                                                           │ QR Auth
                                                           ▼
                                                  ┌──────────────────┐
                                                  │   WhatsApp Web   │
                                                  └──────────────────┘
```

## Instalación

### 1. Configurar API Node.js

En la carpeta del proyecto Node.js:

```bash
npm install
npm run api
```

Escanea el QR que aparece con tu WhatsApp.

### 2. Copiar archivos a Odoo

Copia estos archivos a tu módulo de Odoo:

```
custom_addons/gemini_chatbot/
├── services/
│   └── whatsapp_service.py      ← Copiar aquí
└── models/
    └── (tus modelos existentes)  ← Agregar código de ejemplo
```

### 3. Agregar dependencia en __manifest__.py

```python
{
    'name': 'Gemini Chatbot',
    'depends': ['base', 'sale', 'contacts'],
    'external_dependencies': {
        'python': ['requests'],
    },
    ...
}
```

### 4. Instalar requests en el contenedor Docker

```bash
docker exec -it <nombre_contenedor_odoo> pip install requests
```

## Uso en Odoo

### Enviar mensaje individual

```python
from .services.whatsapp_service import WhatsAppService

whatsapp = WhatsAppService()

# Verificar estado
if whatsapp.check_status():
    # Enviar mensaje
    result = whatsapp.send_message(
        phone="5215512345678",
        message="Hola desde Odoo!"
    )
    print(result)
```

### Enviar mensajes masivos

```python
whatsapp = WhatsAppService()

phones = ["5215512345678", "5353065305", "573173137236"]
message = "Mensaje masivo desde Odoo"

result = whatsapp.send_bulk_messages(phones, message)
print(f"Exitosos: {result['successful']}")
print(f"Fallidos: {result['failed']}")
```

### Desde un botón en Odoo

```xml
<!-- En tu vista form -->
<button name="action_send_whatsapp" 
        string="Enviar WhatsApp" 
        type="object" 
        class="btn-primary"/>
```

```python
# En tu modelo
def action_send_whatsapp(self):
    whatsapp = WhatsAppService()
    result = whatsapp.send_message(
        phone=self.partner_id.mobile,
        message="Tu mensaje aquí"
    )
    if result.get('success'):
        self.message_post(body="WhatsApp enviado")
```

## Endpoints de la API

### GET /status
Verificar estado del servicio

**Respuesta:**
```json
{
  "status": "ready",
  "message": "WhatsApp conectado"
}
```

### POST /send-message
Enviar mensaje individual

**Request:**
```json
{
  "phone": "5215512345678",
  "message": "Hola!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mensaje enviado correctamente",
  "phone": "5215512345678"
}
```

### POST /send-bulk
Enviar mensajes masivos

**Request:**
```json
{
  "phones": ["5215512345678", "5353065305"],
  "message": "Mensaje masivo"
}
```

**Response:**
```json
{
  "success": true,
  "total": 2,
  "successful": 2,
  "failed": 0,
  "details": {
    "successful": ["5215512345678", "5353065305"],
    "failed": []
  }
}
```

## Configuración en Docker

Si Odoo corre en Docker, asegúrate de que pueda acceder a localhost:3000

**Opción 1:** Usar host.docker.internal
```python
whatsapp = WhatsAppService(api_url="http://host.docker.internal:3000")
```

**Opción 2:** Usar la IP de tu máquina
```python
whatsapp = WhatsAppService(api_url="http://192.168.1.X:3000")
```

## Troubleshooting

### Error: Connection refused
- Verifica que la API esté corriendo: `npm run api`
- Verifica que esté en el puerto 3000
- Si usas Docker, usa `host.docker.internal` en lugar de `localhost`

### Error: WhatsApp no está conectado
- Escanea el QR en la terminal donde corre `npm run api`
- La sesión se guarda, solo necesitas escanear una vez

### Error: requests module not found
```bash
docker exec -it <contenedor> pip install requests
```

## Ventajas de esta arquitectura

✓ Separación de responsabilidades
✓ Odoo no maneja Puppeteer (pesado)
✓ Fácil de escalar
✓ Puedes usar la API desde otros servicios
✓ No requiere API oficial de WhatsApp (gratis)
