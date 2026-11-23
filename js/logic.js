// Regras puras (sem DOM): navegação de semanas e intervalo de atualização automática.

// Regular 1–18; depois da 18, playoffs (1–5); antes da 1, pré-temporada (1–4). Devolve {week, type} ou null no limite.
export function stepWeek(week, type, d){
  if (!week) return null;
  let w = week + d, t = type;
  if (t === 2 && w > 18) { t = 3; w = 1; }
  else if (t === 3 && w < 1) { t = 2; w = 18; }
  else if (t === 2 && w < 1) { t = 1; w = 4; }
  else if (t === 1 && w > 4) { t = 2; w = 1; }
  else if ((t === 3 && w > 5) || (t === 1 && w < 1)) return null;
  return {week: w, type: t};
}

export const validDate = d => d instanceof Date && !Number.isNaN(d.getTime());

const MIN = 60e3, HOUR = 3600e3;

// Quanto esperar (ms) até a próxima atualização; 0 = nenhuma.
// 30 s com jogo ao vivo; 5 min se algum jogo começa em até 2 h (ou deveria ter começado há menos de 12 h); 60 s depois de um erro;
// com jogos mais adiante, acorda quando a janela de 2 h abre (no máximo 30 min), para a página aberta não ficar parada.
export function pollDelay({view = 'list', games = [], detail = null, error = false, hidden = false, now = Date.now()} = {}){
  if (hidden) return 0;
  if (error) return 60 * 1000;
  const list = view === 'game' ? (detail ? [detail.game] : []) : view === 'standings' ? [] : games;
  if (list.some(g => g.state === 'in')) return 30 * 1000;
  const pre = list.filter(g => g.state === 'pre' && validDate(g.date));
  if (pre.some(g => g.date - now < 2 * HOUR && g.date - now > -12 * HOUR)) return 5 * MIN;   // até 12 h depois da hora: início atrasado
  const ahead = pre.map(g => g.date - now).filter(x => x >= 2 * HOUR);
  if (!ahead.length) return 0;
  return Math.min(30 * MIN, Math.max(MIN, Math.min(...ahead) - 2 * HOUR));
}
