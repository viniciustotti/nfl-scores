import test from 'node:test';
import assert from 'node:assert/strict';
import {getScoreboard, getGame, getStandings} from '../../js/api.js';
import {fixture, clone, mockFetch} from './helpers.js';

const byId = (games, id) => games.find(g => g.id === id);

test('getScoreboard: semana, folgas e quatro jogos reais normalizados', async () => {
  mockFetch({scoreboard: fixture('scoreboard')});
  const r = await getScoreboard();
  assert.equal(r.week, 11); assert.equal(r.type, 2); assert.equal(r.year, 2026);
  assert.ok(r.bye.includes('SEA'), 'Seahawks de folga');
  assert.equal(r.games.length, 4);
});
test('getScoreboard: jogo ao vivo traz posse de bola, down & distance, TV e estádio', async () => {
  mockFetch({scoreboard: fixture('scoreboard')});
  const g = byId((await getScoreboard()).games, '401873077');
  assert.equal(g.state, 'in'); assert.equal(g.status, 'STATUS_IN_PROGRESS');
  assert.equal(g.home.abbr, 'SF'); assert.equal(g.away.abbr, 'MIN');
  assert.equal(g.home.score, 7); assert.equal(g.away.score, 0);
  assert.equal(g.poss, g.away.id, 'a posse é do MIN (visitante) nesse instante: compara pelo id do time');
  assert.match(g.dd, /^2nd & 7 at MIN 13$/);
  assert.equal(g.tv, 'NBC'); assert.equal(g.venue, 'Estadio Banorte');
  assert.equal(g.home.record, '8-1');
});
test('getScoreboard: finalizado marca o vencedor; pré-jogo não mostra placar', async () => {
  mockFetch({scoreboard: fixture('scoreboard')});
  const games = (await getScoreboard()).games;
  const post = byId(games, '401873071');
  assert.equal(post.state, 'post'); assert.equal(post.home.winner, true); assert.equal(post.away.winner, false);
  assert.equal(post.home.score, 21);
  const pre = byId(games, '401873078');
  assert.equal(pre.state, 'pre'); assert.equal(pre.home.score, null); assert.equal(pre.away.score, null);
  assert.equal(pre.home.record, '3-5-1');
});
test('getScoreboard: usa a semana pedida na URL', async () => {
  const calls = mockFetch({scoreboard: fixture('scoreboard')});
  await getScoreboard({type: 3, week: 2, year: 2026});
  assert.match(calls[0], /scoreboard\?seasontype=3&week=2&dates=2026$/);
  await getScoreboard();
  assert.doesNotMatch(calls[1], /\?/);
});
test('getScoreboard: placar sem número válido vira null, nunca NaN', async () => {
  const sb = clone(fixture('scoreboard'));
  const comps = sb.events[0].competitions[0].competitors;
  comps[0].score = {displayValue: '24'}; comps[1].score = 'abc';
  mockFetch({scoreboard: sb});
  const g = (await getScoreboard()).games[0];
  assert.equal(g.home.score, 24);
  assert.equal(g.away.score, null);
});
test('getScoreboard: vencedor deduzido pelo placar quando a ESPN não marca', async () => {
  const sb = clone(fixture('scoreboard'));
  const ev = sb.events.find(e => e.id === '401873071');
  ev.competitions[0].competitors.forEach(c => delete c.winner);
  mockFetch({scoreboard: sb});
  const g = byId((await getScoreboard()).games, '401873071');
  assert.equal(g.home.winner, true); assert.equal(g.away.winner, false);
});
test('getScoreboard: jogo adiado mantém o status e não ganha vencedor', async () => {
  const sb = clone(fixture('scoreboard'));
  const ev = sb.events.find(e => e.id === '401873078');
  ev.status.type = {name: 'STATUS_POSTPONED', state: 'post', shortDetail: 'Postponed', detail: 'Postponed'};
  mockFetch({scoreboard: sb});
  const g = byId((await getScoreboard()).games, '401873078');
  assert.equal(g.status, 'STATUS_POSTPONED');
  assert.equal(g.home.winner, false); assert.equal(g.away.winner, false);
});
test('getScoreboard: evento sem data não derruba a lista', async () => {
  const sb = clone(fixture('scoreboard')); delete sb.events[0].date;
  mockFetch({scoreboard: sb});
  const games = (await getScoreboard()).games;
  assert.equal(games.length, 4);
  assert.ok(Number.isNaN(games[0].date.getTime()));
});
test('erros de rede e HTTP viram exceção (o app mostra o banner e mantém os dados)', async () => {
  mockFetch({});
  await assert.rejects(getScoreboard(), /rede indisponível/);
  globalThis.fetch = async () => ({ok: false, status: 500, json: async () => ({})});
  await assert.rejects(getScoreboard(), /HTTP 500/);
});

