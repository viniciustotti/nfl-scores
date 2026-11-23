// Bootstrap, roteamento por hash, polling e navegação de semanas.
import {$, TEAMS, POST_WEEKS, store, applyAccent, installLogoFallback} from './util.js';
import {getScoreboard, getGame, getStandings, enableDemo} from './api.js';
import {listView} from './views/list.js';
import {gameView} from './views/game.js';
import {stepWeek, pollDelay} from './logic.js';
import {standingsView} from './views/standings.js';

const app = $('#app');
const S = {
  demo: false, fav: store.get('favTeam', 'SEA'),
  week: null, type: null, year: null, games: [], bye: [], loaded: false,
  view: 'list', gameId: null, detail: null, tab: 'game', pteam: null, standings: null, sview: 'div', sconf: null,
  error: false, timer: null, req: 0, fromList: false, listY: 0
};

// ================= Render =================
function render({keepScroll = true} = {}){
  const y = window.scrollY, k = document.activeElement?.dataset?.k;   // preserva rolagem e foco do teclado
  app.innerHTML = S.view === 'game' ? gameView(S) : S.view === 'standings' ? standingsView(S) : listView(S);
  document.body.dataset.view = S.view;
  $('#nav-games').classList.toggle('on', S.view !== 'standings'); $('#nav-st').classList.toggle('on', S.view === 'standings');
  $('#nav-games').toggleAttribute('aria-current', S.view !== 'standings'); $('#nav-st').toggleAttribute('aria-current', S.view === 'standings');
  if (keepScroll) window.scrollTo(0, y);   // o polling não pode jogar a página para o topo
  if (k) app.querySelector(`[data-k="${k}"]`)?.focus({preventScroll: true});
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
    } else if (S.view === 'standings') {
      const st = await getStandings();
      if (req !== S.req) return;
      S.standings = st;
    } else if (!await loadList(req)) return;
    S.error = false; S.updatedAt = Date.now();
  } catch (e) {
    if (req !== S.req) return;
    S.error = true;
  }
  try { render(); } catch (e) { console.error(e); S.error = true; }   // uma falha ao desenhar não pode parar as atualizações
  schedule();
}

// Regras em logic.js (pollDelay); aqui só agenda.
function schedule(){
  clearTimeout(S.timer);
  const ms = pollDelay({view: S.view, games: S.games, detail: S.detail, error: S.error, hidden: document.hidden, now: Date.now()});
  if (ms) S.timer = setTimeout(refresh, ms);
}

function shiftWeek(d){
  const n = stepWeek(S.week, S.type, d);
  if (!n) return;
  S.week = n.week; S.type = n.type; S.games = []; S.bye = []; S.loaded = false; S.error = false;
  updWeek();
  if (S.view === 'game') { location.hash = ''; return; }   // o hashchange recarrega a lista
  render(); refresh();
}

// ================= Rotas =================
function route(){
  const m = location.hash.match(/^#game-([\w-]+)$/);
  if (m) {
    if (S.view === 'list') S.listY = window.scrollY;
    S.view = 'game'; S.gameId = m[1]; S.detail = null; S.error = false; S.updatedAt = null; S.tab = 'game'; S.pteam = null;
    render({keepScroll: false}); window.scrollTo(0, 0); refresh();
  } else if (location.hash === '#standings') {
    if (S.view === 'list') S.listY = window.scrollY;
    S.view = 'standings'; S.detail = null; S.error = false; S.updatedAt = null;
    render({keepScroll: false}); window.scrollTo(0, 0); refresh();
  } else {
    S.view = 'list'; S.detail = null; S.error = false; S.updatedAt = null;
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
  const tb = e.target.closest('[data-tab]'), pt = e.target.closest('[data-pteam]');
  if (tb) { S.tab = tb.dataset.tab; render(); }
  if (pt) { S.pteam = pt.dataset.pteam; render(); }
  const sv = e.target.closest('[data-sview]'), sc = e.target.closest('[data-sconf]');
  if (sv) { S.sview = sv.dataset.sview; render(); }
  if (sc) { S.sconf = sc.dataset.sconf; render(); }
});
window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(S.timer); else refresh(); });
installLogoFallback();
applyAccent(S.fav);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(e => console.warn('Service worker não registrado:', e));

(async () => {
  if (/[?&]demo=1\b/.test(location.search) || location.hash === '#demo') { await enableDemo(); S.demo = true; }
  route();
})();
