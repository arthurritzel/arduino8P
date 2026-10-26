import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS silos (
    id         TEXT PRIMARY KEY,
    status     TEXT CHECK (status IN ('online', 'offline')),
    status_em  TIMESTAMPTZ,
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS leituras (
    id            BIGSERIAL PRIMARY KEY,
    silo_id       TEXT NOT NULL REFERENCES silos (id),
    recebido_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
    temperatura   DOUBLE PRECISION,
    umidade       DOUBLE PRECISION,
    distancia_cm  DOUBLE PRECISION,
    nivel_pct     DOUBLE PRECISION,
    tem_erro      BOOLEAN NOT NULL,
    erros         JSONB NOT NULL DEFAULT '{}',
    payload       JSONB NOT NULL
  );

  -- Adicionada depois da primeira versão; o ALTER atualiza bancos já existentes.
  ALTER TABLE leituras ADD COLUMN IF NOT EXISTS ventoinha BOOLEAN;

  CREATE INDEX IF NOT EXISTS leituras_silo_recebido_idx ON leituras (silo_id, recebido_em DESC);
`;

const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function iniciarBanco({ tentativas = 30 } = {}) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      await pool.query(SCHEMA);
      return;
    } catch (erro) {
      if (tentativa >= tentativas) throw erro;
      console.warn(`[db] banco indisponível (${erro.message}), nova tentativa em 2 s`);
      await espera(2000);
    }
  }
}

async function garantirSilo(siloId) {
  await pool.query('INSERT INTO silos (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [siloId]);
}

export async function salvarLeitura(siloId, { valores, erros, temErro, payload }) {
  await garantirSilo(siloId);
  await pool.query(
    `INSERT INTO leituras
       (silo_id, temperatura, umidade, distancia_cm, nivel_pct, ventoinha, tem_erro, erros, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      siloId,
      valores.temperatura,
      valores.umidade,
      valores.distancia_cm,
      valores.nivel_pct,
      valores.ventoinha,
      temErro,
      JSON.stringify(erros),
      JSON.stringify(payload),
    ],
  );
}

export async function atualizarStatus(siloId, status) {
  await pool.query(
    `INSERT INTO silos (id, status, status_em) VALUES ($1, $2, now())
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, status_em = EXCLUDED.status_em`,
    [siloId, status],
  );
}

const COLUNAS_LEITURA = `
  l.id, l.recebido_em, l.temperatura, l.umidade, l.distancia_cm, l.nivel_pct, l.ventoinha,
  l.tem_erro, l.erros
`;

export async function listarSilos() {
  const { rows } = await pool.query(`
    SELECT s.id, s.status, s.status_em, s.criado_em, to_jsonb(u) AS ultima_leitura
    FROM silos s
    LEFT JOIN LATERAL (
      SELECT ${COLUNAS_LEITURA}
      FROM leituras l
      WHERE l.silo_id = s.id
      ORDER BY l.recebido_em DESC
      LIMIT 1
    ) u ON true
    ORDER BY s.id
  `);
  return rows;
}

export async function siloExiste(siloId) {
  const { rowCount } = await pool.query('SELECT 1 FROM silos WHERE id = $1', [siloId]);
  return rowCount > 0;
}

export async function listarLeituras(siloId, { horas, limite, apenasErros }) {
  const { rows } = await pool.query(
    `SELECT ${COLUNAS_LEITURA}
     FROM leituras l
     WHERE l.silo_id = $1
       AND l.recebido_em >= now() - make_interval(hours => $2)
       AND ($3::boolean IS FALSE OR l.tem_erro)
     ORDER BY l.recebido_em DESC
     LIMIT $4`,
    [siloId, horas, apenasErros, limite],
  );
  return rows;
}

// Agrupa as leituras do período em ~240 intervalos para os gráficos.
// As médias ignoram valores marcados com erro naquele campo. Para a ventoinha,
// ventoinha_pct é a porcentagem das leituras válidas em que ela estava ligada.
export async function serieTemporal(siloId, horas) {
  const bucketSegundos = Math.max(5, Math.ceil((horas * 3600) / 240));
  const { rows } = await pool.query(
    `SELECT
       date_bin(make_interval(secs => $2), recebido_em, TIMESTAMPTZ '2000-01-01') AS t,
       avg(temperatura) FILTER (WHERE NOT erros ? 'temperatura') AS temperatura,
       avg(umidade)     FILTER (WHERE NOT erros ? 'umidade')     AS umidade,
       avg(nivel_pct)   FILTER (WHERE NOT erros ? 'nivel_pct')   AS nivel_pct,
       count(*) FILTER (WHERE ventoinha)::int AS ventoinha_ligada,
       count(ventoinha)::int                  AS ventoinha_validas,
       count(*)::int                          AS leituras,
       count(*) FILTER (WHERE tem_erro)::int  AS com_erro
     FROM leituras
     WHERE silo_id = $1 AND recebido_em >= now() - make_interval(hours => $3)
     GROUP BY 1
     ORDER BY 1`,
    [siloId, bucketSegundos, horas],
  );

  const porcentagem = (parte, total) => (total > 0 ? (parte / total) * 100 : null);
  const pontos = rows.map((p) => ({
    ...p,
    ventoinha_pct: porcentagem(p.ventoinha_ligada, p.ventoinha_validas),
  }));
  const resumo = rows.reduce(
    (acc, p) => ({
      leituras: acc.leituras + p.leituras,
      com_erro: acc.com_erro + p.com_erro,
      ventoinha_ligada: acc.ventoinha_ligada + p.ventoinha_ligada,
      ventoinha_validas: acc.ventoinha_validas + p.ventoinha_validas,
    }),
    { leituras: 0, com_erro: 0, ventoinha_ligada: 0, ventoinha_validas: 0 },
  );
  resumo.ventoinha_pct = porcentagem(resumo.ventoinha_ligada, resumo.ventoinha_validas);
  return { horas, bucketSegundos, resumo, pontos };
}
