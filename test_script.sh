#!/bin/bash
# Script de pruebas manuales para InterLockerUp
# Ejecutar con: bash test_script.sh
# Requiere: curl, jq

BASE_URL="http://localhost:3000/api"

echo "=========================================="
echo "🧪 PRUEBAS DE SEGURIDAD - INTERLOCKERUP"
echo "=========================================="

echo -e "\n📡 1. Obtener Clave Pública RSA (Cifrado Híbrido)"
curl -s -X GET "$BASE_URL/auth/public-key" | jq .

echo -e "\n🔐 2. Inicio de Sesión (Login con Cifrado)"
# Reemplaza con credenciales reales o usa el endpoint de prueba
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "TU_MATRICULA",
    "email": "tu_correo@uteq.edu.mx",
    "password": "tu_contraseña",
    "deviceId": "fingerprint_unico_del_dispositivo"
  }' | jq .

echo -e "\n📧 3. Verificación OTP (Doble Factor de Autenticación)"
curl -s -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "TU_MATRICULA",
    "otp": "123456"
  }' | jq .

echo -e "\n🔑 4. Solicitar PIN Remoto (Rate Limiting & Validación)"
curl -s -X POST "$BASE_URL/access/request-pin" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_JWT_TOKEN" | jq .

echo -e "\n🚪 5. Abrir Locker Remoto (Validación PIN & Anti-Replay)"
curl -s -X POST "$BASE_URL/access/remote-unlock" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -d '{
    "pin_ingresado": "654321"
  }' | jq .

echo -e "\n📡 6. Verificar Comandos IoT Pendientes (Anti-Replay & Timestamp)"
curl -s -X GET "$BASE_URL/access/iot/pending?locker=LOCKER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_JWT_TOKEN" | jq .

echo -e "\n=========================================="
echo "✅ Pruebas Finalizadas. Revisa los códigos de estado HTTP."
echo "=========================================="
