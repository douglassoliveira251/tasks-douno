/* Service worker do DOUNO Tasks.
   Serve para o app poder ser instalado e abrir mesmo sem rede (só a "casca": telas, estilos e scripts).
   Os dados continuam vindo da nuvem; nada de /api, dados do Supabase ou version.json passa por aqui.
   Estratégia: rede primeiro, cópia guardada só se a rede falhar, então uma versão nova sempre vence. */
const CACHE = 'douno-tasks-v3-1';

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* script do Supabase (CDN): guardado para o app abrir sem internet; usa a cópia e atualiza em segundo plano */
  if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/@supabase/supabase-js')) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/version.json' || url.pathname === '/sw.js') return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('/app').then(h => h || caches.match('/index.html')) : undefined)))
  );
});
