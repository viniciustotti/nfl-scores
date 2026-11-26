// Service worker mínimo: deixa o site instalável e abre a "casca" mesmo sem rede.
// Os dados (ESPN) e as fontes NUNCA passam por aqui: placar velho seria pior que erro.
const CACHE = 'nfl-shell-v5';
const SHELL = ['./', './index.html', './styles.css', './manifest.webmanifest',
  './js/app.js', './js/api.js', './js/util.js', './js/logic.js', './js/demo.js', './js/views/list.js', './js/views/game.js', './js/views/standings.js',
  './icons/icon-192.png', './icons/icon-512.png', './img/logo-light.png', './img/logo-dark.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Mesma origem: rede primeiro (atualizações do site chegam na hora), cache só se a rede falhar.
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;   // ESPN, fontes, logos: direto na rede
  e.respondWith(fetch(r, {cache: 'no-cache'}).then(res => {   // revalida (304 barato): ignora o cache de 10 min do Pages
    if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(r, copy))); }
    return res;
  }).catch(() => caches.match(r, {ignoreSearch: true}).then(hit => hit || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
