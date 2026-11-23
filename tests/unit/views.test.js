import test from 'node:test';
import assert from 'node:assert/strict';
import {getScoreboard, getGame, getStandings} from '../../js/api.js';
import {listView, arrange} from '../../js/views/list.js';
import {gameView} from '../../js/views/game.js';
import {standingsView} from '../../js/views/standings.js';
import {fixture, clone, mockFetch} from './helpers.js';

const base = {demo: false, error: false, updatedAt: null, fav: 'SEA', tab: 'game', pteam: null, sview: 'div', sconf: null};
async function listState(over = {}, sb = fixture('scoreboard')){
  mockFetch({scoreboard: sb}); const r = await getScoreboard();
  return {...base, loaded: true, games: r.games, bye: r.bye, ...over};
}
async function gameState(summary, over = {}){ mockFetch({summary}); return {...base, detail: await getGame('x'), ...over}; }
const idx = (html, s) => { const i = html.indexOf(s); assert.notEqual(i, -1, `faltou: ${s}`); return i; };

test('lista: favorito de folga mostra o aviso em uma linha, com o nome do time', async () => {
  const html = listView(await listState());
  assert.match(html, /Os Seahawks estão de folga nesta semana\./);
  assert.doesNotMatch(html, /class="g fav"/);
});
test('lista: blocos na ordem Ao vivo, Próximos, Finalizados, com o dia como subtítulo', async () => {
  const html = listView(await listState());
  assert.ok(idx(html, '>Ao vivo<') < idx(html, '>Próximos<') && idx(html, '>Próximos<') < idx(html, '>Finalizados<'));
  assert.match(html, /<h3 class="day">/);
  assert.doesNotMatch(html, /·/, 'sem pontos do meio nos títulos');
});
test('lista: o jogo do favorito vira cartão, vem primeiro e sai dos outros blocos', async () => {
  const html = listView(await listState({fav: 'SF'}));
  assert.ok(idx(html, 'class="g fav"') < idx(html, '>Próximos<'));
  assert.match(html, /aria-label="Seu time: /);
  assert.doesNotMatch(html, />Ao vivo</, 'o único jogo ao vivo é o do favorito');
});
test('lista: arrange separa favorito, ao vivo, próximos e finalizados', async () => {
  const s = await listState({fav: 'CHI'});
  const a = arrange(s.games, 'CHI');
  assert.deepEqual(a.fav.map(g => g.id), ['401873071']);
  assert.deepEqual(a.live.map(g => g.id), ['401873077']);
  assert.deepEqual(a.pre.map(g => g.id), ['401873078']);
  assert.deepEqual(a.post.map(g => g.id), ['401873066']);
});
test('lista: data inválida não derruba a tela', async () => {
  const sb = clone(fixture('scoreboard')); delete sb.events.find(e => e.id === '401873078').date;
  const html = listView(await listState({}, sb));
  assert.match(html, /Data a definir/); assert.match(html, /Horário a definir/);
});
test('lista: jogo adiado aparece como Adiado, não como Final', async () => {
  const sb = clone(fixture('scoreboard'));
  sb.events.find(e => e.id === '401873078').status.type = {name: 'STATUS_POSTPONED', state: 'post', shortDetail: 'Postponed', detail: 'Postponed'};
  const html = listView(await listState({}, sb));
  assert.match(html, />Adiado</);
});
test('lista: semana vazia e carregamento', async () => {
  assert.match(listView({...base, loaded: true, games: [], bye: []}), /Nenhum jogo nesta semana/);
  assert.match(listView({...base, loaded: false, games: [], bye: []}), /class="sk"/);
});
test('lista: erro mostra o aviso com a hora dos últimos dados, sem dados inventados', async () => {
  const html = listView(await listState({error: true, updatedAt: Date.now()}));
  assert.match(html, /Mostrando dados de .*Não foi possível atualizar/);
  assert.doesNotMatch(html, /Modo demo/);
});

test('detalhe: finalizado tem abas Resumo/Jogadores, hero com cores dos dois times e placar por quarto', async () => {
  const html = gameView(await gameState(fixture('summary-post')));
  assert.match(html, />Resumo</); assert.match(html, />Jogadores</);
  assert.match(html, /class="hero" style="--ca:#[0-9a-f]{6};--ta:#[0-9a-f]{6};--ch:#[0-9a-f]{6};--th:#[0-9a-f]{6}"/i);
  assert.match(html, /Placar por quarto/);
  assert.match(html, /Pontuações/); assert.match(html, /Informações/);
});
test('detalhe: pré-jogo mostra só topo e informações, sem abas', async () => {
  const html = gameView(await gameState(fixture('summary-pre')));
  assert.doesNotMatch(html, /class="tabs"/); assert.doesNotMatch(html, /Placar por quarto/);
  assert.match(html, /Informações/);
});
test('detalhe: aba Jogadores mostra as tabelas do time escolhido', async () => {
  const s = await gameState(fixture('summary-post'), {tab: 'players', pteam: 'home'});
  const html = gameView(s);
  for (const t of ['Passe', 'Corrida', 'Recepção', 'Defesa', 'Interceptações', 'Chute', 'Punt']) assert.match(html, new RegExp(`<h3>${t}</h3>`));
  assert.match(html, /data-pteam="home" aria-selected="true"/);
  assert.match(html, /Total/);
});
test('detalhe: prorrogação aparece como OT e Prorrog., nunca "5º Q" nem "undefined"', async () => {
  const s = clone(fixture('summary-post'));
  s.header.competitions[0].competitors.forEach(c => c.linescores.push({displayValue: '3'}));
  s.scoringPlays.push({...s.scoringPlays[0], period: {number: 5}}, {...s.scoringPlays[0], period: undefined});
  const html = gameView(await gameState(s));
  assert.match(html, /<th>OT<\/th>/); assert.match(html, /Prorrog\. /);
  assert.doesNotMatch(html, /5º Q/); assert.doesNotMatch(html, /undefined/);
});
test('detalhe: duas prorrogações viram OT e OT2', async () => {
  const s = clone(fixture('summary-post'));
  s.header.competitions[0].competitors.forEach(c => c.linescores.push({displayValue: '3'}, {displayValue: '0'}));
  const html = gameView(await gameState(s));
  assert.match(html, /<th>OT<\/th><th>OT2<\/th>/);
});
test('detalhe: data inválida vira "A definir" e não lança erro', async () => {
  const s = clone(fixture('summary-pre')); delete s.header.competitions[0].date;
  assert.match(gameView(await gameState(s)), /A definir/);
});
test('detalhe: carregando mostra o esqueleto e o botão voltar', () => {
  const html = gameView({...base, detail: null});
  assert.match(html, /id="back"/); assert.match(html, /class="sk"/);
});

test('classificação: divisões em pt-BR, time favorito destacado e colunas secundárias marcadas', async () => {
  mockFetch({standings: fixture('standings')});
  const st = await getStandings();
  const html = standingsView({...base, standings: st});
  for (const t of ['NFC Leste', 'NFC Norte', 'NFC Sul', 'NFC Oeste']) assert.match(html, new RegExp(`<h3>${t}</h3>`));
  assert.match(html, /<tr class="me">/, 'SEA está na NFC e fica destacado');
  assert.match(html, /<th class="s">PF<\/th>/); assert.match(html, /<th class="p">V-D<\/th>/);
});
test('classificação: conferência tem posições 1 a 16 e a linha de playoffs após a 7ª', async () => {
  mockFetch({standings: fixture('standings')});
  const html = standingsView({...base, standings: await getStandings(), sview: 'conf'});
  const rows = html.split('<tr class=').slice(1);
  assert.equal(rows.length, 16);
  assert.match(rows[7], /^"[^"]*cut/, 'a 8ª linha abre a zona fora dos playoffs');
  assert.ok(rows.slice(0, 7).every(r => !/^"[^"]*cut/.test(r)));
  assert.match(html, /Classificação da NFC/);
});
test('classificação: escolher AFC mostra as divisões da AFC', async () => {
  mockFetch({standings: fixture('standings')});
  const html = standingsView({...base, standings: await getStandings(), sconf: 'AFC'});
  assert.match(html, /<h3>AFC Leste<\/h3>/); assert.doesNotMatch(html, /NFC Leste/);
});

