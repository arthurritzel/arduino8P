import express from 'express';
import { config } from './config.js';
import { listarLeituras, listarSilos, serieTemporal, siloExiste } from './db.js';
import { siloIdValido } from './validar.js';

// Express 4 não captura erros de funções async sozinho.
const rota = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function inteiroEntre(valor, min, max, padrao) {
  const n = Number.parseInt(valor, 10);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, n));
}

export function criarApi({ broker }) {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/config', (req, res) => {
    res.json(config.painel);
  });

  app.get('/api/status', (req, res) => {
    res.json({ mqtt: broker.estado(), agora: new Date() });
  });

  app.get(
    '/api/silos',
    rota(async (req, res) => {
      res.json(await listarSilos());
    }),
  );

  // Garante que :id é um silo conhecido antes das rotas de detalhe.
  app.param('id', (req, res, next, id) => {
    if (!siloIdValido(id)) return res.status(400).json({ erro: 'id de silo inválido' });
    siloExiste(id)
      .then((existe) => (existe ? next() : res.status(404).json({ erro: 'silo não encontrado' })))
      .catch(next);
  });

  app.get(
    '/api/silos/:id/serie',
    rota(async (req, res) => {
      const horas = inteiroEntre(req.query.horas, 1, 24 * 30, 24);
      res.json(await serieTemporal(req.params.id, horas));
    }),
  );

  app.get(
    '/api/silos/:id/leituras',
    rota(async (req, res) => {
      const horas = inteiroEntre(req.query.horas, 1, 24 * 30, 24);
      const limite = inteiroEntre(req.query.limite, 1, 500, 50);
      const apenasErros = req.query.apenas_erros === '1' || req.query.apenas_erros === 'true';
      res.json(await listarLeituras(req.params.id, { horas, limite, apenasErros }));
    }),
  );

  app.use('/api', (req, res) => res.status(404).json({ erro: 'rota não encontrada' }));

  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    console.error('[api]', erro);
    res.status(500).json({ erro: 'erro interno' });
  });

  return app;
}
