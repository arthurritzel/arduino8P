import { formatarDataHora, formatarDuracao, formatarNumero, MOTIVOS_ERRO } from '../formato.js';
import { alertasDoSilo, situacaoDoSilo } from '../situacao.js';
import { IconeVentoinha, Situacao } from './Icone.jsx';
import { SiloMedidor } from './SiloMedidor.jsx';

function Medida({ rotulo, valor, unidade, erro, limite }) {
  const acima = valor !== null && limite !== undefined && valor > limite;
  return (
    <div className="medida">
      <dt>{rotulo}</dt>
      <dd>
        <span className="medida-valor">{formatarNumero(valor)}</span>
        {valor !== null && <span className="medida-unidade">{unidade}</span>}
      </dd>
      {erro && <dd className="medida-nota"><Situacao nivel="aviso">{MOTIVOS_ERRO[erro] ?? erro}</Situacao></dd>}
      {!erro && acima && <dd className="medida-nota"><Situacao nivel="aviso">Acima de {limite} {unidade}</Situacao></dd>}
    </div>
  );
}

function Ventoinha({ ligada, erro }) {
  return (
    <div className="medida">
      <dt>Ventoinha</dt>
      <dd className="medida-ventoinha">
        {ligada !== null && <IconeVentoinha ligada={ligada} />}
        <span className="medida-valor">{ligada === null ? '—' : ligada ? 'Ligada' : 'Desligada'}</span>
      </dd>
      {erro && <dd className="medida-nota"><Situacao nivel="aviso">{MOTIVOS_ERRO[erro] ?? erro}</Situacao></dd>}
    </div>
  );
}

export function PainelSilo({ silo, agora, config }) {
  const ultima = silo.ultima_leitura;
  const erros = ultima?.erros ?? {};
  const nivel = ultima?.nivel_pct ?? null;
  const situacao = situacaoDoSilo(silo, agora, config);
  // A situação já aparece ao lado do nome; aqui ficam só os outros alertas.
  const alertas = alertasDoSilo(silo, agora, config).filter((a) => a.texto !== situacao.texto);
  const idade = ultima ? (agora - new Date(ultima.recebido_em)) / 1000 : null;

  return (
    <section className="painel-silo" aria-labelledby="titulo-silo">
      <div className="painel-silo-desenho">
        <SiloMedidor nivel={nivel} ventoinha={ultima?.ventoinha ?? null} />
      </div>

      <div className="painel-silo-info">
        <div className="painel-silo-titulo">
          <h1 id="titulo-silo">{silo.id}</h1>
          <Situacao nivel={situacao.nivel}>{situacao.texto}</Situacao>
        </div>
        <p className="painel-silo-atualizacao">
          {ultima ? (
            <>
              Última leitura em <time dateTime={ultima.recebido_em}>{formatarDataHora(ultima.recebido_em)}</time>
              <span className="texto-mudo"> (há {formatarDuracao(idade)})</span>
            </>
          ) : (
            'Ainda sem leituras deste silo.'
          )}
        </p>

        <div className="nivel-destaque">
          {nivel !== null ? (
            <>
              <span className="nivel-numero">
                {formatarNumero(nivel, 0)}
                <span className="nivel-pct">%</span>
              </span>
              <span className="nivel-legenda">do silo ocupado</span>
            </>
          ) : (
            <span className="nivel-legenda">
              Nível sem leitura
              {erros.nivel_pct && <Situacao nivel="aviso">{MOTIVOS_ERRO[erros.nivel_pct]}</Situacao>}
            </span>
          )}
        </div>

        <dl className="medidas">
          <Medida
            rotulo="Temperatura"
            valor={ultima?.temperatura ?? null}
            unidade="°C"
            erro={erros.temperatura}
            limite={config.alertaTemperaturaMax}
          />
          <Medida
            rotulo="Umidade"
            valor={ultima?.umidade ?? null}
            unidade="%"
            erro={erros.umidade}
            limite={config.alertaUmidadeMax}
          />
          <Medida
            rotulo="Distância do sensor ao grão"
            valor={ultima?.distancia_cm ?? null}
            unidade="cm"
            erro={erros.distancia_cm}
          />
          <Ventoinha ligada={ultima?.ventoinha ?? null} erro={erros.ventoinha} />
        </dl>

        {alertas.length > 0 && (
          <ul className="alertas" aria-label="Alertas">
            {alertas.map((a) => (
              <li key={a.texto}>
                <Situacao nivel={a.nivel}>{a.texto}</Situacao>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
