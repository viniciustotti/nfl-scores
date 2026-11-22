// Tela da lista de jogos. Recebe o estado e devolve HTML.
import {esc, cap, fmtDay, statusHTML, logo, loses, banner} from '../util.js';

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

function row(t, g){
  const poss = g.state === 'in' && g.poss && g.poss === t.id ? '<span class="poss" title="Posse de bola"></span>' : '';
  return `<div class="row${loses(t, g) ? ' lose' : ''}">${logo(t)}<span class="abbr">${esc(t.abbr)}</span>
    <span class="rec">${esc(t.record)}</span>${poss}<span class="score">${t.score ?? ''}</span></div>`;
}

function card(g, fav){
  const label = `${g.away.name} ${g.away.score ?? ''} x ${g.home.name} ${g.home.score ?? ''}`;
  return `<a class="game${fav ? ' fav' : ''}" href="#game-${esc(g.id)}" aria-label="${esc(label)}">
    ${fav ? '<span class="chip">Seu time</span>' : ''}${row(g.away, g)}${row(g.home, g)}
    <div class="meta">${statusHTML(g, fav)}${g.state === 'in' && g.dd ? `<span>${esc(g.dd)}</span>` : ''}
    ${fav && g.state !== 'in' && g.venue ? `<span>${esc(g.venue)}</span>` : ''}<span class="tv">${esc(g.tv)}</span></div></a>`;
}

function byDay(list, title){
  const days = new Map();
  list.forEach(g => { const k = cap(fmtDay.format(g.date)); days.has(k) || days.set(k, []); days.get(k).push(g); });
  return [...days].map(([d, gs]) => `<h2>${title} · ${esc(d)}</h2><div class="grid">${gs.map(g => card(g)).join('')}</div>`).join('');
}

export function listView(S){
  if (!S.loaded) return banner(S) + '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
  let h = banner(S);
  if (!S.games.length) return h + '<p class="empty">Nenhum jogo nesta semana.</p>';

  const {fav, live, pre, post} = arrange(S.games, S.fav);
  h += fav.length ? fav.map(g => card(g, true)).join('')
    : `<div class="game fav"><span class="chip">Seu time</span><p style="margin:2px 0 0">${esc(S.fav)} ${S.bye.includes(S.fav)
        ? 'está de folga' : 'não joga'} nesta semana.</p></div>`;
  if (live.length) h += `<h2>Ao vivo</h2><div class="grid">${live.map(g => card(g)).join('')}</div>`;
  h += byDay(pre, 'Próximos') + byDay(post, 'Finalizados');
  return h + '<p class="foot">Dados: API pública (não oficial) da ESPN · horários no seu fuso.</p>';
}
