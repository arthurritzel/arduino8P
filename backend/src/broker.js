import { randomBytes } from 'node:crypto';
import mqtt from 'mqtt';

/**
 * Conecta no broker e assina os tópicos de dados e status de todos os silos do grupo.
 * O segundo nível do tópico (ex.: silo01) identifica o silo.
 */
export function conectarBroker({ url, prefixo }, { aoReceberDados, aoReceberStatus }) {
  // Dois clientes com o mesmo clientId derrubam um ao outro, então o sufixo é aleatório.
  const clientId = `silosmart-backend-${randomBytes(4).toString('hex')}`;
  const topicos = [`${prefixo}/+/dados`, `${prefixo}/+/status`];
  let ultimaMensagemEm = null;

  const cliente = mqtt.connect(url, {
    clientId,
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 20_000,
    resubscribe: false, // a assinatura é refeita no evento 'connect'
  });

  cliente.on('connect', () => {
    console.log(`[mqtt] conectado em ${url} como ${clientId}`);
    cliente.subscribe(topicos, { qos: 0 }, (erro) => {
      if (erro) console.error('[mqtt] falha ao assinar tópicos:', erro.message);
      else console.log(`[mqtt] assinando ${topicos.join(', ')}`);
    });
  });
  cliente.on('reconnect', () => console.log('[mqtt] reconectando...'));
  cliente.on('offline', () => console.warn('[mqtt] desconectado do broker'));
  cliente.on('error', (erro) => console.error('[mqtt] erro:', erro.message));

  cliente.on('message', (topico, payload, pacote) => {
    const partes = topico.split('/');
    const tipo = partes.at(-1);
    const siloId = partes.at(-2);
    ultimaMensagemEm = new Date();

    let tarefa;
    if (tipo === 'dados') {
      // Uma mensagem de dados retida seria regravada a cada reconexão com horário novo.
      if (pacote.retain) return;
      tarefa = aoReceberDados(siloId, payload);
    } else if (tipo === 'status') {
      tarefa = aoReceberStatus(siloId, payload);
    }
    Promise.resolve(tarefa).catch((erro) =>
      console.error(`[mqtt] erro ao processar ${topico}:`, erro.message),
    );
  });

  return {
    estado: () => ({
      conectado: cliente.connected,
      url,
      clientId,
      topicos,
      ultimaMensagemEm,
    }),
    encerrar: () => new Promise((resolve) => cliente.end(false, {}, resolve)),
  };
}
