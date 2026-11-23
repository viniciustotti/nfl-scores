// Tela de classificação (#standings): por divisão ou pela conferência (posição de playoffs).
import {esc, logo, banner, divName} from '../util.js';

const COLS = [['V-D', 'record'], ['PCT', 'pct'], ['PF', 'pf'], ['PA', 'pa'], ['DIF', 'diff'], ['SEQ', 'streak'],
  ['Casa', 'home'], ['Fora', 'road'], ['Div', 'div'], ['Conf', 'conf']];
const PLAYOFF_SPOTS = 7;   // por conferência; as posições 1–4 são líderes de divisão

const confOf = (st, abbr) => st.confs.find(c => c.divisions.some(d => d.teams.some(t => t.abbr === abbr)))?.name;

function table(title, teams, S, {seeds = false} = {}){
  const row = (t, i) => `<tr class="${t.abbr === S.fav ? 'me' : ''}${seeds && i === PLAYOFF_SPOTS ? ' cut' : ''}"><td><span class="tm">${seeds ? `<span class="seed">${t.seed}</span>` : ''}${logo(t)}<b>${esc(t.abbr)}</b></span></td>${COLS.map(([, k]) => `<td>${esc(t[k])}</td>`).join('')}</tr>`;
  return `<div class="card"><h3>${esc(title)}</h3><div class="scroll"><table class="st"><thead><tr><th>${seeds ? '#  Time' : 'Time'}</th>${COLS.map(([l]) => `<th>${l}</th>`).join('')}</tr></thead>
    <tbody>${teams.map(row).join('')}</tbody></table></div></div>`;
}

const seg = (items, cur, attr, label) => `<div class="seg" role="tablist" aria-label="${label}">${items.map(([k, l]) =>
  `<button role="tab" data-k="${attr}-${k}" data-${attr}="${k}" aria-selected="${k === cur}" class="${k === cur ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;

export function standingsView(S){
  const h = banner(S), st = S.standings;
  if (!st) return h + '<div class="sk"></div><div class="sk"></div>';
  if (!st.confs.length) return h + '<p class="empty">Classificação indisponível.</p>';

  const conf = st.confs.find(c => c.name === S.sconf) || st.confs.find(c => c.name === confOf(st, S.fav)) || st.confs[0];
  let body;
  if (S.sview === 'conf') {
    const teams = conf.divisions.flatMap(d => d.teams).sort((a, b) => a.seed - b.seed);
    body = table(`${conf.name} · classificação`, teams, S, {seeds: true})
      + `<p class="foot">Acima da linha tracejada: zona de playoffs (${PLAYOFF_SPOTS} vagas; 1–4 são líderes de divisão).</p>`;
  } else {
    body = conf.divisions.map(d => table(divName(d.name), d.teams, S)).join('');
  }
  return h + seg([['div', 'Divisões'], ['conf', 'Conferência']], S.sview, 'sview', 'Tipo de tabela')
    + seg(st.confs.map(c => [c.name, c.name]), conf.name, 'sconf', 'Conferência')
    + body + `<p class="foot">Temporada ${esc(st.season)} · Dados: API pública (não oficial) da ESPN.</p>`;
}
