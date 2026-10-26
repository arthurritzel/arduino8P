import { formatarHora } from '../formato.js';
import { Situacao } from './Icone.jsx';

export function Cabecalho({ status, atualizadoEm, intervaloSegundos, erro }) {
  const conectado = status?.mqtt?.conectado;
  return (
    <header className="cabecalho">
      <div className="marca">
        <span className="marca-nome">
          Silo<span className="marca-smart">Smart</span>
        </span>
        <span className="marca-sub">Monitoramento de silos</span>
      </div>
      <div className="cabecalho-estado">
        {erro ? (
          <Situacao nivel="critico">Backend fora do ar</Situacao>
        ) : status ? (
          <Situacao nivel={conectado ? 'ok' : 'critico'}>
            {conectado ? 'Conectado ao broker' : 'Sem conexão com o broker'}
          </Situacao>
        ) : null}
        <span className="cabecalho-atualizado">
          {atualizadoEm ? `Painel atualizado às ${formatarHora(atualizadoEm)}` : 'Carregando…'}
          <span className="texto-mudo"> · a cada {intervaloSegundos} s</span>
        </span>
      </div>
    </header>
  );
}
