import test from 'node:test';
import assert from 'node:assert/strict';
import {stepWeek, pollDelay, validDate} from '../../js/logic.js';

const MIN = 60e3, HOUR = 3600e3, now = Date.parse('2026-11-22T15:00:00Z');
const game = (state, offsetMs) => ({state, date: new Date(now + offsetMs)});

test('stepWeek: avanço normal e virada de temporada regular para playoffs', () => {
  assert.deepEqual(stepWeek(11, 2, 1), {week: 12, type: 2});
  assert.deepEqual(stepWeek(18, 2, 1), {week: 1, type: 3});
  assert.deepEqual(stepWeek(1, 3, -1), {week: 18, type: 2});
});
test('stepWeek: pré-temporada e limites', () => {
  assert.deepEqual(stepWeek(1, 2, -1), {week: 4, type: 1});
  assert.deepEqual(stepWeek(4, 1, 1), {week: 1, type: 2});
  assert.equal(stepWeek(1, 1, -1), null, 'antes da pré-temporada 1 não existe');
  assert.equal(stepWeek(5, 3, 1), null, 'depois do Super Bowl não existe');
  assert.equal(stepWeek(null, null, 1), null, 'sem semana carregada');
});

test('pollDelay: 30 s com jogo ao vivo', () => {
  assert.equal(pollDelay({games: [game('in', -HOUR), game('pre', 10 * HOUR)], now}), 30e3);
});
test('pollDelay: 5 min quando um jogo começa em até 2 h (e até 1 h depois da hora)', () => {
  assert.equal(pollDelay({games: [game('pre', 90 * MIN)], now}), 5 * MIN);
  assert.equal(pollDelay({games: [game('pre', -30 * MIN)], now}), 5 * MIN);
});
test('pollDelay: com jogos mais adiante, acorda quando a janela de 2 h abre (mín. 1 min, máx. 30 min)', () => {
  assert.equal(pollDelay({games: [game('pre', 2 * HOUR + 10 * MIN)], now}), 10 * MIN);
  assert.equal(pollDelay({games: [game('pre', 2 * HOUR + 10e3)], now}), MIN, 'não menos que 1 min');
  assert.equal(pollDelay({games: [game('pre', 20 * HOUR)], now}), 30 * MIN, 'não mais que 30 min');
  assert.equal(pollDelay({games: [game('pre', 20 * HOUR), game('pre', 2 * HOUR + 5 * MIN)], now}), 5 * MIN, 'usa o jogo mais próximo');
});
test('pollDelay: sem polling quando tudo terminou, aba oculta, ou tela de classificação', () => {
  assert.equal(pollDelay({games: [game('post', -5 * HOUR)], now}), 0);
  assert.equal(pollDelay({games: [game('in', 0)], hidden: true, now}), 0);
  assert.equal(pollDelay({view: 'standings', games: [game('in', 0)], now}), 0);
});
test('pollDelay: erro tenta de novo em 60 s, mesmo sem jogos', () => {
  assert.equal(pollDelay({error: true, games: [], now}), 60e3);
});
test('pollDelay: tela de jogo usa só o jogo aberto', () => {
  assert.equal(pollDelay({view: 'game', detail: {game: game('in', 0)}, games: [], now}), 30e3);
  assert.equal(pollDelay({view: 'game', detail: {game: game('post', -HOUR)}, games: [game('in', 0)], now}), 0);
  assert.equal(pollDelay({view: 'game', detail: null, games: [game('in', 0)], now}), 0);
});
test('pollDelay: data inválida não quebra nem agenda atualização', () => {
  assert.equal(pollDelay({games: [{state: 'pre', date: new Date(undefined)}], now}), 0);
});
test('validDate', () => {
  assert.equal(validDate(new Date()), true);
  assert.equal(validDate(new Date('x')), false);
  assert.equal(validDate('2026-01-01'), false);
});
