import assert from 'node:assert/strict';
import { test } from 'node:test';
import { interpretarLeitura, interpretarStatus, siloIdValido } from '../src/validar.js';

const ler = (texto) => interpretarLeitura(Buffer.from(texto));

test('leitura completa e válida não tem erro', () => {
  const r = ler('{"temperatura":23.1,"umidade":99,"distancia_cm":11.5,"nivel_pct":69,"ventoinha":true}');
  assert.equal(r.temErro, false);
  assert.deepEqual(r.erros, {});
  assert.deepEqual(r.valores, {
    temperatura: 23.1,
    umidade: 99,
    distancia_cm: 11.5,
    nivel_pct: 69,
    ventoinha: true,
  });
});

test('ventoinha desligada é valor válido, não erro', () => {
  const r = ler('{"temperatura":23.1,"umidade":60,"distancia_cm":11.5,"nivel_pct":69,"ventoinha":false}');
  assert.equal(r.temErro, false);
  assert.equal(r.valores.ventoinha, false);
});

test('ventoinha ausente, nula ou que não é true/false é erro', () => {
  const base = '"temperatura":23.1,"umidade":60,"distancia_cm":11.5,"nivel_pct":69';
  assert.deepEqual(ler(`{${base}}`).erros, { ventoinha: 'ausente' });
  assert.deepEqual(ler(`{${base},"ventoinha":null}`).erros, { ventoinha: 'nulo' });
  assert.deepEqual(ler(`{${base},"ventoinha":1}`).erros, { ventoinha: 'invalido' });
  assert.deepEqual(ler(`{${base},"ventoinha":"true"}`).erros, { ventoinha: 'invalido' });
  assert.equal(ler(`{${base},"ventoinha":1}`).valores.ventoinha, null);
});

test('campo null marca a leitura com erro "nulo"', () => {
  const r = ler('{"temperatura":null,"umidade":57,"distancia_cm":19.8,"nivel_pct":38,"ventoinha":true}');
  assert.equal(r.temErro, true);
  assert.deepEqual(r.erros, { temperatura: 'nulo' });
  assert.equal(r.valores.temperatura, null);
});

test('campo faltando, texto e fora da faixa também são erros', () => {
  const r = ler('{"temperatura":"abc","umidade":140,"nivel_pct":38,"ventoinha":false}');
  assert.deepEqual(r.erros, { temperatura: 'invalido', umidade: 'fora_da_faixa', distancia_cm: 'ausente' });
  assert.equal(r.valores.temperatura, null);
  assert.equal(r.valores.umidade, 140, 'valor fora da faixa é guardado para análise');
});

test('JSON inválido ou sem campos conhecidos é ignorado', () => {
  assert.equal(ler('{temperatura: 21'), null);
  assert.equal(ler('[1,2,3]'), null);
  assert.equal(ler('null'), null);
  assert.equal(ler('{"foo":1}'), null);
  assert.equal(ler(`{"temperatura":1,"lixo":"${'x'.repeat(3000)}"}`), null);
});

test('status aceita só online/offline', () => {
  assert.equal(interpretarStatus(Buffer.from('online')), 'online');
  assert.equal(interpretarStatus(Buffer.from(' OFFLINE\n')), 'offline');
  assert.equal(interpretarStatus(Buffer.from('ligado')), null);
});

test('id do silo vindo do tópico é validado', () => {
  assert.equal(siloIdValido('silo01'), true);
  assert.equal(siloIdValido(''), false);
  assert.equal(siloIdValido('silo 01'), false);
  assert.equal(siloIdValido('a'.repeat(65)), false);
});
