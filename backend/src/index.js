import { criarApi } from './api.js';
import { conectarBroker } from './broker.js';
import { config } from './config.js';
import { atualizarStatus, iniciarBanco, pool, salvarLeitura } from './db.js';
import { interpretarLeitura, interpretarStatus, siloIdValido } from './validar.js';

await iniciarBanco();
console.log('[db] banco pronto');

const broker = conectarBroker(config.mqtt, {
  async aoReceberDados(siloId, payload) {
    if (!siloIdValido(siloId)) return;
    const leitura = interpretarLeitura(payload);
    if (!leitura) {
      console.warn(`[mqtt] mensagem ignorada em ${siloId}/dados: ${payload.toString('utf8').slice(0, 120)}`);
      return;
    }
    await salvarLeitura(siloId, leitura);
    if (leitura.temErro) {
      console.warn(`[dados] ${siloId} leitura com erro:`, JSON.stringify(leitura.erros));
    }
  },
  async aoReceberStatus(siloId, payload) {
    if (!siloIdValido(siloId)) return;
    const status = interpretarStatus(payload);
    if (!status) return;
    await atualizarStatus(siloId, status);
    console.log(`[status] ${siloId} está ${status}`);
  },
});

const servidor = criarApi({ broker }).listen(config.porta, () => {
  console.log(`[api] ouvindo na porta ${config.porta}`);
});

async function encerrar(sinal) {
  console.log(`[app] ${sinal} recebido, encerrando`);
  servidor.close();
  await broker.encerrar();
  await pool.end();
  process.exit(0);
}
process.on('SIGTERM', encerrar);
process.on('SIGINT', encerrar);
