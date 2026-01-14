const CACHE_NAME = 'totp-v1';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    'https://cdn.jsdelivr.net/npm/otpauth@9/dist/otpauth.umd.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(fetchResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    if (event.request.url.startsWith('http')) {
                        cache.put(event.request, fetchResponse.clone());
                    }
                    return fetchResponse;
                });
            });
        })
    );
});
