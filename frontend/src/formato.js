const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
const hora = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium' });
const horaMinuto = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const diaHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit' });

export const formatarDataHora = (data) => dataHora.format(new Date(data));
export const formatarHora = (data) => hora.format(new Date(data));
export const formatarEixoTempo = (ms, horas) =>
  horas <= 24 ? horaMinuto.format(ms) : `${diaHora.format(ms)}h`;

export function formatarNumero(valor, casas = 1) {
  if (valor === null || valor === undefined) return '—';
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: casas });
}

export function formatarDuracao(segundos) {
  const s = Math.max(0, Math.round(segundos));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
  return `${Math.floor(s / 86400)} d ${Math.floor((s % 86400) / 3600)} h`;
}

export const NOMES_CAMPOS = {
  temperatura: 'Temperatura',
  umidade: 'Umidade',
  distancia_cm: 'Distância',
  nivel_pct: 'Nível',
  ventoinha: 'Ventoinha',
};

// Frases neutras em gênero: "Temperatura sem valor", "Nível sem valor".
export const MOTIVOS_ERRO = {
  ausente: 'não veio na mensagem',
  nulo: 'sem valor (sensor falhou)',
  invalido: 'com valor inválido',
  fora_da_faixa: 'fora da faixa do sensor',
};

export function descreverErros(erros) {
  return Object.entries(erros ?? {})
    .map(([campo, motivo]) => `${NOMES_CAMPOS[campo] ?? campo} ${MOTIVOS_ERRO[motivo] ?? motivo}`)
    .join(', ');
}
