import { useId } from 'react';
import { formatarNumero } from '../formato.js';

// Desenho do silo com o grão subindo conforme o nível. O sensor ultrassônico fica no topo
// e a linha pontilhada mostra a distância que ele mede até a superfície do grão.
// A ventoinha de aeração fica na base e gira quando está ligada.
const CORPO = { x: 28, y: 78, largura: 144, altura: 176 };
const MARCAS = [25, 50, 75];

const VENTOINHA = { cx: 14, cy: 232, r: 11 };

export function SiloMedidor({ nivel, ventoinha }) {
  const idClip = useId();
  const temNivel = nivel !== null && nivel !== undefined;
  const fracao = temNivel ? Math.min(1, Math.max(0, nivel / 100)) : 0;
  const deslocamento = CORPO.altura * (1 - fracao);
  const superficie = CORPO.y + deslocamento - 4;
  const ondas = [];
  for (let y = CORPO.y + 11; y < CORPO.y + CORPO.altura; y += 11) ondas.push(y);

  return (
    <svg
      className="silo-medidor"
      viewBox="0 0 200 270"
      role="img"
      aria-label={[
        temNivel ? `Silo com ${formatarNumero(nivel, 0)}% ocupado` : 'Nível do silo sem leitura',
        ventoinha === true && 'ventoinha ligada',
        ventoinha === false && 'ventoinha desligada',
      ]
        .filter(Boolean)
        .join(', ')}
    >
      <defs>
        <clipPath id={idClip}>
          <rect x={CORPO.x} y={CORPO.y} width={CORPO.largura} height={CORPO.altura} />
        </clipPath>
      </defs>

      <rect className="silo-corpo" x={CORPO.x} y={CORPO.y} width={CORPO.largura} height={CORPO.altura} />

      <g clipPath={`url(#${idClip})`}>
        {temNivel && fracao > 0 && (
          <g className="silo-grao" style={{ transform: `translateY(${CORPO.y + deslocamento}px)` }}>
            <path d={`M${CORPO.x} 6 L100 -4 L${CORPO.x + CORPO.largura} 6 V${CORPO.altura + 10} H${CORPO.x} Z`} />
            <path className="silo-grao-topo" d={`M${CORPO.x} 6 L100 -4 L${CORPO.x + CORPO.largura} 6`} />
          </g>
        )}
        {ondas.map((y) => (
          <line key={y} className="silo-onda" x1={CORPO.x} x2={CORPO.x + CORPO.largura} y1={y} y2={y} />
        ))}
      </g>

      <path className="silo-teto" d={`M${CORPO.x - 6} ${CORPO.y} L100 26 L${CORPO.x + CORPO.largura + 6} ${CORPO.y} Z`} />
      <rect className="silo-teto" x="93" y="16" width="14" height="12" rx="1" />

      <rect className="silo-sensor" x="90" y={CORPO.y + 2} width="20" height="7" rx="1.5" />
      {temNivel && (
        <line className="silo-feixe" x1="100" x2="100" y1={CORPO.y + 11} y2={Math.max(CORPO.y + 11, superficie)} />
      )}

      {MARCAS.map((pct) => {
        const y = CORPO.y + CORPO.altura * (1 - pct / 100);
        return (
          <g key={pct} className="silo-marca">
            <line x1={CORPO.x + CORPO.largura} x2={CORPO.x + CORPO.largura + 7} y1={y} y2={y} />
            <text x={CORPO.x + CORPO.largura + 10} y={y + 4}>{pct}%</text>
          </g>
        );
      })}

      <rect className="silo-base" x="14" y={CORPO.y + CORPO.altura} width="172" height="7" rx="1" />

      {ventoinha !== null && ventoinha !== undefined && (
        <g className={ventoinha ? 'silo-ventoinha silo-ventoinha-ligada' : 'silo-ventoinha'}>
          <rect className="silo-ventoinha-duto" x={VENTOINHA.cx + 6} y={VENTOINHA.cy - 5} width={CORPO.x - VENTOINHA.cx - 5} height="10" />
          <circle className="silo-ventoinha-caixa" cx={VENTOINHA.cx} cy={VENTOINHA.cy} r={VENTOINHA.r} />
          <g className="silo-ventoinha-pas" style={{ transformOrigin: `${VENTOINHA.cx}px ${VENTOINHA.cy}px` }}>
            {[0, 120, 240].map((angulo) => (
              <ellipse
                key={angulo}
                cx={VENTOINHA.cx}
                cy={VENTOINHA.cy - 4.5}
                rx="2.4"
                ry="4"
                transform={`rotate(${angulo} ${VENTOINHA.cx} ${VENTOINHA.cy})`}
              />
            ))}
            <circle cx={VENTOINHA.cx} cy={VENTOINHA.cy} r="1.8" />
          </g>
        </g>
      )}
    </svg>
  );
}
