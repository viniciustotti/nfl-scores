// Tela da lista de jogos: linhas densas (sem cartões); só o jogo do time favorito vira cartão.
import {TEAMS, esc, cap, fmtDay, statusHTML, logo, loses, banner} from '../util.js';

const isFav = (g, fav) => g.home.abbr === fav || g.away.abbr === fav;

// Ordem: favorito, ao vivo, próximos (por horário), finalizados (do mais recente ao mais antigo).
export function arrange(games, fav){
  const rest = games.filter(g => !isFav(g, fav)), byDate = (a, b) => a.date - b.date;
  return {
    fav: games.filter(g => isFav(g, fav)),
    live: rest.filter(g => g.state === 'in').sort(byDate),
    pre: rest.filter(g => g.state === 'pre').sort(byDate),
    post: rest.filter(g => g.state === 'post').sort((a, b) => b.date - a.date)
  };
}

function team(t, g){
  const poss = g.state === 'in' && g.poss && g.poss === t.id ? '<span class="poss" title="Posse de bola"></span>' : '';
  return `<div class="tm${loses(t, g) ? ' lose' : ''}">${logo(t)}<span class="nm"><b class="abbr">${esc(t.abbr)}</b><span class="rec">${esc(t.record)}</span>${poss}</span><span class="sc">${t.score ?? ''}</span></div>`;
}

function game(g, fav){
  const label = `${fav ? 'Seu time: ' : ''}${g.away.name} ${g.away.score ?? ''} x ${g.home.name} ${g.home.score ?? ''}`;
  const extra = fav && g.state !== 'in' && g.venue ? `<span class="sub">${esc(g.venue)}</span>` : '';
  return `<a class="g${fav ? ' fav' : ''}" href="#game-${esc(g.id)}" aria-label="${esc(label)}">
    <span class="info">${statusHTML(g, fav)}${g.tv ? `<span class="sub">${esc(g.tv)}</span>` : ''}${extra}</span>
    ${team(g.away, g)}${team(g.home, g)}${g.state === 'in' && g.dd ? `<span class="dd">${esc(g.dd)}</span>` : ''}</a>`;
}

// Um título de bloco e, dentro dele, um subtítulo por dia (opcional) com as linhas daquele dia.
function block(title, list, byDay){
  if (!list.length) return '';
  if (!byDay) return `<h2>${title}</h2><div class="rows">${list.map(g => game(g)).join('')}</div>`;
  const days = new Map();
  list.forEach(g => { const k = cap(fmtDay.format(g.date)); days.has(k) || days.set(k, []); days.get(k).push(g); });
  return `<h2>${title}</h2>` + [...days].map(([d, gs]) => `<h3 class="day">${esc(d)}</h3><div class="rows">${gs.map(g => game(g)).join('')}</div>`).join('');
}

export function listView(S){
  if (!S.loaded) return banner(S) + '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
  const h = banner(S);
  if (!S.games.length) return h + '<p class="empty">Nenhum jogo nesta semana.</p>';

  const {fav, live, pre, post} = arrange(S.games, S.fav);
  const name = TEAMS[S.fav]?.[0] || S.fav;
  const top = fav.length ? fav.map(g => game(g, true)).join('')
    : `<p class="bye">Os ${esc(name)} ${S.bye.includes(S.fav) ? 'estão de folga' : 'não jogam'} nesta semana.</p>`;
  return h + top + block('Ao vivo', live) + block('Próximos', pre, true) + block('Finalizados', post, true)
    + '<p class="foot">Dados da API pública (não oficial) da ESPN. Horários no seu fuso.</p>';
}
