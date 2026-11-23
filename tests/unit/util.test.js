import test from 'node:test';
import assert from 'node:assert/strict';
import {tr, statusHTML, periodLabel, dayLabel, fullLabel, esc, divName, textOn, colorDist, loses, banner} from '../../js/util.js';

const g = (over = {}) => ({state: 'pre', status: 'STATUS_SCHEDULED', detail: '', date: new Date('2099-01-01T18:00:00Z'), home: {}, away: {}, ...over});

test('tr: textos de status da ESPN em pt-BR', () => {
  assert.equal(tr('5:12 - 4th'), '4º Q 5:12');
  assert.equal(tr('Halftime'), 'Intervalo');
  assert.equal(tr('End of 3rd'), 'Fim do 3º Q');
  assert.equal(tr('End of 1st Quarter'), 'Fim do 1º Q');
  assert.equal(tr(''), 'Ao vivo');
  assert.match(tr('3:10 - OT'), /Prorrogação/);
});
test('statusHTML: ao vivo, final e prorrogação', () => {
  assert.match(statusHTML(g({state: 'in', detail: '5:12 - 4th'})), /status live.*4º Q 5:12/);
  assert.match(statusHTML(g({state: 'post', detail: 'Final'})), />Final</);
  assert.match(statusHTML(g({state: 'post', detail: 'Final/OT'})), /Final, prorrogação/);
});
test('statusHTML: começa em N min quando falta menos de 2 h', () => {
  const soon = g({date: new Date(Date.now() + 25 * 60e3)});
  assert.match(statusHTML(soon), /Começa em (24|25) min/);
});
test('statusHTML: jogo adiado, cancelado ou atrasado não aparece como Final nem como normal', () => {
  assert.match(statusHTML(g({state: 'post', status: 'STATUS_POSTPONED'})), />Adiado</);
  assert.match(statusHTML(g({state: 'post', status: 'STATUS_CANCELED'})), />Cancelado</);
  assert.match(statusHTML(g({state: 'pre', status: 'STATUS_DELAYED'})), />Atrasado</);
  assert.match(statusHTML(g({state: 'in', status: 'STATUS_SUSPENDED'})), />Suspenso</);
});
test('statusHTML: data inválida não lança erro', () => {
  assert.match(statusHTML(g({date: new Date(undefined)})), /Horário a definir/);
  assert.match(statusHTML(g({date: new Date(undefined)}), true), /Horário a definir/);
});
test('periodLabel: prorrogação (OT, OT2) não vira "5º Q" e período ausente não vira "undefined"', () => {
  assert.equal(periodLabel(1), '1º Q');
  assert.equal(periodLabel(4), '4º Q');
  assert.equal(periodLabel(5), 'OT');
  assert.equal(periodLabel(6), 'OT2');
  assert.equal(periodLabel(undefined), '');
});
test('dayLabel e fullLabel: data inválida vira texto, nunca exceção', () => {
  assert.equal(dayLabel(new Date(undefined)), 'Data a definir');
  assert.equal(fullLabel(new Date(undefined)), 'A definir');
  assert.match(dayLabel(new Date('2026-11-22T18:00:00Z')), /^Domingo/);
});
test('esc: escapa HTML e trata nulos', () => {
  assert.equal(esc('<img src=x onerror="a()">'), '&lt;img src=x onerror=&quot;a()&quot;&gt;');
  assert.equal(esc("it's & co"), 'it&#39;s &amp; co');
  assert.equal(esc(null), '');
  assert.equal(esc(0), '0');
});
test('divName: divisões em pt-BR', () => {
  assert.equal(divName('AFC East'), 'AFC Leste');
  assert.equal(divName('NFC West'), 'NFC Oeste');
  assert.equal(divName('NFC North'), 'NFC Norte');
  assert.equal(divName('NFC South'), 'NFC Sul');
});
test('textOn e colorDist', () => {
  assert.equal(textOn('#ffffff'), '#0a1117');
  assert.equal(textOn('#002244'), '#ffffff');
  assert.equal(colorDist('#000000', '#000000'), 0);
  assert.ok(colorDist('#000000', '#ffffff') > 400);
});
test('loses: só o perdedor de um jogo finalizado', () => {
  const game = {state: 'post', home: {winner: true}, away: {winner: false}};
  assert.equal(loses(game.away, game), true);
  assert.equal(loses(game.home, game), false);
  assert.equal(loses({winner: false}, {state: 'in', home: {}, away: {}}), false);
});
test('banner: mostra a hora dos últimos dados só quando existe', () => {
  assert.match(banner({error: true, updatedAt: Date.parse('2026-11-22T15:42:00Z')}), /Mostrando dados de/);
  assert.doesNotMatch(banner({error: true, updatedAt: null}), /Mostrando dados/);
  assert.match(banner({demo: true}), /Modo demo/);
  assert.equal(banner({}), '');
});
