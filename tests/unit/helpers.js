// Apoio dos testes: carrega dados reais salvos e troca o fetch por um falso (sem rede).
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export const fixture = name => JSON.parse(readFileSync(fileURLToPath(new URL(`../fixtures/${name}.json`, import.meta.url)), 'utf8'));
export const clone = o => JSON.parse(JSON.stringify(o));

// Responde a cada URL da ESPN com o dado indicado: {scoreboard, summary, standings}.
export function mockFetch(data){
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    const u = String(url);
    const body = u.includes('/standings') ? data.standings : u.includes('/summary') ? data.summary : data.scoreboard;
    if (body === undefined) throw new TypeError('rede indisponível (simulada)');
    return {ok: true, status: 200, json: async () => body};
  };
  return calls;
}
