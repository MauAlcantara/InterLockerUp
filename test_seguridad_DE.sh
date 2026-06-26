#!/bin/bash
# ============================================================
# Script de Pruebas de Seguridad - InterLockerUp (Criterio DE)
# Ejecutar con: bash test_seguridad_DE.sh
# Requiere: curl, jq, openssl
# ============================================================

BASE_URL="http://localhost:3001/api"

# ── Credenciales reales ──────────────────────────────────────
MATRICULA="2023371006"
EMAIL="2023371006@uteq.edu.mx"
PASSWORD="Kyouno.20"
DEVICE_ID="554faacd-0871-42dc-9f30-3e6c3bdfd676"

# ── Clave IoT (debe coincidir con IOT_SECRET_KEY en .env) ───
IOT_SECRET="clave_secreta_default_segura"

echo "============================================================"
echo "🧪  PRUEBAS DE SEGURIDAD - INTERLOCKERUP  (Criterio DE)"
echo "============================================================"

# ────────────────────────────────────────────────────────────
echo -e "\n📡 0. Obtener Clave Pública RSA"
curl -s -X GET "$BASE_URL/auth/public-key" | jq .

# ────────────────────────────────────────────────────────────
echo -e "\n🔐 LOGIN — obteniendo token JWT real..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"matricula\": \"$MATRICULA\",
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"deviceId\": \"$DEVICE_ID\"
  }")

echo "$LOGIN_RESP" | jq .
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "⚠️  No se obtuvo token. Usando token de respaldo (puede estar expirado)."
  TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Niwicm9sIjoiYWx1bW5vIiwiaWF0IjoxNzgxNDk2NzY1LCJleHAiOjE3ODE1MjU1NjV9.XwpWcsFJZzToKi5ghhhA_2Txhib-KSfhnzEGkLBOUTQ"
else
  echo "✅ Token obtenido correctamente."
fi

# ════════════════════════════════════════════════════════════
echo -e "\n\n════════════════════════════════════════════════════════════"
echo "🔹 PRUEBA 1: RATE LIMITING (Fuerza Bruta)"
echo "════════════════════════════════════════════════════════════"
echo "Enviando 6 intentos de login inválidos..."
for i in {1..6}; do
  RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"matricula":"INVALIDO","password":"INVALIDA"}')
  echo "  Intento $i → HTTP $RESP"
done
echo "⬆️  El intento 6 debe devolver 429. Si no, el rate limit aún no se activa (límite puede ser mayor)."

# ════════════════════════════════════════════════════════════
echo -e "\n\n════════════════════════════════════════════════════════════"
echo "🔹 PRUEBA 2: VALIDACIÓN DE ENTRADAS"
echo "════════════════════════════════════════════════════════════"

echo -e "\n2.1 Login con campos vacíos (esperado: 400)"
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"matricula":"","password":""}' | jq .

echo -e "\n2.2 Remote-unlock con PIN muy corto (esperado: 400)"
curl -s -X POST "$BASE_URL/access/remote-unlock" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pin_ingresado":"12"}' | jq .

echo -e "\n2.3 Remote-unlock con PIN válido para referencia"
curl -s -X POST "$BASE_URL/access/remote-unlock" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pin_ingresado":"1234"}' | jq .

# ════════════════════════════════════════════════════════════
echo -e "\n\n════════════════════════════════════════════════════════════"
echo "🔹 PRUEBA 3: PROTECCIÓN ANTI-REPLAY IoT"
echo "════════════════════════════════════════════════════════════"

echo -e "\n3.1 Sin parámetros IoT (esperado: 400 - faltan parámetros)"
curl -s -X GET "$BASE_URL/access/iot/pending?locker=K-01" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n3.2 Timestamp expirado (esperado: 403)"
curl -s -X GET "$BASE_URL/access/iot/pending?locker=K-01&timestamp=1000000000000&nonce=test123&signature=abc" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n3.3 Firma HMAC inválida (esperado: 403)"
TIMESTAMP=$(date +%s%3N)
NONCE="nonce_$(date +%s)"
curl -s -X GET "$BASE_URL/access/iot/pending?locker=K-01&timestamp=${TIMESTAMP}&nonce=${NONCE}&signature=firma_incorrecta_xyz" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n3.4 Nonce duplicado / Anti-Replay (esperado: 2da llamada devuelve 403)"
TIMESTAMP=$(date +%s%3N)
NONCE="nonce_unique_$(date +%s)"
SIGNATURE=$(echo -n "${TIMESTAMP}:${NONCE}" | openssl dgst -sha256 -hmac "$IOT_SECRET" | awk '{print $2}')

echo "  → Primera llamada (esperado: éxito o 401 por token):"
curl -s -X GET "$BASE_URL/access/iot/pending?locker=K-01&timestamp=${TIMESTAMP}&nonce=${NONCE}&signature=${SIGNATURE}" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo "  → Segunda llamada con mismo nonce (esperado: 403 nonce duplicado):"
curl -s -X GET "$BASE_URL/access/iot/pending?locker=K-01&timestamp=${TIMESTAMP}&nonce=${NONCE}&signature=${SIGNATURE}" \
  -H "Authorization: Bearer $TOKEN" | jq .

# ════════════════════════════════════════════════════════════
echo -e "\n\n════════════════════════════════════════════════════════════"
echo "🔹 PRUEBA 4: DOCUMENTACIÓN AUTOMÁTICA"
echo "════════════════════════════════════════════════════════════"
if [ -f "/root/InterLockerUp/SEGURIDAD_IMPLEMENTADA.txt" ]; then
  echo "✅ Archivo SEGURIDAD_IMPLEMENTADA.txt existe:"
  ls -lh /root/InterLockerUp/SEGURIDAD_IMPLEMENTADA.txt
  echo -e "\nContenido:"
  cat /root/InterLockerUp/SEGURIDAD_IMPLEMENTADA.txt
else
  echo "⚠️  Archivo no encontrado. Reinicia el servidor para generarlo:"
  echo "   pm2 restart interlocker-backend && pm2 logs interlocker-backend --lines 30"
fi

# ════════════════════════════════════════════════════════════
echo -e "\n\n============================================================"
echo "✅ PRUEBAS FINALIZADAS"
echo "============================================================"
echo "Para guardar evidencia completa ejecuta:"
echo "  bash test_seguridad_DE.sh 2>&1 | tee evidencia_DE.txt"
echo "============================================================"
