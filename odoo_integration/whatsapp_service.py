# -*- coding: utf-8 -*-
"""
Servicio de WhatsApp para Odoo 18
Integración con API Node.js (whatsapp-web.js)

Copia este archivo en tu módulo de Odoo:
custom_addons/gemini_chatbot/services/whatsapp_service.py
"""

import requests
import logging

_logger = logging.getLogger(__name__)

class WhatsAppService:
    """Servicio para enviar mensajes de WhatsApp"""
    
    def __init__(self, api_url="http://localhost:3000"):
        self.api_url = api_url
    
    def check_status(self):
        """Verificar si el servicio de WhatsApp está disponible"""
        try:
            response = requests.get(f"{self.api_url}/status", timeout=5)
            data = response.json()
            return data.get('status') == 'ready'
        except Exception as e:
            _logger.error(f"Error al verificar estado de WhatsApp: {e}")
            return False
    
    def send_message(self, phone, message):
        """
        Enviar mensaje a un número
        
        Args:
            phone (str): Número de teléfono (formato: 5215512345678)
            message (str): Mensaje a enviar
            
        Returns:
            dict: Resultado del envío
        """
        try:
            payload = {
                "phone": phone,
                "message": message
            }
            response = requests.post(
                f"{self.api_url}/send-message",
                json=payload,
                timeout=30
            )
            result = response.json()
            
            if result.get('success'):
                _logger.info(f"Mensaje enviado a {phone}")
            else:
                _logger.error(f"Error enviando mensaje a {phone}: {result.get('error')}")
            
            return result
        except Exception as e:
            _logger.error(f"Excepción al enviar mensaje: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_bulk_messages(self, phones, message):
        """
        Enviar mensajes masivos
        
        Args:
            phones (list): Lista de números de teléfono
            message (str): Mensaje a enviar
            
        Returns:
            dict: Resultado del envío masivo
        """
        try:
            payload = {
                "phones": phones,
                "message": message
            }
            response = requests.post(
                f"{self.api_url}/send-bulk",
                json=payload,
                timeout=len(phones) * 10  # 10 segundos por número
            )
            result = response.json()
            
            _logger.info(
                f"Envío masivo completado: {result.get('successful')} exitosos, "
                f"{result.get('failed')} fallidos"
            )
            
            return result
        except Exception as e:
            _logger.error(f"Excepción al enviar mensajes masivos: {e}")
            return {
                'success': False,
                'error': str(e)
            }
