function numero(valor, padrao) {
  const n = Number(valor);
  return valor !== undefined && valor !== '' && Number.isFinite(n) ? n : padrao;
}

export const config = {
  porta: numero(process.env.PORT, 3000),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgres://silosmart:silosmart@localhost:5432/silosmart',
  mqtt: {
    url: process.env.MQTT_URL ?? 'mqtt://broker.hivemq.com:1883',
    // Prefixo dos tópicos do grupo. O backend assina <prefixo>/+/dados e <prefixo>/+/status.
    prefixo: (process.env.MQTT_PREFIXO ?? 'silosmart/grupo01').replace(/\/+$/, ''),
  },
  // Valores repassados ao front em GET /api/config.
  painel: {
    atualizacaoSegundos: numero(process.env.FRONT_ATUALIZACAO_SEGUNDOS, 5),
    semDadosAposSegundos: numero(process.env.SEM_DADOS_APOS_SEGUNDOS, 30),
    alertaTemperaturaMax: numero(process.env.ALERTA_TEMPERATURA_MAX, 30),
    alertaUmidadeMax: numero(process.env.ALERTA_UMIDADE_MAX, 70),
  },
};
