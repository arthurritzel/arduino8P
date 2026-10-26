import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

export const CONFIG_PADRAO = {
  atualizacaoSegundos: 5,
  semDadosAposSegundos: 30,
  alertaTemperaturaMax: 30,
  alertaUmidadeMax: 70,
};

export function useConfig() {
  const [config, setConfig] = useState(CONFIG_PADRAO);
  useEffect(() => {
    api.config().then((c) => setConfig({ ...CONFIG_PADRAO, ...c })).catch(() => {});
  }, []);
  return config;
}

// Relógio que avança a cada segundo, para o "há X s" andar entre uma busca e outra.
export function useAgora() {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return agora;
}

// Sem escolha do usuário, abre o silo que mandou leitura por último.
function siloMaisRecente(silos) {
  const ordem = (s) => (s.ultima_leitura ? Date.parse(s.ultima_leitura.recebido_em) : 0);
  return silos.reduce((melhor, s) => (!melhor || ordem(s) > ordem(melhor) ? s : melhor), null)?.id;
}

/**
 * Busca status, silos, série e leituras a cada `intervaloSegundos`.
 * Em caso de falha mantém os últimos dados e expõe o erro.
 */
export function usePainel({ siloEscolhido, horas, apenasErros, intervaloSegundos }) {
  const [dados, setDados] = useState(null);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const ultimaRequisicao = useRef(0);

  const buscar = useCallback(async () => {
    const requisicao = ++ultimaRequisicao.current;
    setCarregando(true);
    try {
      const [status, silos] = await Promise.all([api.status(), api.silos()]);
      const siloId = silos.some((s) => s.id === siloEscolhido) ? siloEscolhido : siloMaisRecente(silos);
      const [serie, leituras] = siloId
        ? await Promise.all([api.serie(siloId, horas), api.leituras(siloId, { horas, apenasErros })])
        : [null, []];
      if (serie) serie.pontos = serie.pontos.map((p) => ({ ...p, t: Date.parse(p.t) }));

      // Descarta respostas atrasadas de uma seleção anterior.
      if (requisicao !== ultimaRequisicao.current) return;
      setDados({ status, silos, siloId, serie, leituras, horas });
      setAtualizadoEm(new Date());
      setErro(null);
    } catch (e) {
      if (requisicao === ultimaRequisicao.current) setErro(e);
    } finally {
      if (requisicao === ultimaRequisicao.current) setCarregando(false);
    }
  }, [siloEscolhido, horas, apenasErros]);

  useEffect(() => {
    buscar();
    const id = setInterval(buscar, Math.max(1, intervaloSegundos) * 1000);
    return () => clearInterval(id);
  }, [buscar, intervaloSegundos]);

  return { dados, atualizadoEm, erro, carregando };
}
