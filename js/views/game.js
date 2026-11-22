// Tela de detalhes do jogo (#game-{id}). Recebe o estado e devolve HTML.
import {esc, cap, fmtFull, statusHTML, logo, loses, banner} from '../util.js';

function heroTeam(t, g){
  return `<div class="t${loses(t, g) ? ' lose' : ''}">${logo(t)}<span class="abbr">${esc(t.abbr)}</span>
    <span class="rec">${esc(t.name)}${t.record ? ' · ' + esc(t.record) : ''}</span></div>`;
}

function linescore(g){
  const n = Math.max(4, g.home.linescores.length, g.away.linescores.length);
  const qs = [...Array(n)].map((_, i) => i < 4 ? i + 1 : 'OT');
  const line = t => `<tr><td><b>${esc(t.abbr)}</b></td>${qs.map((_, i) => `<td>${esc(t.linescores[i] ?? '–')}</td>`).join('')}<td><b>${t.score ?? 0}</b></td></tr>`;
  return `<div class="card"><h3>Placar por quarto</h3><div class="scroll"><table><thead><tr><th>Time</th>${qs.map(q => `<th>${q}</th>`).join('')}<th>T</th></tr></thead>
    <tbody>${line(g.away)}${line(g.home)}</tbody></table></div></div>`;
}

function scoringPlays(plays){
  return `<div class="card"><h3>Pontuações</h3><ul class="plays">${plays.map(p => `<li>
    <span class="when">${p.q}º Q ${esc(p.clock)}</span><span><b>${esc(p.team)}</b> ${esc(p.text)}</span>
    <span class="sc">${esc(p.a)}–${esc(p.h)}</span></li>`).join('')}</ul></div>`;
}

function drivesCard(drives){
  return `<details class="card"><summary><h3>Drives</h3></summary><ul class="plays drives">${drives.map(d => `<li>
    <span class="when">${d.q ? d.q + 'º Q ' : ''}${esc(d.clock)}</span><span><b>${esc(d.team)}</b> ${esc(d.desc)}</span>
    <span class="res${d.score ? ' scored' : ''}">${esc(d.result)}</span></li>`).join('')}</ul></details>`;
}

export function gameView(S){
  const top = `<button class="back" id="back">‹ Voltar</button>` + banner(S);
  const d = S.detail;
  if (!d) return top + '<div class="sk" style="height:180px"></div><div class="sk"></div>';
  const g = d.game, pre = g.state === 'pre';

  let h = top + `<section class="hero">${heroTeam(g.away, g)}<div class="mid">
    <div class="big">${pre ? '<i>×</i>' : `<span>${g.away.score ?? 0}</span><i>–</i><span>${g.home.score ?? 0}</span>`}</div>
    ${statusHTML(g, true)}${g.state === 'in' && g.dd ? `<span>${esc(g.dd)}</span>` : ''}</div>${heroTeam(g.home, g)}</section>`;

  // Antes do jogo: só header, info e records. As seções vazias não aparecem.
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

  return h + `<div class="card"><h3>Informações</h3><dl><dt>Início</dt><dd>${cap(fmtFull.format(g.date))}</dd>
    ${g.venue ? `<dt>Estádio</dt><dd>${esc(g.venue)}</dd>` : ''}${g.tv ? `<dt>Transmissão</dt><dd>${esc(g.tv)}</dd>` : ''}</dl></div>`;
}
