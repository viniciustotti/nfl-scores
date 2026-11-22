// Todo o acesso à ESPN (API pública, não oficial) fica aqui e devolve objetos normalizados.
// Se a ESPN mudar o formato, só este arquivo precisa de ajuste. Caminhos conferidos com respostas reais.
import {TEAMS, STAT_LABELS, LEADER_CATS} from './util.js';

const API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

// Modo demo: só para desenvolvimento (#demo ou ?demo=1). Nunca é ativado sozinho por uma falha de rede.
let demo = null;
export async function enableDemo(){ demo = (await import('./demo.js')).DEMO; }

async function getJSON(url){
  const c = new AbortController(), t = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(url, {signal:c.signal});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

// ================= Normalização =================
function normTeam(c = {}){
  const t = c.team || {}, st = TEAMS[t.abbreviation] || [];
  const recs = c.records || c.record || [];   // scoreboard: records; summary: record
  return {
    id: String(t.id ?? t.abbreviation), abbr: t.abbreviation || '?',
    name: t.shortDisplayName || t.name || st[0] || '',
    logo: t.logo || t.logos?.[0]?.href || '',
    color: '#' + (t.color || st[1] || '555555'),
    score: (c.score === undefined || c.score === '') ? null : Number(c.score?.value ?? c.score),
    record: recs[0]?.summary || recs[0]?.displayValue || '',
    winner: !!c.winner,
    linescores: (c.linescores || []).map(l => l.displayValue ?? l.value)
  };
}

function normGame(ev){
  const comp = ev.competitions?.[0] || ev, st = ev.status || comp.status || {}, type = st.type || {};
  const cs = comp.competitors || [], sit = comp.situation || {};
  const home = normTeam(cs.find(c => c.homeAway === 'home')), away = normTeam(cs.find(c => c.homeAway === 'away'));
  const state = type.state || 'pre';
  if (state === 'pre') home.score = away.score = null;
  // Se a ESPN não marcar o vencedor, deduz pelo placar.
  if (state === 'post' && !home.winner && !away.winner && home.score !== away.score)
    (home.score > away.score ? home : away).winner = true;
  return {
    id: String(ev.id ?? comp.id), date: new Date(ev.date || comp.date), state,
    detail: type.shortDetail || type.detail || '',
    venue: comp.venue?.fullName || '',
    tv: comp.broadcasts?.[0]?.names?.[0] || comp.broadcasts?.[0]?.media?.shortName || '',
    poss: sit.possession ? String(sit.possession) : null,
    dd: sit.downDistanceText || sit.shortDownDistanceText || '',
    home, away
  };
}

function normDetail(s, id){
  const g = normGame({id, competitions: s.header?.competitions || []});
  g.venue ||= s.gameInfo?.venue?.fullName || '';

  const plays = (s.scoringPlays || []).map(p => ({
    q: p.period?.number, clock: p.clock?.displayValue || '', team: p.team?.abbreviation || '',
    text: (p.text || '').trim(), h: p.homeScore, a: p.awayScore
  }));

  // Estatísticas: só as de STAT_LABELS. No pré-jogo a ESPN manda médias da temporada, que ficam de fora.
  const bt = s.boxscore?.teams || [], statsOf = ab => bt.find(t => t.team?.abbreviation === ab)?.statistics || [];
  const hs = statsOf(g.home.abbr), as = statsOf(g.away.abbr), seen = new Set();
  const stats = hs.filter(x => STAT_LABELS[x.name] && !seen.has(x.name) && seen.add(x.name)).map(x => ({
    label: STAT_LABELS[x.name], home: x.displayValue, away: as.find(y => y.name === x.name)?.displayValue ?? ''
  }));

  const L = s.leaders || [];
  const leadOf = (ab, cat) => {
    const l = L.find(t => t.team?.abbreviation === ab)?.leaders?.find(c => c.name === cat)?.leaders?.[0];
    return l ? {name: l.athlete?.displayName || '', value: l.displayValue || ''} : null;
  };
  const leaders = LEADER_CATS.map(([k, label]) => ({label, away: leadOf(g.away.abbr, k), home: leadOf(g.home.abbr, k)}))
    .filter(r => r.away || r.home);

  // Drives (opcional): mais recente primeiro.
  const dv = [...(s.drives?.previous || []), ...(s.drives?.current ? [s.drives.current] : [])];
  const drives = dv.map(d => ({
    team: d.team?.abbreviation || '', q: d.start?.period?.number, clock: d.start?.clock?.displayValue || '',
    result: d.displayResult || d.result || '', desc: d.description || '', score: !!d.isScore
  })).reverse();

  return {game: g, plays, stats, leaders, drives};
}

// ================= API pública =================
// Devolve {games, week, type, year, bye}. Sem argumentos: semana atual.
export async function getScoreboard({type, week, year} = {}){
  const raw = demo ? demo.scoreboard({type, week})
    : await getJSON(API + '/scoreboard' + (week ? `?seasontype=${type}&week=${week}&dates=${year}` : ''));
  return {
    games: (raw.events || []).map(normGame),
    week: raw.week?.number ?? null,
    type: raw.season?.type ?? null,
    year: raw.season?.year ?? null,
    bye: (raw.week?.teamsOnBye || []).map(t => t.abbreviation)
  };
}

export async function getGame(id){
  const raw = demo ? demo.summary(id) : await getJSON(API + '/summary?event=' + encodeURIComponent(id));
  return normDetail(raw, id);
}
