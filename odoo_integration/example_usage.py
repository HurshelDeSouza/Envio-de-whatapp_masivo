# -*- coding: utf-8 -*-
"""
Ejemplo de uso en un modelo de Odoo

Copia este código en tus modelos de Odoo donde necesites enviar WhatsApp
"""

from odoo import models, fields, api
from .services.whatsapp_service import WhatsAppService

class ResPartner(models.Model):
    _inherit = 'res.partner'
    
    def send_whatsapp_message(self, message):
        """Enviar mensaje de WhatsApp a este contacto"""
        whatsapp = WhatsAppService()
        
        # Verificar que el servicio esté disponible
        if not whatsapp.check_status():
            raise UserError('El servicio de WhatsApp no está disponible')
        
        # Obtener el teléfono del contacto
        if not self.mobile:
            raise UserError('El contacto no tiene número de teléfono móvil')
        
        # Formatear número (quitar espacios, guiones, etc.)
        phone = self.mobile.replace(' ', '').replace('-', '').replace('+', '')
        
        # Enviar mensaje
        result = whatsapp.send_message(phone, message)
        
        if result.get('success'):
            # Registrar en el chatter
            self.message_post(
                body=f"Mensaje de WhatsApp enviado: {message}",
                subject="WhatsApp"
            )
            return True
        else:
            raise UserError(f"Error al enviar WhatsApp: {result.get('error')}")
    
    def action_send_whatsapp(self):
        """Acción para enviar WhatsApp desde un botón"""
        return {
            'type': 'ir.actions.act_window',
            'name': 'Enviar WhatsApp',
            'res_model': 'whatsapp.message.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_partner_id': self.id,
            }
        }


class WhatsAppMessageWizard(models.TransientModel):
    _name = 'whatsapp.message.wizard'
    _description = 'Asistente para enviar mensajes de WhatsApp'
    
    partner_id = fields.Many2one('res.partner', string='Contacto', required=True)
    message = fields.Text(string='Mensaje', required=True)
    
    def action_send(self):
        """Enviar el mensaje"""
        self.partner_id.send_whatsapp_message(self.message)
        return {'type': 'ir.actions.act_window_close'}


class SaleOrder(models.Model):
    _inherit = 'sale.order'
    
    def action_send_order_whatsapp(self):
        """Enviar orden de venta por WhatsApp"""
        whatsapp = WhatsAppService()
        
        if not whatsapp.check_status():
            raise UserError('El servicio de WhatsApp no está disponible')
        
        # Construir mensaje
        message = f"""
Hola {self.partner_id.name},

Tu orden de venta {self.name} ha sido confirmada.

Total: ${self.amount_total}

Gracias por tu compra!
        """.strip()
        
        # Obtener teléfono
        phone = self.partner_id.mobile.replace(' ', '').replace('-', '').replace('+', '')
        
        # Enviar
        result = whatsapp.send_message(phone, message)
        
        if result.get('success'):
            self.message_post(
                body="Orden enviada por WhatsApp",
                subject="WhatsApp"
            )
