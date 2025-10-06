"""
Script de prueba para la API de WhatsApp
Úsalo para probar desde Python (como lo harías en Odoo)
"""
import requests
import json

API_URL = "http://localhost:3000"

def check_status():
    """Verificar estado del servicio"""
    response = requests.get(f"{API_URL}/status")
    print("Estado:", response.json())
    return response.json()

def send_single_message(phone, message):
    """Enviar mensaje a un número"""
    data = {
        "phone": phone,
        "message": message
    }
    response = requests.post(f"{API_URL}/send-message", json=data)
    print("Respuesta:", response.json())
    return response.json()

def send_bulk_messages(phones, message):
    """Enviar mensajes masivos"""
    data = {
        "phones": phones,
        "message": message
    }
    response = requests.post(f"{API_URL}/send-bulk", json=data)
    print("Respuesta:", response.json())
    return response.json()

if __name__ == "__main__":
    print("=== Prueba de API de WhatsApp ===\n")
    
    # 1. Verificar estado
    print("1. Verificando estado del servicio...")
    status = check_status()
    print()
    
    if status.get('status') != 'ready':
        print("⚠️  El servicio no está listo. Asegúrate de:")
        print("   1. Ejecutar: npm run api")
        print("   2. Escanear el código QR")
        exit()
    
    # 2. Enviar mensaje individual
    print("2. Enviando mensaje individual...")
    send_single_message(
        phone="5353065305",
        message="Prueba desde Python - Mensaje individual"
    )
    print()
    
    # 3. Enviar mensajes masivos
    print("3. Enviando mensajes masivos...")
    send_bulk_messages(
        phones=["5353065305", "573173137236"],
        message="Prueba desde Python - Mensaje masivo"
    )
