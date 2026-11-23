import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export const fixture = n => JSON.parse(readFileSync(fileURLToPath(new URL(`../fixtures/${n}.json`, import.meta.url)), 'utf8'));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

// Troca a ESPN, as fontes e os logos por respostas locais. Devolve um contador de chamadas e um "modo falha".
export async function mockEspn(page, {scoreboard = fixture('scoreboard'), fail = false} = {}){
  const calls = {scoreboard: 0, summary: 0, standings: 0};
  const state = {fail};
  const json = (route, body) => route.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify(body)});
  await page.route('**/site.api.espn.com/**', route => {
    const u = route.request().url();
    if (state.fail) return route.abort('failed');
    if (u.includes('/scoreboard')) { calls.scoreboard++; const w = new URL(u).searchParams.get('week');
      return json(route, w ? {...scoreboard, week: {...scoreboard.week, number: Number(w)}} : scoreboard); }   // devolve a semana pedida
    if (u.includes('/summary')) { calls.summary++; const id = new URL(u).searchParams.get('event');
      const f = {401873071: 'summary-post', 401873078: 'summary-pre'}[id]; return f ? json(route, fixture(f)) : route.fulfill({status: 404, body: '{}'}); }
    if (u.includes('/standings')) { calls.standings++; return json(route, fixture('standings')); }
    return route.fulfill({status: 404, body: '{}'});
  });
  await page.route('**/a.espncdn.com/**', route => route.fulfill({status: 200, contentType: 'image/png', body: PNG}));
  await page.route('**/fonts.googleapis.com/**', route => route.fulfill({status: 200, contentType: 'text/css', body: ''}));
  await page.route('**/fonts.gstatic.com/**', route => route.abort());
  return {calls, state};
}

export const ORIGIN = 'http://127.0.0.1:4173';

// Junta erros de JavaScript, de console e qualquer arquivo do próprio site que falhe (404, rede).
// Só ficam de fora as requisições que os testes bloqueiam de propósito (fontes e ESPN).
export function watchErrors(page){
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/i.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('response', r => { if (r.url().startsWith(ORIGIN) && r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
  page.on('requestfailed', r => { if (r.url().startsWith(ORIGIN)) errors.push(`falhou: ${r.url()}`); });
  return errors;
}

export const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
