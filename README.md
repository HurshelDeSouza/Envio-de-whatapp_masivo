# WhatsApp Bulk Message Sender

Aplicación Node.js profesional para envío masivo de mensajes de WhatsApp con arquitectura SOLID.

## 🚀 Características

- ✅ Envío masivo de mensajes de WhatsApp
- ✅ Autenticación persistente (QR una sola vez)
- ✅ Delay aleatorio entre mensajes (2-5 segundos)
- ✅ Reporte detallado de éxitos y fallos
- ✅ Arquitectura basada en principios SOLID
- ✅ Código limpio y mantenible
- ✅ Links clickeables con previews
- ✅ Ejecutable con doble click

## 📁 Estructura del Proyecto

```
whatsapp-sender/
├── src/
│   ├── config/
│   │   └── AppConfig.js          # Configuración centralizada
│   ├── services/
│   │   ├── WhatsAppClient.js     # Cliente de WhatsApp
│   │   └── MessageSender.js      # Lógica de envío masivo
│   ├── utils/
│   │   ├── DataLoader.js         # Carga de datos
│   │   └── Logger.js             # Sistema de logging
│   └── App.js                    # Orquestador principal
├── index.js                      # Punto de entrada
├── numeros.example.json          # Ejemplo de configuración
├── Enviar-Mensajes.bat          # Ejecutable Windows
└── README.md
```

## 🛠️ Instalación

### Prerrequisitos
- Node.js 16+ instalado
- WhatsApp instalado en tu teléfono

### Pasos
1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/whatsapp-sender.git
cd whatsapp-sender
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura tus números y mensaje:
```bash
cp numeros.example.json numeros.json
```

4. Edita `numeros.json` con tus datos:
```json
{
  "mensaje": "Tu mensaje aquí",
  "numeros": [
    "5215512345678",
    "5353065305"
  ]
}
```

## 🚀 Uso

### Opción 1: Doble click (Windows)
Doble click en `Enviar-Mensajes.bat`

### Opción 2: Línea de comandos
```bash
npm start
```

### Primera vez
1. Ejecuta la aplicación
2. Escanea el código QR con tu WhatsApp
3. Los mensajes se enviarán automáticamente

### Siguientes usos
1. Edita `numeros.json` con nuevos números/mensaje
2. Ejecuta la aplicación
3. **No necesitas escanear el QR de nuevo**

## 📱 Formato de Números

Usa el formato internacional sin +, espacios ni guiones:

- **México**: `521` + 10 dígitos → `5215512345678`
- **Cuba**: `53` + 8 dígitos → `5353065305`
- **USA**: `1` + 10 dígitos → `19715100863`
- **Argentina**: `549` + código área + número
- **España**: `34` + 9 dígitos
- **Colombia**: `57` + 10 dígitos

## ⚠️ Límites Recomendados

Para evitar bloqueos de WhatsApp:

- **Cuenta nueva** (< 1 mes): 20-30 mensajes/día
- **Cuenta establecida** (3-6 meses): 50-100 mensajes/día
- **Cuenta antigua** (1+ año): 100-300 mensajes/día

## 🏗️ Arquitectura SOLID

El proyecto implementa los 5 principios SOLID:

- **S**ingle Responsibility: Cada clase tiene una única responsabilidad
- **O**pen/Closed: Abierto para extensión, cerrado para modificación
- **L**iskov Substitution: Las clases pueden ser sustituidas
- **I**nterface Segregation: Interfaces específicas
- **D**ependency Inversion: Dependencias de abstracciones

## 🔧 Tecnologías

- **Node.js** - Runtime de JavaScript
- **whatsapp-web.js** - Librería para WhatsApp Web
- **qrcode-terminal** - Generación de códigos QR
- **Puppeteer** - Control de navegador (incluido en whatsapp-web.js)

## 📝 Ejemplo de Mensaje

```json
{
  "mensaje": "🛒 Ofertas especiales de WALMART al 50%\n\nEmpieza a ahorrar en tus compras\n\nWhatsapp:\nhttps://chat.whatsapp.com/ejemplo\n\nTelegram:\nhttps://t.me/ejemplo",
  "numeros": [
    "5353065305",
    "19715100863"
  ]
}
```

## ⚠️ Advertencias Importantes

- **No envíes spam** - Respeta las políticas de WhatsApp
- **Obtén consentimiento** - Asegúrate de tener permiso de los destinatarios
- **Usa delays apropiados** - Ya incluidos en la aplicación (2-5 segundos)
- **Prueba primero** - Envía a pocos números antes del envío masivo
- **Respeta los límites** - WhatsApp puede bloquear cuentas por abuso

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas:

1. Revisa que Node.js esté instalado correctamente
2. Verifica el formato de los números
3. Asegúrate de que WhatsApp esté funcionando en tu teléfono
4. Revisa los logs en la consola

## 🔮 Roadmap

- [ ] Interfaz gráfica (GUI)
- [ ] Soporte para imágenes y archivos
- [ ] Integración con APIs de terceros
- [ ] Programación de envíos
- [ ] Estadísticas avanzadas
- [ ] Soporte para templates

---

**⭐ Si te gusta este proyecto, dale una estrella en GitHub!**