test('getGame (finalizado): placar por quarto, pontuações, líderes, estatísticas e drives', async () => {
  mockFetch({summary: fixture('summary-post')});
  const d = await getGame('401873071');
  const g = d.game;
  assert.equal(g.state, 'post'); assert.equal(g.venue, 'Soldier Field');
  assert.deepEqual(g.home.linescores, ['3', '13', '3', '2']); assert.deepEqual(g.away.linescores, ['0', '10', '0', '3']);
  assert.equal(g.home.record, '8-2', 'o summary usa "record" em vez de "records"');
  assert.equal(d.plays.length, 8);
  assert.deepEqual(d.plays[0], {q: 1, clock: '10:43', team: 'CHI', text: d.plays[0].text, h: 3, a: 0});
  assert.deepEqual(d.leaders.map(l => l.label), ['Passe', 'Corrida', 'Recepção']);
  assert.ok(d.leaders[0].home.name && d.leaders[0].away.name);
  const labels = d.stats.map(s => s.label);
  assert.ok(labels.includes('Jardas totais') && labels.includes('Posse de bola'));
  assert.equal(new Set(labels).size, labels.length, 'sem estatísticas repetidas');
  assert.equal(d.drives.length, 5); assert.equal(d.drives[0].q <= d.drives[4].q, false, 'mais recente primeiro');
});
test('getGame: aba Jogadores só com as categorias pedidas, por time', async () => {
  mockFetch({summary: fixture('summary-post')});
  const {players, game} = await getGame('401873071');
  for (const side of ['home', 'away']) {
    const keys = players[side].map(c => c.key);
    assert.deepEqual(keys.filter(k => ['passing', 'rushing', 'receiving', 'defensive'].includes(k)), ['passing', 'rushing', 'receiving', 'defensive']);
    assert.ok(!keys.includes('kickReturns') && !keys.includes('puntReturns'), 'retornos ficam de fora');
  }
  const passing = players.away[0];
  assert.equal(passing.title, 'Passe'); assert.ok(passing.rows[0].name); assert.ok(passing.labels.includes('YDS'));
  assert.equal(game.away.abbr, 'NO');
});
test('getGame: fumbles só lista quem teve algum lance', async () => {
  const s = clone(fixture('summary-post'));
  const f = s.boxscore.players[0].statistics.find(c => c.name === 'fumbles');
  f.athletes = [{athlete: {displayName: 'Sem Lance', jersey: '1'}, stats: ['0', '0', '0']}, {athlete: {displayName: 'Com Lance', jersey: '2'}, stats: ['1', '1', '0']}];
  mockFetch({summary: s});
  const {players, game} = await getGame('x');
  const cat = players[game.home.abbr === s.boxscore.players[0].team.abbreviation ? 'home' : 'away'].find(c => c.key === 'fumbles');
  assert.deepEqual(cat.rows.map(r => r.name), ['Com Lance']);
});
test('getGame (pré-jogo): sem estatísticas do jogo, jogadores nem pontuações', async () => {
  mockFetch({summary: fixture('summary-pre')});
  const d = await getGame('401873078');
  assert.equal(d.game.state, 'pre');
  assert.equal(d.stats.length, 0); assert.equal(d.plays.length, 0);
  assert.equal(d.players.home.length + d.players.away.length, 0);
});

test('getStandings: 2 conferências, 4 divisões, 16 times cada, sequência em pt-BR', async () => {
  mockFetch({standings: fixture('standings')});
  const st = await getStandings();
  assert.equal(st.season, '2026');
  assert.deepEqual(st.confs.map(c => c.name), ['AFC', 'NFC']);
  for (const c of st.confs) {
    assert.equal(c.divisions.length, 4);
    assert.equal(c.divisions.flatMap(d => d.teams).length, 16);
  }
  const buf = st.confs[0].divisions[0].teams.find(t => t.abbr === 'BUF');
  assert.equal(buf.streak, 'V6', 'W6 vira V6');
  assert.match(buf.record, /^\d+-\d+/);
  assert.ok(Number.isInteger(buf.seed) && buf.seed >= 1 && buf.seed <= 16);
  const seeds = st.confs[1].divisions.flatMap(d => d.teams).map(t => t.seed).sort((a, b) => a - b);
  assert.deepEqual(seeds, Array.from({length: 16}, (_, i) => i + 1), 'posições 1 a 16 sem repetir');
});
test('getStandings: sequência de derrota e empate', async () => {
  const s = clone(fixture('standings'));
  const [t1, t2] = s.children[0].children[0].standings.entries;
  t1.stats.find(x => x.name === 'streak').displayValue = 'L3';
  t2.stats.find(x => x.name === 'streak').displayValue = 'T1';
  mockFetch({standings: s});
  const teams = (await getStandings()).confs[0].divisions[0].teams;
  assert.equal(teams[0].streak, 'D3'); assert.equal(teams[1].streak, 'E1');
});
