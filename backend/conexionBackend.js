#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// WIFI
const char* ssid = "INFINITUM9426";
const char* password = "T42sksNCxy";

// BACKEND QR
const char* serverUrl = "https://vigilia.world/api/qr/validar";

// LECTOR QR (GM75)
HardwareSerial lector(1);
String codigo = "";

// 🔓 CERRADURAS
const int cerradura1 = 27; // locker 01
const int cerradura2 = 26; // locker 02

// 🔴🟢 LEDS
const int ledVerde = 25;
const int ledRojo = 33;

// CONTROL QR
unsigned long ultimoTiempo = 0;
const int tiempoEspera = 100;

// CONTROL REMOTO
unsigned long ultimoCheck = 0;

void setup() {
  Serial.begin(115200);

  lector.begin(9600, SERIAL_8N1, 4, -1);

  pinMode(cerradura1, OUTPUT);
  pinMode(cerradura2, OUTPUT);

  pinMode(ledVerde, OUTPUT);
  pinMode(ledRojo, OUTPUT);

  digitalWrite(cerradura1, LOW);
  digitalWrite(cerradura2, LOW);
  digitalWrite(ledVerde, LOW);
  digitalWrite(ledRojo, LOW);

  // WIFI
  WiFi.begin(ssid, password);
  Serial.print("Conectando WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConectado");
  Serial.println("Sistema listo");
}

void loop() {

  // =========================
  // 📷 LECTURA QR
  // =========================
  while (lector.available()) {
    char c = lector.read();
    codigo += c;
    ultimoTiempo = millis();
  }

  if (codigo.length() > 0 && millis() - ultimoTiempo > tiempoEspera) {
    codigo.trim();
    Serial.println("QR: " + codigo);
    validarConBackend(codigo);
    codigo = "";
  }

  // =========================
  // 🔥 CHECK REMOTO (PIN)
  // =========================
  if (millis() - ultimoCheck > 5000) {
    checkRemoto();
    ultimoCheck = millis();
  }
}


// =========================
// 🟢 ACCESO CORRECTO
// =========================
void accesoCorrecto() {
  digitalWrite(ledVerde, HIGH);
  digitalWrite(ledRojo, LOW);
  delay(1500);
  digitalWrite(ledVerde, LOW);
}


// =========================
// 🔴 ACCESO DENEGADO
// =========================
void accesoDenegado() {
  digitalWrite(ledRojo, HIGH);
  digitalWrite(ledVerde, LOW);
  delay(1500);
  digitalWrite(ledRojo, LOW);
}


// =========================
// 🌐 VALIDAR QR
// =========================
void validarConBackend(String codigoQR) {

  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"codigo\":\"" + codigoQR + "\"}";

  int httpResponseCode = http.POST(body);

  if (httpResponseCode > 0) {

    String response = http.getString();
    Serial.println("Respuesta QR:");
    Serial.println(response);

    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, response)) {
      Serial.println("Error JSON");
      http.end();
      return;
    }

    bool acceso = doc["acceso"];
    String locker = doc["locker"] | "";

    if (acceso) {
      Serial.println("Acceso permitido -> " + locker);
      accesoCorrecto();   // 🟢 LED
      manejarLocker(locker);
    } else {
      Serial.println("Acceso denegado");
      accesoDenegado();   // 🔴 LED
    }

  } else {
    Serial.print("Error HTTP QR: ");
    Serial.println(httpResponseCode);
    accesoDenegado();
  }

  http.end();
}


// =========================
// 🔥 CHECK PIN REMOTO
// =========================
void checkRemoto() {

  revisarLocker("K-01", cerradura1);
  revisarLocker("K-02", cerradura2);
}


// =========================
// 🔥 FUNCIÓN PARA CADA LOCKER
// =========================
void revisarLocker(String lockerId, int pin) {

  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;

  String url = "https://vigilia.world/api/access/iot/pending?locker=" + lockerId;
  http.begin(client, url);

  int httpCode = http.GET();

  if (httpCode > 0) {

    String response = http.getString();

    Serial.println("Locker " + lockerId + ":");
    Serial.println(response);

    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, response)) {
      Serial.println("Error JSON remoto");
      http.end();
      return;
    }

    bool abrir = doc["abrir"];

    if (abrir) {
      Serial.println("🔓 ABRIENDO LOCKER " + lockerId);
      accesoCorrecto();   // 🟢 LED
      abrirCerradura(pin);
    }

  } else {
    Serial.print("Error HTTP remoto: ");
    Serial.println(httpCode);
  }

  http.end();
}


// =========================
// 🔓 CONTROL LOCKERS QR
// =========================
void manejarLocker(String locker) {

  if (locker == "K-01") {
    Serial.println("Abriendo Locker 1");
    abrirCerradura(cerradura1);
  }

  else if (locker == "K-02") {
    Serial.println("Abriendo Locker 2");
    abrirCerradura(cerradura2);
  }

  else {
    Serial.println("Locker no reconocido");
    accesoDenegado(); // 🔴 LED
  }
}


// =========================
// 🔧 ACTIVAR CERRADURA
// =========================
void abrirCerradura(int pin) {
  digitalWrite(pin, HIGH);
  delay(3000);
  digitalWrite(pin, LOW);
}
