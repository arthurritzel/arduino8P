import { descreverErros, formatarDuracao, formatarNumero } from './formato.js';

// Cada alerta tem um nível (ok | aviso | critico) e um texto. A cor nunca aparece sem ícone e texto.
export function situacaoDoSilo(silo, agora, cfg) {
  const ultima = silo.ultima_leitura;
  const idade = ultima ? (agora - new Date(ultima.recebido_em)) / 1000 : null;

  if (silo.status === 'offline') return { nivel: 'critico', texto: 'ESP32 offline' };
  if (idade === null) return { nivel: 'aviso', texto: 'Nenhuma leitura recebida' };
  if (idade > cfg.semDadosAposSegundos) {
    return { nivel: 'aviso', texto: `Sem leituras há ${formatarDuracao(idade)}` };
  }
  return { nivel: 'ok', texto: 'Recebendo leituras' };
}

export function alertasDoSilo(silo, agora, cfg) {
  const alertas = [];
  const situacao = situacaoDoSilo(silo, agora, cfg);
  if (situacao.nivel !== 'ok') alertas.push(situacao);

  const ultima = silo.ultima_leitura;
  if (!ultima) return alertas;

  if (ultima.temperatura !== null && ultima.temperatura > cfg.alertaTemperaturaMax) {
    alertas.push({
      nivel: 'aviso',
      texto: `Temperatura de ${formatarNumero(ultima.temperatura)} °C, acima do limite de ${cfg.alertaTemperaturaMax} °C`,
    });
  }
  if (ultima.umidade !== null && ultima.umidade > cfg.alertaUmidadeMax) {
    alertas.push({
      nivel: 'aviso',
      texto: `Umidade de ${formatarNumero(ultima.umidade)} %, acima do limite de ${cfg.alertaUmidadeMax} %. Risco de fungos.`,
    });
  }
  if (ultima.tem_erro) {
    alertas.push({ nivel: 'aviso', texto: `Última leitura com erro: ${descreverErros(ultima.erros)}` });
  }
  return alertas;
}
