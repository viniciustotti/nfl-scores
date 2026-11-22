// Bootstrap, roteamento por hash, polling e navegação de semanas.
import {$, TEAMS, POST_WEEKS, store, applyAccent, installLogoFallback} from './util.js';
import {getScoreboard, getGame, enableDemo} from './api.js';
import {listView} from './views/list.js';
import {gameView} from './views/game.js';

const app = $('#app');
const S = {
  demo: false, fav: store.get('favTeam', 'SEA'),
  week: null, type: null, year: null, games: [], bye: [], loaded: false,
  view: 'list', gameId: null, detail: null,
  error: false, timer: null, req: 0, fromList: false, listY: 0
};

// ================= Render =================
function render({keepScroll = true} = {}){
  const y = window.scrollY;
  app.innerHTML = S.view === 'game' ? gameView(S) : listView(S);
  if (keepScroll) window.scrollTo(0, y);   // o polling não pode jogar a página para o topo
}

function updWeek(){
  $('#wk').textContent = S.type === 3 ? (POST_WEEKS[S.week] || `Playoffs ${S.week}`)
    : S.type === 1 ? `Pré-temporada ${S.week}` : `Semana ${S.week ?? '—'}`;
}

// ================= Dados e polling =================
async function loadList(req){
  const r = await getScoreboard({type: S.type, week: S.week, year: S.year});
  if (req !== S.req) return false;           // chegou depois de uma troca de semana/tela: descarta
  S.games = r.games; S.bye = r.bye;
  if (r.week) S.week = r.week;
  if (r.type) S.type = r.type;
  if (r.year) S.year = r.year;
  S.loaded = true; updWeek();
  return true;
}

async function refresh(){
  const req = ++S.req;
  try {
    if (S.view === 'game') {
      const id = S.gameId, detail = await getGame(id);
      if (req !== S.req || id !== S.gameId) return;
      S.detail = detail;
    } else if (!await loadList(req)) return;
    S.error = false;
  } catch (e) {
    if (req !== S.req) return;
    S.error = true;
  }
  render(); schedule();
}

// 30 s com jogo ao vivo; 5 min se algum jogo começa em até 2 h; 60 s depois de um erro; senão, sem polling.
function schedule(){
  clearTimeout(S.timer);
  if (document.hidden) return;
  const list = S.view === 'game' ? (S.detail ? [S.detail.game] : []) : S.games, now = Date.now();
  const ms = S.error ? 60000
    : list.some(g => g.state === 'in') ? 30000
    : list.some(g => g.state === 'pre' && g.date - now < 2 * 3600e3 && g.date - now > -3600e3) ? 300000 : 0;
  if (ms) S.timer = setTimeout(refresh, ms);
}

// Regular 1–18; depois da 18, playoffs (1–5); antes da 1, pré-temporada (1–4).
function shiftWeek(d){
  if (!S.week) return;
  let w = S.week + d, t = S.type;
  if (t === 2 && w > 18) { t = 3; w = 1; }
  else if (t === 3 && w < 1) { t = 2; w = 18; }
  else if (t === 2 && w < 1) { t = 1; w = 4; }
  else if (t === 1 && w > 4) { t = 2; w = 1; }
  else if ((t === 3 && w > 5) || (t === 1 && w < 1)) return;
  S.week = w; S.type = t; S.games = []; S.bye = []; S.loaded = false; S.error = false;
  updWeek();
  if (S.view === 'game') { location.hash = ''; return; }   // o hashchange recarrega a lista
  render(); refresh();
}

// ================= Rotas =================
function route(){
  const m = location.hash.match(/^#game-([\w-]+)$/);
  if (m) {
    if (S.view === 'list') S.listY = window.scrollY;
    S.view = 'game'; S.gameId = m[1]; S.detail = null; S.error = false;
    render({keepScroll: false}); window.scrollTo(0, 0); refresh();
  } else {
    S.view = 'list'; S.detail = null; S.error = false;
    render({keepScroll: false}); window.scrollTo(0, S.listY); refresh();
  }
}

// ================= Init =================
const sel = $('#fav');
sel.innerHTML = Object.entries(TEAMS).sort((a, b) => a[1][0].localeCompare(b[1][0]))
  .map(([ab, [n]]) => `<option value="${ab}"${ab === S.fav ? ' selected' : ''}>★ ${n}</option>`).join('');
if (!TEAMS[S.fav]) { S.fav = 'SEA'; sel.value = 'SEA'; }
sel.addEventListener('change', () => { S.fav = sel.value; store.set('favTeam', S.fav); applyAccent(S.fav); render(); });
$('#prev').addEventListener('click', () => shiftWeek(-1));
$('#next').addEventListener('click', () => shiftWeek(1));
app.addEventListener('click', e => {
  if (e.target.closest('#back')) { if (S.fromList) history.back(); else location.hash = ''; }
  if (e.target.closest('a.game')) S.fromList = true;
});
window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(S.timer); else refresh(); });
installLogoFallback();
applyAccent(S.fav);

(async () => {
  if (/[?&]demo=1\b/.test(location.search) || location.hash === '#demo') { await enableDemo(); S.demo = true; }
  route();
})();
