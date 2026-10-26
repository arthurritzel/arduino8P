import { situacaoDoSilo } from '../situacao.js';
import { Icone } from './Icone.jsx';

export function SeletorSilo({ silos, selecionado, aoSelecionar, agora, config }) {
  if (silos.length < 2) return null;
  return (
    <nav className="seletor-silo" aria-label="Escolher silo">
      {silos.map((silo) => {
        const { nivel, texto } = situacaoDoSilo(silo, agora, config);
        return (
          <button
            key={silo.id}
            type="button"
            className="seletor-item"
            aria-pressed={silo.id === selecionado}
            onClick={() => aoSelecionar(silo.id)}
            title={texto}
          >
            <Icone tipo={nivel} />
            <span>{silo.id}</span>
          </button>
        );
      })}
    </nav>
  );
}
