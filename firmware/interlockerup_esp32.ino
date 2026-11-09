// ==========================================================
// InterLockerUp — Firmware ESP32 (acceso QR/PIN + telemetría)
// Guardado para consulta. Origen: código proporcionado por el usuario.
// ==========================================================
#include <AppInsights.h>
#include <RMaker.h>
#include <RMakerDevice.h>
#include <RMakerNode.h>
#include <RMakerParam.h>
#include <RMakerQR.h>
#include <RMakerType.h>
#include <RMakerUtils.h>

#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <time.h>
#include <mbedtls/md.h>

// ==========================================
// 📶 CONFIGURACIÓN WIFI
// ==========================================
const char* ssid = "MEGACABLE-3BA2";
const char* password = "5BHx3yw2";

// ==========================================
// 🌐 BACKEND (SUBDOMINIO DIRECTO API)
// ==========================================
const char* serverUrl = "https://api.interlockerup.xyz/api/qr/validar";
const char* IOT_SECRET_KEY = "clave_secreta_default_segura";

// Identificadores numéricos reales de gestion.lockers (consultar PostgreSQL).
// Se deja 0 para evitar registrar telemetría en el locker equivocado.
const int LOCKER_ID_K01 = 1;
const int LOCKER_ID_K02 = 2;
const char* TELEMETRY_URL = "https://api.interlockerup.xyz/api/iot/telemetry";
const unsigned long INTERVALO_TELEMETRIA_MS = 60000UL;
unsigned long ultimaTelemetria = 0;


// ==========================================
// 📷 LECTOR QR (GM75)
// ==========================================
HardwareSerial lector(1);
String codigo = "";

// ==========================================
// 🔓 CERRADURAS (PINS)
// ==========================================
const int cerradura1 = 27; // Locker 01
const int cerradura2 = 26; // Locker 02

// ==========================================
// 🔴🟢 LEDS INDICADORES
// ==========================================
const int ledVerde = 25;
const int ledRojo = 33;

// ==========================================
// ⏳ CONTROL DE TIEMPOS
// ==========================================
unsigned long ultimoTiempo = 0;
const int tiempoEspera = 100; // Espera para fin de lectura QR
unsigned long ultimoCheck = 0;

// ==========================================
// 🔐 GENERAR NONCE ALEATORIO
// ==========================================
String generarNonce() {
  String nonce = "";

  for (int i = 0; i < 16; i++) {
    uint8_t valor = esp_random() & 0xFF;

    if (valor < 16) {
      nonce += "0";
    }

    nonce += String(valor, HEX);
  }

  return nonce;
}

// ==========================================
// 🔐 GENERAR FIRMA HMAC SHA256
// ==========================================
String generarHMAC(String mensaje) {

  unsigned char hmacResult[32];

  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);

  const mbedtls_md_info_t* mdInfo =
      mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);

  mbedtls_md_setup(&ctx, mdInfo, 1);

  mbedtls_md_hmac_starts(
      &ctx,
      (const unsigned char*)IOT_SECRET_KEY,
      strlen(IOT_SECRET_KEY)
  );

  mbedtls_md_hmac_update(
      &ctx,
      (const unsigned char*)mensaje.c_str(),
      mensaje.length()
  );

  mbedtls_md_hmac_finish(
      &ctx,
      hmacResult
  );

  mbedtls_md_free(&ctx);

  String resultado = "";

  for (int i = 0; i < 32; i++) {
    if (hmacResult[i] < 16) {
      resultado += "0";
    }

    resultado += String(hmacResult[i], HEX);
  }

  return resultado;
}

// ==========================================
// 🛠️ SETUP INITIALIZATION
// ==========================================
void setup() {
  Serial.begin(115200);

  // Inicializar lector QR (RX=4, TX=-1 ya que solo lee)
  lector.begin(9600, SERIAL_8N1, 4, -1);

  // Configuración de Pines
  pinMode(cerradura1, OUTPUT);
  pinMode(cerradura2, OUTPUT);
  pinMode(ledVerde, OUTPUT);
  pinMode(ledRojo, OUTPUT);

  // Estado inicial (Todo apagado)
  digitalWrite(cerradura1, LOW);
  digitalWrite(cerradura2, LOW);
  digitalWrite(ledVerde, LOW);
  digitalWrite(ledRojo, LOW);

  // Conexión WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConectado con éxito");
  //Sincronizar hora del ESP32
  configTime(
  0,
  0,
  "pool.ntp.org",
  "time.google.com"
);

Serial.print("Sincronizando hora");

time_t now = time(nullptr);

while (now < 100000) {
  delay(500);
  Serial.print(".");
  now = time(nullptr);
}

Serial.println();
Serial.println("Hora sincronizada");

Serial.print("Timestamp actual: ");
Serial.println((unsigned long)now);
  Serial.println("Sistema InterLockerUp listo para operar 🚀");
}

