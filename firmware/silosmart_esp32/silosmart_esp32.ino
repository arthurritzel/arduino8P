// SiloSmart - leitura dos sensores + envio via MQTT
// DHT11 (temperatura e umidade) + HC-SR04 (distancia/nivel)
// Publica um JSON a cada 5 s no broker publico da HiveMQ

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// Wi-Fi fica em secrets.h, que nao vai pro git.
// Copie secrets.example.h para secrets.h e preencha.
#include "secrets.h"

// ===== Configuracao =====

const char* MQTT_BROKER = "broker.hivemq.com";
const int   MQTT_PORTA  = 1883;

const char* TOPICO_DADOS  = "silosmart/grupo01/silo01/dados";
const char* TOPICO_STATUS = "silosmart/grupo01/silo01/status";

#define PINO_DHT  4
#define TIPO_DHT  DHT11
#define PINO_TRIG 25
#define PINO_ECHO 34   // ECHO chega aqui pelo divisor de tensao
#define PINO_VENTOINHA 26  // pino S do modulo rele que liga a ventoinha (aeracao)

// Alguns modulos rele ligam com HIGH, outros com LOW.
// Se a ventoinha ficar ligada quando deveria estar desligada, troque para false.
const bool RELE_LIGA_COM_HIGH = true;

// Ventoinha: liga acima de TEMP_LIGA e so desliga abaixo de TEMP_DESLIGA.
// A diferenca (histerese) evita ficar liga/desliga quando a temperatura oscila.
const float TEMP_LIGA_C    = 23.0;
const float TEMP_DESLIGA_C = 22.0;

// Nivel: distancia do sensor ate o fundo (vazio) e ate o grao quando cheio
const float ALTURA_SILO_CM = 30.0;
const float DIST_CHEIO_CM  = 3.0;   // HC-SR04 nao mede abaixo de ~2 cm

const unsigned long INTERVALO_MS = 5000;

DHT dht(PINO_DHT, TIPO_DHT);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
unsigned long ultimoEnvio = 0;
bool ventoinhaLigada = false;

// Retorna a distancia em cm, ou -1 se nao houve eco
float medirDistanciaCm() {
  digitalWrite(PINO_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PINO_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PINO_TRIG, LOW);

  unsigned long duracao = pulseIn(PINO_ECHO, HIGH, 30000);
  if (duracao == 0) return -1;

  return duracao * 0.0343 / 2.0;
}

// Converte distancia em % de enchimento (0 = vazio, 100 = cheio)
float calcularNivel(float distancia) {
  float pct = (ALTURA_SILO_CM - distancia) / (ALTURA_SILO_CM - DIST_CHEIO_CM) * 100.0;
  return constrain(pct, 0, 100);
}

void acionarRele(bool ligar) {
  digitalWrite(PINO_VENTOINHA, ligar == RELE_LIGA_COM_HIGH ? HIGH : LOW);
}

// Com leitura invalida do DHT11, mantem a ventoinha como esta
void controlarVentoinha(float temperatura) {
  if (isnan(temperatura)) return;

  if (!ventoinhaLigada && temperatura >= TEMP_LIGA_C) {
    ventoinhaLigada = true;
  } else if (ventoinhaLigada && temperatura <= TEMP_DESLIGA_C) {
    ventoinhaLigada = false;
  }
  acionarRele(ventoinhaLigada);
}

void conectarWiFi() {
  Serial.printf("Conectando ao Wi-Fi %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.print("\nWi-Fi conectado, IP: ");
  Serial.println(WiFi.localIP());
}

void conectarMQTT() {
  while (!mqtt.connected()) {
    String clientId = "silosmart-" + String(random(0xffff), HEX);
    Serial.print("Conectando ao broker MQTT... ");

    // Last Will: se o ESP cair, o broker publica "offline" sozinho
    if (mqtt.connect(clientId.c_str(), TOPICO_STATUS, 1, true, "offline")) {
      Serial.println("ok");
      mqtt.publish(TOPICO_STATUS, "online", true);
    } else {
      Serial.printf("falhou (rc=%d), tentando de novo em 5 s\n", mqtt.state());
      delay(5000);
    }
  }
}

void publicarLeitura() {
  float temperatura = dht.readTemperature();
  float umidade = dht.readHumidity();
  float distancia = medirDistanciaCm();

  bool dhtOk = !isnan(temperatura) && !isnan(umidade);
  bool distOk = distancia >= 0;

  controlarVentoinha(temperatura);

  // Leitura que falhou vai como null no JSON
  String t = dhtOk  ? String(temperatura, 1) : "null";
  String u = dhtOk  ? String(umidade, 0) : "null";
  String d = distOk ? String(distancia, 1) : "null";
  String n = distOk ? String(calcularNivel(distancia), 0) : "null";

  char payload[200];
  snprintf(payload, sizeof(payload),
           "{\"temperatura\":%s,\"umidade\":%s,\"distancia_cm\":%s,\"nivel_pct\":%s,\"ventoinha\":%s}",
           t.c_str(), u.c_str(), d.c_str(), n.c_str(), ventoinhaLigada ? "true" : "false");

  bool enviado = mqtt.publish(TOPICO_DADOS, payload);
  Serial.printf("%s %s\n", enviado ? "[enviado]" : "[falha ao enviar]", payload);
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_TRIG, OUTPUT);
  pinMode(PINO_ECHO, INPUT);
  digitalWrite(PINO_TRIG, LOW);
  pinMode(PINO_VENTOINHA, OUTPUT);
  acionarRele(false);  // comeca desligada
  dht.begin();
  randomSeed(esp_random());

  Serial.println();
  Serial.println("SiloSmart - MQTT");

  conectarWiFi();
  mqtt.setServer(MQTT_BROKER, MQTT_PORTA);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) conectarWiFi();
  if (!mqtt.connected()) conectarMQTT();
  mqtt.loop();

  if (millis() - ultimoEnvio >= INTERVALO_MS) {
    ultimoEnvio = millis();
    publicarLeitura();
  }
}