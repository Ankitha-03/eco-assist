#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ==========================================
// CONFIGURATION
// ==========================================

// 1. Wi-Fi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// 2. Server IP Address
// Replace with the local IP address of the computer running your Python backend
// Keep the :8000/ingest/telemetry part.
const char* serverUrl = "http://192.168.1.100:8000/ingest/telemetry";

// ==========================================
// HARDWARE PINS
// ==========================================
// DHT11 Sensor
#define DHTPIN 4       // Digital pin connected to the DHT11 Data pin
#define DHTTYPE DHT11  // Using DHT 11
DHT dht(DHTPIN, DHTTYPE);

// MQ2 Gas Sensor
#define MQ2_PIN 34     // Analog pin connected to MQ2 A0 pin

// ==========================================
// GLOBALS
// ==========================================
String deviceMac = "";
unsigned long previousMillis = 0;
// Send data every 60 seconds (60000 ms)
const long interval = 60000; 

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Initialize Sensors
  Serial.println("Initializing sensors...");
  dht.begin();
  analogReadResolution(12); // ESP32 ADC is 12-bit (0-4095)

  // Connect to Wi-Fi
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ WiFi connected!");
  deviceMac = WiFi.macAddress();
  Serial.print("ESP32 MAC Address: ");
  Serial.println(deviceMac);
  Serial.println("Please ensure this MAC address is registered to a device in the Eco-Assist database.");
}

void loop() {
  unsigned long currentMillis = millis();

  // Non-blocking timer to send data
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    if (WiFi.status() == WL_CONNECTED) {
      sendTelemetry();
    } else {
      Serial.println("⚠️ WiFi Disconnected. Attempting to reconnect...");
      WiFi.reconnect();
    }
  }
}

void sendTelemetry() {
  // 1. Read DHT11 Temperature and Humidity
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (isnan(h) || isnan(t)) {
    Serial.println("❌ Failed to read from DHT sensor! Check wiring.");
    h = 0.0;
    t = 0.0;
  }

  // 2. Read MQ2 Gas level
  int mq2Raw = analogRead(MQ2_PIN);

  // 3. Map raw data to approximations for the backend
  // MQ2 raw value on ESP32 is between 0 and 4095.
  // We map this to a general VOC (Volatile Organic Compound) score.
  float voc_level = map(mq2Raw, 0, 4095, 10, 800); 
  
  // Simulate ammonia level rising proportionally to general gases
  float ammonia_level = voc_level * 0.15; 
  
  // Hardcode pressure as we do not have a BMP280 sensor attached
  float pressure = 1013.25;

  // 4. Construct JSON Payload
  // The backend accepts device_id (UUID) OR mac_address. We will use mac_address.
  String jsonPayload = "{";
  jsonPayload += "\"device_id\": \"00000000-0000-0000-0000-000000000000\","; 
  jsonPayload += "\"mac_address\": \"" + deviceMac + "\",";
  jsonPayload += "\"temperature\": " + String(t) + ",";
  jsonPayload += "\"humidity\": " + String(h) + ",";
  jsonPayload += "\"pressure\": " + String(pressure) + ",";
  jsonPayload += "\"voc_level\": " + String(voc_level) + ",";
  jsonPayload += "\"ammonia_level\": " + String(ammonia_level);
  jsonPayload += "}";

  // 5. Send HTTP POST to Backend
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  Serial.println("\n📡 Sending Telemetry...");
  Serial.println(jsonPayload);
  
  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.println("Server replied: " + response);
  } else {
    Serial.print("HTTP POST Error code: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
