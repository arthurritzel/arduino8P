import { useState } from 'react';
import { Cabecalho } from './components/Cabecalho.jsx';
import { FiltroPeriodo } from './components/FiltroPeriodo.jsx';
import { GraficoMedida } from './components/GraficoMedida.jsx';
import { PainelSilo } from './components/PainelSilo.jsx';
import { SeletorSilo } from './components/SeletorSilo.jsx';
import { TabelaLeituras } from './components/TabelaLeituras.jsx';
import { formatarHora, formatarNumero } from './formato.js';
import { useAgora, useConfig, usePainel } from './usePainel.js';

export function App() {
  const config = useConfig();
  const agora = useAgora();
  // O silo escolhido fica na URL (?silo=silo01) para dar para compartilhar o link.
  const [siloEscolhido, setSiloEscolhido] = useState(() => new URLSearchParams(location.search).get('silo'));
  const [horas, setHoras] = useState(1);
  const [apenasErros, setApenasErros] = useState(false);
  const { dados, atualizadoEm, erro, carregando } = usePainel({
    siloEscolhido,
    horas,
    apenasErros,
    intervaloSegundos: config.atualizacaoSegundos,
  });

  const silo = dados?.silos.find((s) => s.id === dados.siloId);
  // Ao trocar de silo ou período, o conteúdo antigo fica esmaecido até a nova resposta chegar.
  const trocando =
    carregando && dados && (dados.horas !== horas || (siloEscolhido !== null && dados.siloId !== siloEscolhido));
  const fim = dados ? Date.parse(dados.status.agora) : 0;
  const inicio = fim - (dados?.horas ?? horas) * 3600 * 1000;

  return (
    <div className="pagina">
      <Cabecalho
        status={dados?.status}
        atualizadoEm={atualizadoEm}
        intervaloSegundos={config.atualizacaoSegundos}
        erro={erro}
      />

      {erro && (
        <p className="faixa-erro" role="alert">
          Não foi possível falar com o backend ({erro.message}).{' '}
          {atualizadoEm
            ? `Mostrando os dados de ${formatarHora(atualizadoEm)}. Nova tentativa em ${config.atualizacaoSegundos} s.`
            : 'Verifique se os containers estão de pé com docker compose ps.'}
        </p>
      )}

      {dados && dados.silos.length === 0 && (
        <section className="vazio">
          <h1>Nenhum silo enviou dados ainda</h1>
          <p>
            O backend está assinando <code>{dados.status.mqtt.topicos.join('  e  ')}</code> em{' '}
            <code>{dados.status.mqtt.url}</code>. Ligue o ESP32 ou rode o simulador com{' '}
            <code>docker compose --profile simulador up</code>. O silo aparece aqui na primeira leitura recebida.
          </p>
        </section>
      )}

      {silo && (
        <main className={trocando ? 'conteudo conteudo-trocando' : 'conteudo'}>
          <SeletorSilo
            silos={dados.silos}
            selecionado={silo.id}
            aoSelecionar={(id) => {
              setSiloEscolhido(id);
              history.replaceState(null, '', `?silo=${encodeURIComponent(id)}`);
            }}
            agora={agora}
            config={config}
          />

          <PainelSilo silo={silo} agora={agora} config={config} />

          <div className="linha-filtros">
            <FiltroPeriodo horas={horas} aoMudar={setHoras} />
          </div>

          <div className="graficos">
            <GraficoMedida
              titulo="Temperatura"
              unidade="°C"
              chave="temperatura"
              cor="var(--serie-temperatura)"
              serie={dados.serie}
              inicio={inicio}
              fim={fim}
              limite={config.alertaTemperaturaMax}
            />
            <GraficoMedida
              titulo="Umidade"
              unidade="%"
              chave="umidade"
              cor="var(--serie-umidade)"
              serie={dados.serie}
              inicio={inicio}
              fim={fim}
              dominio={[0, 100]}
              limite={config.alertaUmidadeMax}
            />
            <GraficoMedida
              titulo="Nível do silo"
              unidade="%"
              chave="nivel_pct"
              cor="var(--serie-nivel)"
              serie={dados.serie}
              inicio={inicio}
              fim={fim}
              dominio={[0, 100]}
            />
            <GraficoMedida
              titulo="Ventoinha"
              unidade="% do tempo ligada"
              chave="ventoinha_pct"
              cor="var(--serie-ventoinha)"
              serie={dados.serie}
              inicio={inicio}
              fim={fim}
              dominio={[0, 100]}
              curva="stepAfter"
              altura={120}
              casas={0}
              legendaDica="no intervalo de"
              resumo={
                dados.serie.resumo.ventoinha_pct !== null &&
                `Ligada em ${formatarNumero(dados.serie.resumo.ventoinha_pct, 0)}% das leituras do período`
              }
              largo
            />
          </div>

          <TabelaLeituras
            leituras={dados.leituras}
            apenasErros={apenasErros}
            aoMudarFiltro={setApenasErros}
            resumo={dados.serie.resumo}
          />
        </main>
      )}

      <footer className="rodape">
        Leituras do ESP32 via MQTT
        {dados && (
          <>
            {' '}em <code>{dados.status.mqtt.url}</code>
          </>
        )}
        . Todos os horários são de quando o backend recebeu a mensagem.
      </footer>
    </div>
  );
}
