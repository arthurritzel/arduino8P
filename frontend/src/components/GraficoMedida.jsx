import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatarDataHora, formatarEixoTempo, formatarNumero } from '../formato.js';

function Dica({ active, payload, label, unidade, casas, legendaDica }) {
  if (!active || !payload?.length || payload[0].value === null) return null;
  return (
    <div className="dica">
      <strong>
        {formatarNumero(payload[0].value, casas)} {unidade}
      </strong>
      <span>
        {legendaDica} {formatarDataHora(label)}
      </span>
    </div>
  );
}

// Quebra a linha onde o ESP32 ficou sem mandar dados, em vez de ligar os pontos por cima do buraco.
function comLacunas(pontos, chave, bucketMs) {
  const resultado = [];
  for (const p of pontos) {
    const anterior = resultado.at(-1);
    if (anterior && p.t - anterior.t > bucketMs * 2.5) {
      resultado.push({ t: anterior.t + bucketMs, valor: null });
    }
    resultado.push({ t: p.t, valor: p[chave] });
  }
  return resultado;
}

const EIXO = { stroke: 'var(--eixo)', tick: { fill: 'var(--tinta-muda)', fontSize: 12 }, tickLine: false };

export function GraficoMedida({
  titulo,
  unidade,
  chave,
  cor,
  serie,
  inicio,
  fim,
  dominio,
  limite,
  resumo,
  largo = false,
  altura = 200,
  curva = 'monotone',
  casas = 1,
  legendaDica = 'média às',
}) {
  const dados = comLacunas(serie.pontos, chave, serie.bucketSegundos * 1000);
  const temValor = dados.some((p) => p.valor !== null);

  return (
    <figure className={largo ? 'grafico grafico-largo' : 'grafico'}>
      <figcaption>
        <span className="grafico-titulo">{titulo}</span>
        <span className="grafico-unidade">{unidade}</span>
        {resumo && <span className="grafico-resumo">{resumo}</span>}
      </figcaption>
      {temValor ? (
        <ResponsiveContainer width="100%" height={altura}>
          <AreaChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grade)" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[inicio, fim]}
              tickFormatter={(ms) => formatarEixoTempo(ms, serie.horas)}
              minTickGap={40}
              {...EIXO}
            />
            <YAxis
              width={36}
              domain={dominio ?? [(min) => Math.floor(min - 1), (max) => Math.ceil(max + 1)]}
              allowDecimals={false}
              tickFormatter={(v) => formatarNumero(v, 0)}
              axisLine={false}
              {...EIXO}
            />
            <Tooltip
              content={<Dica unidade={unidade} casas={casas} legendaDica={legendaDica} />}
              cursor={{ stroke: 'var(--eixo)', strokeWidth: 1 }}
              isAnimationActive={false}
            />
            {limite !== undefined && (
              <ReferenceLine
                y={limite}
                stroke="var(--aviso)"
                strokeDasharray="4 4"
                ifOverflow="discard"
                label={{ value: `limite ${limite} ${unidade}`, position: 'insideTopRight', fill: 'var(--tinta-muda)', fontSize: 12 }}
              />
            )}
            <Area
              type={curva}
              dataKey="valor"
              stroke={cor}
              strokeWidth={2}
              fill={cor}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, fill: cor, stroke: 'var(--superficie)', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p className="grafico-vazio" style={{ height: altura }}>
          Sem leituras válidas no período.
        </p>
      )}
    </figure>
  );
}