// ==========================================
// 🔄 BUCLE PRINCIPAL (LOOP)
// ==========================================
void loop() {

  // ----------------------------------------
  // 📷 1. LECTURA SERIAL DEL LECTOR QR
  // ----------------------------------------
  while (lector.available()) {
    char c = lector.read();
    codigo += c;
    ultimoTiempo = millis();
  }

  // Si terminó de leer el código QR (pasaron 100ms sin nuevos caracteres)
  if (codigo.length() > 0 && millis() - ultimoTiempo > tiempoEspera) {
    codigo.trim();

// Eliminar caracteres no imprimibles
String limpio = "";

for (int i = 0; i < codigo.length(); i++) {
  char c = codigo[i];

  if (isalnum(c)) {   // solo letras y números
    limpio += c;
  }
}

Serial.println("QR Detectado: " + limpio);

if (limpio.length() > 0) {
  validarConBackend(limpio);
}

codigo = "";
  }

  // Reporte de actividad al backend. No registra sensores inexistentes.
  if (millis() - ultimaTelemetria >= INTERVALO_TELEMETRIA_MS) {
    ultimaTelemetria = millis();
    reportarConectividad(LOCKER_ID_K01, "ESP32_K01");
    reportarConectividad(LOCKER_ID_K02, "ESP32_K02");
  }

  // ----------------------------------------
  // 🔥 2. CHECK REMOTO DE LOCKERS (CADA 5 SEG)
  // ----------------------------------------
  if (millis() - ultimoCheck > 5000) {
    checkRemoto();
    ultimoCheck = millis();
  }
}

// ==========================================
// 🟢 ACCESO CORRECTO (SEÑAL VISUAL)
// ==========================================
void accesoCorrecto() {
  digitalWrite(ledVerde, HIGH);
  digitalWrite(ledRojo, LOW);
  delay(1500);
  digitalWrite(ledVerde, LOW);
}

// ==========================================
// 🔴 ACCESO DENEGADO (SEÑAL VISUAL)
// ==========================================
void accesoDenegado() {
  digitalWrite(ledRojo, HIGH);
  digitalWrite(ledVerde, LOW);
  delay(1500);
  digitalWrite(ledRojo, LOW);
}

// ==========================================
// 🌐 VALIDAR QR EN BACKEND (POST)
// ==========================================
void validarConBackend(String codigoQR) {

  

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Error: Sin conexión WiFi.");
    accesoDenegado();
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Ignorar validación estricta de certificado SSL
  client.setTimeout(4); // Tiempo de espera máximo a nivel socket (segundos)

  HTTPClient http;
  http.setTimeout(4000); // Timeout de la petición HTTP (4000ms)
  http.begin(client, serverUrl);
  
  // Headers obligatorios
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json"); 

  String body = "{\"codigo\":\"" + codigoQR + "\"}";

  int httpResponseCode = http.POST(body);

  if (httpResponseCode > 0) {
    if (httpResponseCode == HTTP_CODE_OK) {
      String response = http.getString();
      Serial.println("Respuesta QR Recibida:");
      Serial.println(response);

      StaticJsonDocument<256> doc;
      if (deserializeJson(doc, response)) {
        Serial.println("Error al procesar JSON de respuesta QR");
        accesoDenegado();
      } else {
        bool acceso = doc["acceso"];
        String locker = doc["locker"] | "";

        if (acceso) {
          Serial.println("Acceso Permitido -> Locker asignado: " + locker);
          accesoCorrecto();   
          manejarLocker(locker);
        } else {
          Serial.println("Acceso Denegado por el Backend");
          accesoDenegado();   
        }
      }
    } else {
      Serial.print("Servidor denegó la petición. Código HTTP: ");
      Serial.println(httpResponseCode);
      accesoDenegado();
    }
  } else {
    Serial.print("Error de conexión en QR: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
    accesoDenegado();
  }

  http.end();
  client.stop(); // Forzar la destrucción del socket seguro para liberar memoria
}

// ==========================================
// 🔥 CONTROL DE MONITOREO REMOTO POR TURNOS
// ==========================================
void checkRemoto() {
  static bool alternarLocker = false;
  
  // Alternamos entre casilleros cada 5 segundos para balancear la carga HTTPS
  if (!alternarLocker) {
    revisarLocker("K-01", cerradura1);
  } else {
    revisarLocker("K-02", cerradura2);
  }
  
  alternarLocker = !alternarLocker; 
}

// ==========================================
// 🔍 CONSULTAR ESTADO DE UN LOCKER (GET)
// ==========================================
void revisarLocker(String lockerId, int pin) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado. Omitiendo escaneo remoto.");
    return;
  }

  // 1. Generar nonce diferente para esta petición
  String nonce = generarNonce();

  // 2. Obtener timestamp actual
  unsigned long timestamp = (unsigned long)time(nullptr);
  String timestampStr = String(timestamp);

  // 3. Construir exactamente lo que firma el backend:
  // timestamp:nonce
  String payload = timestampStr + ":" + nonce;

  // 4. Generar firma HMAC-SHA256
  String signature = generarHMAC(payload);

  // 5. Mostrar datos para comprobarlos
  Serial.println();
  Serial.print("Locker: ");
  Serial.println(lockerId);

  Serial.print("Nonce: ");
  Serial.println(nonce);

  Serial.print("Timestamp: ");
  Serial.println(timestampStr);

  Serial.print("Payload firmado: ");
  Serial.println(payload);

  Serial.print("Firma HMAC: ");
  Serial.println(signature);

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(4);

  HTTPClient http;

  // POR AHORA no agregamos los parámetros de seguridad a la URL.
