import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, readdirSync, statSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const read = p => readFileSync(join(root, p), 'utf8');

test('service worker: tudo que ele guarda na instalação existe de verdade', () => {
  const sw = read('sw.js');
  const shell = [...sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.ok(shell.length > 10);
  for (const f of shell) { const p = f === './' ? 'index.html' : f.replace(/^\.\//, ''); assert.ok(existsSync(join(root, p)), `SHELL aponta para arquivo inexistente: ${f}`); }
});
test('service worker: escrita no cache estende a vida do worker e a versão do cache tem formato esperado', () => {
  const sw = read('sw.js');
  assert.match(sw, /e\.waitUntil\(caches\.open\(CACHE\)\.then\(c => c\.put\(r, copy\)\)\)/);
  assert.match(sw, /const CACHE = 'nfl-shell-v\d+'/);
});
test('service worker: todo módulo do site está na lista de arquivos guardados', () => {
  const sw = read('sw.js');
  const walk = d => readdirSync(join(root, d)).flatMap(n => statSync(join(root, d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]);
  for (const f of walk('js')) assert.ok(sw.includes(`./${f}`), `falta no SHELL: ${f}`);
});
test('imports: todo import relativo dos módulos aponta para um arquivo que existe', () => {
  const walk = d => readdirSync(join(root, d)).flatMap(n => statSync(join(root, d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]);
  for (const f of walk('js')) {
    const src = read(f);
    for (const m of src.matchAll(/(?:from|import\()\s*['"](\.[^'"]+)['"]/g)) assert.ok(existsSync(resolve(root, dirname(f), m[1])), `${f} importa ${m[1]}, que não existe`);
  }
});
test('manifesto: nome, ícones e arquivos existem', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.name, 'SEA Scores'); assert.equal(m.display, 'standalone');
  for (const i of m.icons) assert.ok(existsSync(join(root, i.src)), `ícone ausente: ${i.src}`);
  assert.ok(m.icons.some(i => i.purpose === 'maskable'));
});
test('repositório: nenhum segredo óbvio nos arquivos do site', () => {
  const files = ['index.html', 'sw.js', 'styles.css', 'manifest.webmanifest', 'package.json'];
  const walk = d => readdirSync(join(root, d)).flatMap(n => statSync(join(root, d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]);
  for (const f of [...files, ...walk('js')]) assert.doesNotMatch(read(f), /ghp_[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY/, f);
});
