// Tela de detalhes do jogo (#game-{id}). Recebe o estado e devolve HTML.
import {esc, fullLabel, periodLabel, statusHTML, logo, loses, banner, textOn, colorDist} from '../util.js';

function heroTeam(t, g, cls){
  return `<div class="side ${cls}">${logo(t)}<b class="abbr">${esc(t.abbr)}</b><span class="nm">${esc(t.name)}</span><span class="rc">${esc(t.record)}</span></div>`;
}
function hero(g, pre){
  const a = g.away.color; let h = g.home.color;
  if (colorDist(a, h) < 90) h = g.home.alt || h;
  const sc = (t) => `<span class="${loses(t, g) ? 'lose' : ''}">${t.score ?? 0}</span>`;
  return `<section class="hero" style="--ca:${esc(a)};--ta:${textOn(a)};--ch:${esc(h)};--th:${textOn(h)}">${heroTeam(g.away, g, 'away')}<div class="mid">
    <div class="big">${pre ? '<i>×</i>' : `${sc(g.away)}<i>–</i>${sc(g.home)}`}</div>
    ${statusHTML(g, true)}${g.state === 'in' && g.dd ? `<span>${esc(g.dd)}</span>` : ''}</div>${heroTeam(g.home, g, 'home')}</section>`;
}

function linescore(g){
  const n = Math.max(4, g.home.linescores.length, g.away.linescores.length);
  const qs = [...Array(n)].map((_, i) => i < 4 ? i + 1 : periodLabel(i + 1));
  const line = t => `<tr><td><b>${esc(t.abbr)}</b></td>${qs.map((_, i) => `<td>${esc(t.linescores[i] ?? '–')}</td>`).join('')}<td><b>${t.score ?? 0}</b></td></tr>`;
  return `<div class="card"><h3>Placar por quarto</h3><div class="scroll"><table class="ls"><thead><tr><th>Time</th>${qs.map(q => `<th>${q}</th>`).join('')}<th>T</th></tr></thead>
    <tbody>${line(g.away)}${line(g.home)}</tbody></table></div></div>`;
}

function scoringPlays(plays){
  return `<div class="card"><h3>Pontuações</h3><ul class="plays">${plays.map(p => `<li>
    <span class="when">${esc(periodLabel(p.q))} ${esc(p.clock)}</span><span><b>${esc(p.team)}</b> ${esc(p.text)}</span>
    <span class="sc">${esc(p.a)}–${esc(p.h)}</span></li>`).join('')}</ul></div>`;
}

function drivesCard(drives){
  return `<details class="card"><summary><h3>Drives</h3></summary><ul class="plays drives">${drives.map(d => `<li>
    <span class="when">${esc(periodLabel(d.q))} ${esc(d.clock)}</span><span><b>${esc(d.team)}</b> ${esc(d.desc)}</span>
    <span class="res${d.score ? ' scored' : ''}">${esc(d.result)}</span></li>`).join('')}</ul></details>`;
}

// Categorias com linha de total (as demais têm um jogador só ou o total repete a linha).
const WITH_TOTAL = ['passing', 'rushing', 'receiving', 'defensive'];

function playersView(S, d){
  const g = d.game, side = sideOf(S, g), cats = d.players[side];
  const seg = `<div class="seg" role="tablist" aria-label="Time">${['away', 'home'].map(k =>
    `<button role="tab" data-k="pt-${k}" data-pteam="${k}" aria-selected="${k === side}" class="${k === side ? 'on' : ''}">${esc(g[k].abbr)}</button>`).join('')}</div>`;
  const tables = cats.map(c => `<div class="card"><h3>${esc(c.title)}</h3><div class="scroll"><table class="pt"><thead><tr><th>Jogador</th>${c.labels.map(l => `<th>${esc(l)}</th>`).join('')}</tr></thead>
    <tbody>${c.rows.map(r => `<tr><td>${esc(r.name)}${r.num ? ` <span class="num">#${esc(r.num)}</span>` : ''}</td>${r.stats.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}
    ${WITH_TOTAL.includes(c.key) && c.totals.length ? `<tr class="tot"><td>Total</td>${c.totals.map(v => `<td>${esc(v)}</td>`).join('')}</tr>` : ''}</tbody></table></div></div>`).join('');
  return seg + (tables || '<p class="empty">Sem estatísticas de jogadores ainda.</p>');
}
// Time exibido na aba Jogadores: o escolhido; senão o favorito (se joga); senão o visitante.
const sideOf = (S, g) => S.pteam || (g.home.abbr === S.fav ? 'home' : 'away');

export function gameView(S){
  const top = `<button class="back" id="back" data-k="back">‹ Voltar</button>` + banner(S);
  const d = S.detail;
  if (!d) return top + '<div class="sk" style="height:180px"></div><div class="sk"></div>';
  const g = d.game, pre = g.state === 'pre';

  let h = top + hero(g, pre);

  // Antes do jogo: só header, info e records. As seções vazias não aparecem.
  const hasPlayers = !pre && (d.players.home.length || d.players.away.length);
  const tab = hasPlayers && S.tab === 'players' ? 'players' : 'game';
  if (hasPlayers) h += `<div class="tabs" role="tablist">${[['game', 'Resumo'], ['players', 'Jogadores']].map(([k, l]) =>
    `<button role="tab" data-k="tab-${k}" data-tab="${k}" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  if (tab === 'players') return h + playersView(S, d);
  if (!pre) {
    h += linescore(g);
    if (d.plays.length) h += scoringPlays(d.plays);
    let cols = '';
    if (d.leaders.length) {
      const cell = x => x ? `${esc(x.name)}<small>${esc(x.value)}</small>` : '–';
      cols += `<div class="card"><h3>Líderes</h3><table class="lead"><thead><tr><th></th><th>${esc(g.away.abbr)}</th><th>${esc(g.home.abbr)}</th></tr></thead>
        <tbody>${d.leaders.map(r => `<tr><td>${r.label}</td><td>${cell(r.away)}</td><td>${cell(r.home)}</td></tr>`).join('')}</tbody></table></div>`;
    }
    if (d.stats.length) cols += `<div class="card"><h3>Estatísticas</h3><table><thead><tr><th></th><th>${esc(g.away.abbr)}</th><th>${esc(g.home.abbr)}</th></tr></thead>
      <tbody>${d.stats.map(s => `<tr><td>${esc(s.label)}</td><td>${esc(s.away)}</td><td>${esc(s.home)}</td></tr>`).join('')}</tbody></table></div>`;
    if (cols) h += `<div class="cols">${cols}</div>`;
    if (d.drives.length) h += drivesCard(d.drives);
  }

  return h + `<div class="card"><h3>Informações</h3><dl><dt>Início</dt><dd>${esc(fullLabel(g.date))}</dd>
    ${g.venue ? `<dt>Estádio</dt><dd>${esc(g.venue)}</dd>` : ''}${g.tv ? `<dt>Transmissão</dt><dd>${esc(g.tv)}</dd>` : ''}</dl></div>`;
}
