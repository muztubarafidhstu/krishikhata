/*
  KrishiKhata SMS gateway — ESP32 + SIM800L (or SIM7600/A7670 in text mode)

  What it does, every few seconds:
    1. Asks the server for waiting SMS:   GET  https://<your-domain>/api/gateway/pending   (header X-Gateway-Key)
    2. Sends each one with AT commands through the SIM module.
    3. Reports the result:                POST https://<your-domain>/api/gateway/result  {"id":..,"ok":true|false}

  Wiring (SIM800L):
    SIM800L TXD -> ESP32 GPIO16 (RX2)
    SIM800L RXD -> ESP32 GPIO17 (TX2)
    SIM800L GND -> ESP32 GND  (common ground is required)
    SIM800L VCC -> separate 3.7–4.2 V supply that can give 2 A bursts (a Li-ion cell or a buck converter).
                   Do NOT power the SIM800L from the ESP32 3.3 V pin — it resets during sending.
    Optional: SIM800L RST -> GPIO4 (lets the ESP32 restart the module)

  Arduino IDE setup:
    Board: "ESP32 Dev Module" (esp32 board package by Espressif)
    Library: ArduinoJson (by Benoit Blanchon, version 7)
    Copy config.example.h to config.h and fill in WiFi name, password, domain and GATEWAY_KEY.

  Messages are plain English text (GSM 7-bit), up to 160 characters.
*/
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"

#define MODEM Serial2
const int MODEM_RX = 16, MODEM_TX = 17, MODEM_RST = 4;
const unsigned long POLL_MS = 5000;

String modemCmd(const String &cmd, unsigned long waitMs = 1000, const char *expect = "OK") {
  while (MODEM.available()) MODEM.read();
  MODEM.println(cmd);
  String resp; unsigned long t = millis();
  while (millis() - t < waitMs) {
    while (MODEM.available()) resp += (char)MODEM.read();
    if (expect && resp.indexOf(expect) >= 0) break;
    if (resp.indexOf("ERROR") >= 0) break;
    delay(10);
  }
  return resp;
}

bool modemReady() {
  for (int i = 0; i < 5; i++) { if (modemCmd("AT", 1000).indexOf("OK") >= 0) return true; delay(500); }
  return false;
}

bool modemInit() {
  pinMode(MODEM_RST, OUTPUT); digitalWrite(MODEM_RST, HIGH);
  MODEM.begin(9600, SERIAL_8N1, MODEM_RX, MODEM_TX);
  delay(3000);
  if (!modemReady()) { Serial.println("[modem] no answer — check wiring and power"); return false; }
  modemCmd("ATE0");               // no echo
  modemCmd("AT+CMGF=1");          // SMS text mode
  modemCmd("AT+CSCS=\"GSM\"");    // GSM character set
  String reg = modemCmd("AT+CREG?", 2000);
  Serial.println("[modem] network: " + reg);
  return true;
}

void modemReset() {
  digitalWrite(MODEM_RST, LOW); delay(300); digitalWrite(MODEM_RST, HIGH); delay(5000);
  modemInit();
}

// Remove characters the GSM 7-bit alphabet cannot carry.
String cleanText(const String &s) {
  String out;
  for (size_t i = 0; i < s.length(); i++) { char c = s[i]; if (c >= 32 && c < 127) out += c; }
  return out.substring(0, 160);
}

bool sendSms(const String &to, const String &text) {
  String r = modemCmd("AT+CMGS=\"" + to + "\"", 5000, ">");
  if (r.indexOf(">") < 0) { Serial.println("[sms] no prompt: " + r); MODEM.write(27); return false; }
  MODEM.print(cleanText(text));
  MODEM.write(26);  // Ctrl+Z sends
  String resp; unsigned long t = millis();
  while (millis() - t < 60000) {
    while (MODEM.available()) resp += (char)MODEM.read();
    if (resp.indexOf("+CMGS:") >= 0) return true;
    if (resp.indexOf("ERROR") >= 0) { Serial.println("[sms] error: " + resp); return false; }
    delay(50);
  }
  Serial.println("[sms] timeout");
  return false;
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("[wifi] connecting");
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) { delay(500); Serial.print("."); }
  Serial.println(WiFi.status() == WL_CONNECTED ? " ok " + WiFi.localIP().toString() : " failed");
}

void report(WiFiClientSecure &client, long id, bool ok) {
  HTTPClient http;
  http.begin(client, String("https://") + SERVER_HOST + "/api/gateway/result");
  http.addHeader("X-Gateway-Key", GATEWAY_KEY);
  http.addHeader("Content-Type", "application/json");
  http.POST(String("{\"id\":") + id + ",\"ok\":" + (ok ? "true" : "false") + "}");
  http.end();
}

void poll() {
  WiFiClientSecure client;
  client.setInsecure();  // The key header authenticates us. For extra safety, load your site's root certificate with client.setCACert().
  HTTPClient http;
  http.setTimeout(15000);
  if (!http.begin(client, String("https://") + SERVER_HOST + "/api/gateway/pending?limit=3")) return;
  http.addHeader("X-Gateway-Key", GATEWAY_KEY);
  int code = http.GET();
  if (code != 200) { Serial.printf("[http] pending -> %d\n", code); http.end(); return; }
  String body = http.getString();
  http.end();

  JsonDocument doc;
  if (deserializeJson(doc, body)) { Serial.println("[http] bad JSON"); return; }
  for (JsonObject m : doc.as<JsonArray>()) {
    long id = m["id"];
    String to = m["to"].as<String>(), text = m["text"].as<String>();
    Serial.printf("[sms] #%ld -> %s\n", id, to.c_str());
    bool ok = sendSms(to, text);
    if (!ok && !modemReady()) modemReset();
    report(client, id, ok);
    delay(1500);
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\nKrishiKhata SMS gateway");
  modemInit();
  ensureWifi();
}

unsigned long lastPoll = 0;
void loop() {
  ensureWifi();
  if (WiFi.status() == WL_CONNECTED && millis() - lastPoll > POLL_MS) { lastPoll = millis(); poll(); }
  delay(50);
}
