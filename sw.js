const CACHE_NAME = 'msv-wealthtrack-v8';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './storage.js',
    './mock_data.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './screenshot_bolsa.png',
    './screenshot_ahorro.png',
    './screenshot_nomina.png'
];

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Install Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching shell assets');
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((keys) => {
                return Promise.all(keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
                );
            }),
            self.clients.claim() // Take control immediately
        ])
    );
});

// Fetching: Stale-While-Revalidate strategy
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // If we got a valid response, update the cache
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Network failed, nothing to update
            });

            // Return cached version immediately, or wait for network if not in cache
            return cachedResponse || fetchPromise;
        })
    );
});
