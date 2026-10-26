// Campos esperados na mensagem. Para os numéricos, a faixa física do sensor:
// um valor fora dela é tratado como erro de leitura.
export const CAMPOS = {
  temperatura: { tipo: 'numero', min: -40, max: 80 }, // DHT22
  umidade: { tipo: 'numero', min: 0, max: 100 }, // DHT22
  distancia_cm: { tipo: 'numero', min: 2, max: 400 }, // HC-SR04
  nivel_pct: { tipo: 'numero', min: 0, max: 100 },
  ventoinha: { tipo: 'booleano' }, // true = ligada
};

// O broker é público: qualquer um pode publicar nos nossos tópicos.
// Payloads grandes demais não são leituras do ESP32.
const TAMANHO_MAXIMO = 2048;

const SILO_ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;

export function siloIdValido(id) {
  return SILO_ID_VALIDO.test(id);
}

/**
 * Converte o payload MQTT de dados numa leitura pronta para o banco.
 * Retorna null quando a mensagem deve ser ignorada (JSON inválido ou sem nenhum campo conhecido).
 *
 * `erros` mapeia cada campo problemático para o motivo:
 *   ausente       o campo não veio na mensagem
 *   nulo          veio como null (o ESP32 manda null quando o sensor falha)
 *   invalido      veio, mas não é do tipo esperado (número, ou true/false na ventoinha)
 *   fora_da_faixa é número, mas fora da faixa física do sensor
 */
export function interpretarLeitura(payload) {
  if (payload.length > TAMANHO_MAXIMO) return null;

  let dados;
  try {
    dados = JSON.parse(payload.toString('utf8'));
  } catch {
    return null;
  }
  if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) return null;
  if (!Object.keys(CAMPOS).some((campo) => campo in dados)) return null;

  const valores = {};
  const erros = {};
  for (const [campo, { tipo, min, max }] of Object.entries(CAMPOS)) {
    const valor = dados[campo];
    valores[campo] = null;
    if (valor === undefined) {
      erros[campo] = 'ausente';
    } else if (valor === null) {
      erros[campo] = 'nulo';
    } else if (tipo === 'booleano') {
      if (typeof valor === 'boolean') valores[campo] = valor;
      else erros[campo] = 'invalido';
    } else if (typeof valor !== 'number' || !Number.isFinite(valor)) {
      erros[campo] = 'invalido';
    } else {
      // Valores fora da faixa são guardados mesmo assim, para análise, mas marcados.
      valores[campo] = valor;
      if (valor < min || valor > max) erros[campo] = 'fora_da_faixa';
    }
  }

  return { valores, erros, temErro: Object.keys(erros).length > 0, payload: dados };
}

export function interpretarStatus(payload) {
  const texto = payload.toString('utf8').trim().toLowerCase();
  return texto === 'online' || texto === 'offline' ? texto : null;
}
