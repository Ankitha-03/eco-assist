#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ==========================
// WIFI SETTINGS
// ==========================
const char* ssid = "Ankitha";
const char* password = "12341234";


const char* serverURL = "http://192.168.29.101:8000/ingest/telemetry";

// ==========================
// DHT11 SETUP
// ==========================
#define DHTPIN 33
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

// ==========================
// MQ135 SETUP
// ==========================
#define MQ135PIN 34


const char* deviceId = "123e4567-e89b-12d3-a456-426614174000";
String macAddress;

// ==========================
// SETUP
// ==========================
void setup() {

  Serial.begin(115200);

  // Start DHT
  dht.begin();

  // Get ESP32 MAC Address
  macAddress = WiFi.macAddress();

  // ==========================
  // CONNECT TO WIFI
  // ==========================
  WiFi.begin(ssid, password);

  Serial.println();
  Serial.print("Connecting to WiFi");

  int retryCount = 0;

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);
    Serial.print(".");

    retryCount++;

    if (retryCount > 30) {
      Serial.println("\nWiFi Connection Failed!");
      ESP.restart();
    }
  }

  Serial.println("\n==========================");
  Serial.println("WiFi Connected Successfully!");
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP());

  Serial.print("ESP32 MAC Address: ");
  Serial.println(macAddress);

  Serial.println("==========================");
}

// ==========================
// LOOP
// ==========================
void loop() {

  // ==========================
  // CHECK WIFI CONNECTION
  // ==========================
  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("WiFi disconnected!");
    WiFi.reconnect();

    delay(5000);
    return;
  }

  // ==========================
  // READ DHT11
  // ==========================
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  // Check sensor read
  if (isnan(humidity) || isnan(temperature)) {

    Serial.println("DHT11 reading failed!");
    delay(2000);
    return;
  }

  // ==========================
  // READ MQ135
  // ==========================
  int mq135Raw = analogRead(MQ135PIN);

  // Convert raw value
  float vocLevel = map(mq135Raw, 0, 4095, 0, 1000);
  float ammoniaLevel = map(mq135Raw, 0, 4095, 0, 500);

  // ==========================
  // PRINT SENSOR VALUES
  // ==========================
  Serial.println("\n========== SENSOR DATA ==========");

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");

  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");

  Serial.print("MQ135 Raw: ");
  Serial.println(mq135Raw);

  Serial.print("VOC Level: ");
  Serial.print(vocLevel);
  Serial.println(" ppm");

  Serial.print("Ammonia Level: ");
  Serial.print(ammoniaLevel);
  Serial.println(" ppm");

  Serial.println("=================================");

  // ==========================
  // SEND DATA TO SERVER
  // ==========================
  HTTPClient http;

  Serial.println("Connecting to backend...");

  http.begin(serverURL);

  // Timeout
  http.setTimeout(10000);

  // Header
  http.addHeader("Content-Type", "application/json");

  // ==========================
  // CREATE JSON
  // ==========================
  StaticJsonDocument<256> doc;

  doc["device_id"] = deviceId;
  doc["mac_address"] = macAddress;

  doc["temperature"] = temperature;
  doc["humidity"] = humidity;

  doc["pressure"] = 1013.0;

  doc["voc_level"] = vocLevel;
  doc["ammonia_level"] = ammoniaLevel;

  String jsonString;

  serializeJson(doc, jsonString);

  // Print JSON
  Serial.println("Sending JSON:");
  Serial.println(jsonString);

  // ==========================
  // SEND HTTP POST
  // ==========================
  int httpResponseCode = http.POST(jsonString);

  // ==========================
  // HANDLE RESPONSE
  // ==========================
  if (httpResponseCode > 0) {

    String response = http.getString();

    Serial.println("\n===== SERVER RESPONSE =====");

    Serial.print("HTTP Response Code: ");
    Serial.println(httpResponseCode);

    Serial.print("Response: ");
    Serial.println(response);

    Serial.println("===========================");

  } else {

    Serial.println("\n===== HTTP ERROR =====");

    Serial.print("Error Code: ");
    Serial.println(httpResponseCode);

    Serial.print("Error Message: ");
    Serial.println(http.errorToString(httpResponseCode));

    Serial.println("======================");
  }

  // Close connection
  http.end();

  // Wait 5 sec
  delay(5000);
}void setup() {
  // put your setup code here, to run once:

}

void loop() {
  // put your main code here, to run repeatedly:

}