String url =
    "https://api.interlockerup.xyz/api/access/iot/pending"
    "?locker=" + lockerId +
    "&timestamp=" + timestampStr +
    "&nonce=" + nonce +
    "&signature=" + signature;
    
  http.setTimeout(4000);
  http.begin(client, url);
  http.addHeader("Accept", "application/json");

  int httpCode = http.GET();

  if (httpCode > 0) {

    if (httpCode == HTTP_CODE_OK) {

      String response = http.getString();

      Serial.println(
        "Estado remoto [" + lockerId + "]: " + response
      );

      StaticJsonDocument<256> doc;

      if (deserializeJson(doc, response)) {
        Serial.println("Error parseando JSON en Check Remoto");
      } else {

        bool abrir = doc["abrir"];

        if (abrir) {
          Serial.println(
            "Comando Recibido: ABRIENDO LOCKER " + lockerId
          );

          accesoCorrecto();
          abrirCerradura(pin);
        }
      }

    } else {

      Serial.print("Error en backend para ");
      Serial.print(lockerId);
      Serial.print(". HTTP Code: ");
      Serial.println(httpCode);
    }

  } else {

    Serial.print("Error de conexión en Locker ");
    Serial.print(lockerId);
    Serial.print(": ");

    Serial.println(
      http.errorToString(httpCode).c_str()
    );
  }

  http.end();
  client.stop();
}

// ==========================================
// 🔓 DISPARADOR FÍSICO DESDE QR
// ==========================================
void manejarLocker(String locker) {

  if (locker == "K-01") {
    Serial.println("Activando relé de Locker 1");
    abrirCerradura(cerradura1);
  }
  else if (locker == "K-02") {
    Serial.println("Activando relé de Locker 2");
    abrirCerradura(cerradura2);
  }
  else {
    Serial.println("Alerta: Locker devuelto no está registrado en el firmware");
    accesoDenegado(); 
  }
}

// ==========================================
// 🔧 pulso eléctrico para la cerradura
// ==========================================
void abrirCerradura(int pin) {
  digitalWrite(pin, HIGH);
  delay(3000); // 3 segundos de apertura física
  digitalWrite(pin, LOW);
}

// ==========================================
// CONECTIVIDAD IoT: heartbeat autenticado
// ==========================================
void reportarConectividad(int lockerId, const char* deviceId) {
  if (lockerId <= 0) {
    Serial.printf("Sin enviar telemetria %s: configura su ID real.\n", deviceId);
    return;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("Sin WiFi; telemetria pendiente para %s\n", deviceId);
    return;
  }

  // El middleware iotAntiReplay exige timestamp, nonce y signature.
  String timestamp = String((unsigned long)time(nullptr));
  String nonce = generarNonce();
  String firma = generarHMAC(timestamp + ":" + nonce);

  StaticJsonDocument<256> doc;
  doc["locker_id"] = lockerId;
  doc["device_id"] = deviceId;
  doc.createNestedArray("sensors");  // No hay sensores físicos.
  doc["firmware"] = "1.1.0";
  doc["timestamp"] = timestamp;
  doc["nonce"] = nonce;
  doc["signature"] = firma;

  String body;
  serializeJson(doc, body);

  WiFiClientSecure client;
  // Compatibilidad con firmware original: en producción, validar CA TLS.
  client.setInsecure();
  client.setTimeout(4);
  HTTPClient http;
  http.setTimeout(4000);
  if (!http.begin(client, TELEMETRY_URL)) {
    Serial.printf("No se pudo iniciar HTTPS para %s\n", deviceId);
    return;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  int status = http.POST(body);
  if (status == 201) {
    Serial.printf("Telemetria registrada: %s (locker_id=%d)\n", deviceId, lockerId);
  } else {
    Serial.printf("Fallo telemetria %s: HTTP %d. %s\n",
                  deviceId, status,
                  status > 0 ? http.getString().c_str() : http.errorToString(status).c_str());
  }
  http.end();
  client.stop();
}
