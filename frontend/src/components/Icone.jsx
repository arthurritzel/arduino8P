// Ícones de situação. Sempre acompanhados de texto; a cor não carrega o significado sozinha.
export function Icone({ tipo }) {
  const comum = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    'aria-hidden': true,
    className: `icone icone-${tipo}`,
  };
  if (tipo === 'ok') {
    return (
      <svg {...comum}>
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M4.8 8.2 7 10.4l4.2-4.6" fill="none" stroke="var(--superficie)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tipo === 'critico') {
    return (
      <svg {...comum}>
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="m5.5 5.5 5 5m0-5-5 5" stroke="var(--superficie)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...comum}>
      <path d="M8 1.5 15 14H1z" fill="currentColor" strokeLinejoin="round" />
      <path d="M8 6v3.6" stroke="var(--tinta-sobre-aviso)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="11.8" r="1" fill="var(--tinta-sobre-aviso)" />
    </svg>
  );
}

// Três pás; gira enquanto a ventoinha está ligada.
export function IconeVentoinha({ ligada }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      aria-hidden
      className={ligada ? 'icone-ventoinha icone-ventoinha-ligada' : 'icone-ventoinha'}
    >
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <g className="icone-ventoinha-pas" fill="currentColor">
        {[0, 120, 240].map((angulo) => (
          <ellipse key={angulo} cx="12" cy="6.5" rx="2.8" ry="4.6" transform={`rotate(${angulo} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="2" />
      </g>
    </svg>
  );
}

export function Situacao({ nivel, children }) {
  return (
    <span className={`situacao situacao-${nivel}`}>
      <Icone tipo={nivel} />
      <span>{children}</span>
    </span>
  );
}
