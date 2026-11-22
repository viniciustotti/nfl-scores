// Helpers: constantes, datas, formatação e pequenas peças de HTML compartilhadas pelas telas.

// ================= Constantes =================
// abreviação ESPN: [nome, cor principal, cor alternativa]
export const TEAMS = {ARI:['Cardinals','97233f','ffb612'],ATL:['Falcons','a71930','000000'],BAL:['Ravens','241773','9e7c0c'],BUF:['Bills','00338d','c60c30'],
CAR:['Panthers','0085ca','101820'],CHI:['Bears','0b162a','c83803'],CIN:['Bengals','fb4f14','000000'],CLE:['Browns','311d00','ff3c00'],
DAL:['Cowboys','003594','869397'],DEN:['Broncos','fb4f14','002244'],DET:['Lions','0076b6','b0b7bc'],GB:['Packers','203731','ffb612'],
HOU:['Texans','03202f','a71930'],IND:['Colts','002c5f','a2aaad'],JAX:['Jaguars','006778','d7a22a'],KC:['Chiefs','e31837','ffb612'],
LV:['Raiders','000000','a5acaf'],LAC:['Chargers','0080c6','ffc20e'],LAR:['Rams','003594','ffa300'],MIA:['Dolphins','008e97','fc4c02'],
MIN:['Vikings','4f2683','ffc62f'],NE:['Patriots','002244','c60c30'],NO:['Saints','d3bc8d','101820'],NYG:['Giants','0b2265','a71930'],
NYJ:['Jets','125740','ffffff'],PHI:['Eagles','004c54','a5acaf'],PIT:['Steelers','ffb612','101820'],SF:['49ers','aa0000','b3995d'],
SEA:['Seahawks','002244','69be28'],TB:['Buccaneers','d50a0a','34302b'],TEN:['Titans','4b92db','0c2340'],WSH:['Commanders','5a1414','ffb612']};
export const STAT_LABELS = {firstDowns:'First downs',totalYards:'Jardas totais',netPassingYards:'Jardas de passe',rushingYards:'Jardas de corrida',
  thirdDownEff:'3ª descida',turnovers:'Turnovers',totalPenaltiesYards:'Penalidades',possessionTime:'Posse de bola'};
export const LEADER_CATS = [['passingYards','Passe'],['rushingYards','Corrida'],['receivingYards','Recepção']];
// Estatísticas por jogador (boxscore.players): [chave ESPN, título]. Retornos de kick/punt ficam de fora.
export const PLAYER_CATS = [['passing','Passe'],['rushing','Corrida'],['receiving','Recepção'],['defensive','Defesa'],
  ['interceptions','Interceptações'],['fumbles','Fumbles'],['kicking','Chute'],['punting','Punt']];
export const POST_WEEKS = {1:'Wild Card',2:'Divisional',3:'Final de conferência',4:'Pro Bowl',5:'Super Bowl'};

// ================= DOM e texto =================
export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const store = {
  get(k, d){ try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem(k, v); } catch {} }
};

// ================= Datas (sempre no fuso do navegador) =================
export const fmtDay = new Intl.DateTimeFormat('pt-BR', {weekday:'long', day:'numeric', month:'short'});
export const fmtTime = new Intl.DateTimeFormat('pt-BR', {hour:'2-digit', minute:'2-digit'});
export const fmtFull = new Intl.DateTimeFormat('pt-BR', {weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});

// ================= Cor de destaque =================
function lum(hex){
  const n = parseInt(hex, 16);
  const c = [n >> 16, n >> 8 & 255, n & 255].map(v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}
// Cor principal do time; se for muito escura (luminância < 0.06), usa a alternativa.
export function applyAccent(fav){
  const [, p = '69be28', a] = TEAMS[fav] || [];
  const c = a && lum(p) < .06 ? a : p;
  const root = document.documentElement.style;
  root.setProperty('--accent', '#' + c);
  root.setProperty('--on-accent', lum(c) > .3 ? '#0a1117' : '#ffffff');
}

// ================= Peças de HTML compartilhadas =================
// ESPN (pt-BR) para o texto de status. `detail` é o status.type.shortDetail.
export function tr(d){
  if (!d) return 'Ao vivo';
  if (/^halftime$/i.test(d)) return 'Intervalo';
  let m = d.match(/^(\d+:\d+) - (\d)(?:st|nd|rd|th)$/); if (m) return `${m[2]}º Q · ${m[1]}`;
  m = d.match(/^End of (\d)(?:st|nd|rd|th)/i); if (m) return `Fim do ${m[1]}º Q`;
  return d.replace(/\bOT\b/, 'Prorrogação');
}
export function statusHTML(g, long){
  if (g.state === 'in') return `<span class="status live">${esc(tr(g.detail))}</span>`;
  if (g.state === 'post') return `<span class="status">${/OT/.test(g.detail) ? 'Final · prorrogação' : 'Final'}</span>`;
  const diff = g.date - Date.now();
  if (diff > 0 && diff < 2 * 3600e3) return `<span class="status">Começa em ${Math.max(1, Math.round(diff / 6e4))} min</span>`;
  return `<span class="status">${long ? cap(fmtFull.format(g.date)) : fmtTime.format(g.date)}</span>`;
}

// Logo da ESPN; se não vier na resposta, usa o padrão do CDN. Se a imagem falhar, vira um círculo com a sigla.
export const logoUrl = t => t.logo || `https://a.espncdn.com/i/teamlogos/nfl/500/${String(t.abbr).toLowerCase()}.png`;
export const logo = t => `<img class="logo" src="${esc(logoUrl(t))}" alt="" loading="lazy" data-ab="${esc(t.abbr)}" style="--tc:${esc(t.color)}">`;
export function installLogoFallback(){
  document.addEventListener('error', e => {
    const i = e.target;
    if (i.tagName === 'IMG' && i.classList.contains('logo')) {
      const s = document.createElement('span');
      s.className = 'logo'; s.style.cssText = i.style.cssText; s.textContent = i.dataset.ab;
      i.replaceWith(s);
    }
  }, true);
}

// Time perdedor de um jogo já finalizado (fica com opacidade reduzida).
export const loses = (t, g) => g.state === 'post' && !t.winner && (g.home.winner || g.away.winner);

// Avisos no topo da tela: modo demo e erro de rede.
export function banner(S){
  let h = '';
  if (S.demo) h += `<p class="notice">Modo demo: <strong>dados de exemplo</strong> (jogos e placares inventados), só para desenvolvimento.</p>`;
  if (S.error) h += `<p class="notice err">Não foi possível atualizar. Tentando novamente…</p>`;
  return h;
}
