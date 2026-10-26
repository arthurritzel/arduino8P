import { descreverErros, formatarDataHora, formatarNumero, MOTIVOS_ERRO } from '../formato.js';
import { Situacao } from './Icone.jsx';

const COLUNAS = [
  { campo: 'temperatura', rotulo: 'Temperatura', unidade: '°C' },
  { campo: 'umidade', rotulo: 'Umidade', unidade: '%' },
  { campo: 'distancia_cm', rotulo: 'Distância', unidade: 'cm' },
  { campo: 'nivel_pct', rotulo: 'Nível', unidade: '%' },
];

function Celula({ leitura, campo, unidade }) {
  const erro = leitura.erros?.[campo];
  const valor = leitura[campo];
  return (
    <td className={erro ? 'celula-numero celula-erro' : 'celula-numero'} title={erro ? MOTIVOS_ERRO[erro] : undefined}>
      {formatarNumero(valor)}
      {valor !== null && <span className="celula-unidade"> {unidade}</span>}
    </td>
  );
}

function CelulaVentoinha({ leitura }) {
  const erro = leitura.erros?.ventoinha;
  const texto = leitura.ventoinha === null ? '—' : leitura.ventoinha ? 'Ligada' : 'Desligada';
  return (
    <td className={erro ? 'celula-erro' : undefined} title={erro ? MOTIVOS_ERRO[erro] : undefined}>
      {texto}
    </td>
  );
}

export function TabelaLeituras({ leituras, apenasErros, aoMudarFiltro, resumo }) {
  return (
    <section className="leituras" aria-labelledby="titulo-leituras">
      <div className="leituras-topo">
        <h2 id="titulo-leituras">Leituras recebidas</h2>
        <label className="leituras-filtro">
          <input type="checkbox" checked={apenasErros} onChange={(e) => aoMudarFiltro(e.target.checked)} />
          Só leituras com erro
        </label>
      </div>
      <p className="texto-secundario">
        {resumo.leituras.toLocaleString('pt-BR')} leituras no período,{' '}
        {resumo.com_erro.toLocaleString('pt-BR')} com erro
        {resumo.leituras > 0 && ` (${formatarNumero((resumo.com_erro / resumo.leituras) * 100)}%)`}. Mostrando as{' '}
        {leituras.length} mais recentes.
      </p>

      {leituras.length === 0 ? (
        <p className="leituras-vazio">
          {apenasErros ? 'Nenhuma leitura com erro no período.' : 'Nenhuma leitura no período.'}
        </p>
      ) : (
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th scope="col">Recebida em</th>
                {COLUNAS.map((c) => (
                  <th key={c.campo} scope="col" className="celula-numero">{c.rotulo}</th>
                ))}
                <th scope="col">Ventoinha</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {leituras.map((l) => (
                <tr key={l.id}>
                  <td className="celula-data">{formatarDataHora(l.recebido_em)}</td>
                  {COLUNAS.map((c) => (
                    <Celula key={c.campo} leitura={l} campo={c.campo} unidade={c.unidade} />
                  ))}
                  <CelulaVentoinha leitura={l} />
                  <td>
                    {l.tem_erro ? (
                      <Situacao nivel="aviso">{descreverErros(l.erros)}</Situacao>
                    ) : (
                      <Situacao nivel="ok">OK</Situacao>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
