async function obter(caminho) {
  const resposta = await fetch(caminho, { headers: { Accept: 'application/json' } });
  if (!resposta.ok) throw new Error(`${caminho} respondeu ${resposta.status}`);
  return resposta.json();
}

const silo = (id) => `/api/silos/${encodeURIComponent(id)}`;

export const api = {
  config: () => obter('/api/config'),
  status: () => obter('/api/status'),
  silos: () => obter('/api/silos'),
  serie: (id, horas) => obter(`${silo(id)}/serie?horas=${horas}`),
  leituras: (id, { horas, apenasErros, limite = 50 }) =>
    obter(`${silo(id)}/leituras?horas=${horas}&limite=${limite}&apenas_erros=${apenasErros ? 1 : 0}`),
};
