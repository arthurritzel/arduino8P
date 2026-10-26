// Simula um ESP32 publicando no broker, para testar o painel sem o hardware.
// Uso: docker compose --profile simulador up   (ou: npm run simular)
import { randomBytes } from 'node:crypto';
import mqtt from 'mqtt';
import { config } from './config.js';

const siloId = process.env.SIMULADOR_SILO ?? 'simulado';
const intervaloMs = Number(process.env.SIMULADOR_INTERVALO_MS ?? 5000);
const base = `${config.mqtt.prefixo}/${siloId}`;
const ALTURA_CM = 32; // altura útil do silo do protótipo

const cliente = mqtt.connect(config.mqtt.url, {
  clientId: `silosmart-simulador-${randomBytes(4).toString('hex')}`,
  will: { topic: `${base}/status`, payload: 'offline', retain: true, qos: 1 },
});

const estado = { temperatura: 24, umidade: 60, nivel: 40 };
const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const passo = (amplitude) => (Math.random() - 0.5) * amplitude;
const talvezNulo = (valor) => (Math.random() < 0.06 ? null : valor);

function proximaLeitura() {
  estado.temperatura = limitar(estado.temperatura + passo(0.8), 16, 34);
  estado.umidade = limitar(estado.umidade + passo(2), 40, 85);
  estado.nivel = limitar(estado.nivel + passo(1.5), 5, 95);
  const distancia = ALTURA_CM * (1 - estado.nivel / 100);
  // Imita a lógica do ESP32: liga a ventoinha para arejar quando esquenta ou umedece.
  const ventoinha = estado.umidade > 70 || estado.temperatura > 30;
  return {
    temperatura: talvezNulo(Number(estado.temperatura.toFixed(1))),
    umidade: talvezNulo(Math.round(estado.umidade)),
    distancia_cm: talvezNulo(Number(distancia.toFixed(1))),
    nivel_pct: talvezNulo(Math.round(estado.nivel)),
    ventoinha: talvezNulo(ventoinha),
  };
}

cliente.on('connect', () => {
  console.log(`[simulador] publicando em ${base}/dados a cada ${intervaloMs} ms`);
  cliente.publish(`${base}/status`, 'online', { retain: true, qos: 1 });
});
cliente.on('error', (erro) => console.error('[simulador] erro:', erro.message));

const timer = setInterval(() => {
  if (!cliente.connected) return;
  const leitura = proximaLeitura();
  cliente.publish(`${base}/dados`, JSON.stringify(leitura));
  console.log('[simulador]', JSON.stringify(leitura));
}, intervaloMs);

function encerrar() {
  clearInterval(timer);
  cliente.publish(`${base}/status`, 'offline', { retain: true, qos: 1 }, () => {
    cliente.end(false, {}, () => process.exit(0));
  });
}
process.on('SIGTERM', encerrar);
process.on('SIGINT', encerrar);