// ---- segurança: texto vindo da ESPN nunca vira HTML
const EVIL = '<img src=x onerror=alert(1)>';
test('XSS: nomes, locais e textos maliciosos são escapados na lista', async () => {
  const sb = clone(fixture('scoreboard'));
  const c = sb.events[0].competitions[0];
  c.venue.fullName = EVIL; c.broadcasts[0].names[0] = EVIL;
  c.competitors[0].team.shortDisplayName = EVIL; c.competitors[0].team.abbreviation = EVIL;
  c.competitors[0].records[0].summary = EVIL; c.situation.downDistanceText = EVIL;
  const html = listView(await listState({fav: 'ZZZ'}, sb));
  assert.doesNotMatch(html, /<img src=x onerror/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});
test('XSS: jogadores, jogadas, líderes, drives e estádio escapados no detalhe e na aba Jogadores', async () => {
  const s = clone(fixture('summary-post'));
  s.gameInfo.venue.fullName = EVIL; s.scoringPlays[0].text = EVIL;
  s.leaders[0].leaders[0].leaders[0].athlete.displayName = EVIL; s.drives.previous[0].description = EVIL;
  s.boxscore.players[0].statistics[0].athletes[0].athlete.displayName = EVIL;
  const resumo = gameView(await gameState(s));
  const jog = gameView(await gameState(s, {tab: 'players', pteam: 'away'}));
  for (const html of [resumo, jog]) assert.doesNotMatch(html, /<img src=x onerror/);
  assert.match(resumo, /&lt;img src=x/); assert.match(jog, /&lt;img src=x/);
});
test('XSS: nome do time na classificação escapado', async () => {
  const s = clone(fixture('standings'));
  s.children[1].children[3].standings.entries[0].team.abbreviation = EVIL;
  mockFetch({standings: s});
  const html = standingsView({...base, standings: await getStandings()});
  assert.doesNotMatch(html, /<img src=x onerror/);
});
