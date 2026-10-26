const PERIODOS = [
  { horas: 1, rotulo: '1 hora' },
  { horas: 6, rotulo: '6 horas' },
  { horas: 24, rotulo: '24 horas' },
  { horas: 168, rotulo: '7 dias' },
];

export function FiltroPeriodo({ horas, aoMudar }) {
  return (
    <div className="filtro-periodo" role="group" aria-label="Período">
      <span className="filtro-rotulo">Últimas</span>
      {PERIODOS.map((p) => (
        <button
          key={p.horas}
          type="button"
          className="filtro-opcao"
          aria-pressed={p.horas === horas}
          onClick={() => aoMudar(p.horas)}
        >
          {p.rotulo}
        </button>
      ))}
    </div>
  );
}
