const CACHE_NAME = 'msv-wealthtrack-v202604101727';
const ASSETS = [
    './',
    './index.html',
    './styles.css?v=202604101727',
    './app.js?v=202604101727',
    './storage.js?v=202604101727',
    './mock_data.js?v=202604101727',
    './nextcloud.js?v=202604101727',
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

// Fetching: Mixed strategy
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isNavigation = event.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
    const isVersionedAsset = (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) && url.searchParams.has('v');

    if (isNavigation || isVersionedAsset) {
        // Stale-While-Revalidate for main page and versioned assets
        // This ensures INSTANT boot on mobile from cache, while updating in background
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => { });
                return cachedResponse || fetchPromise;
            })
        );
    } else {
        // Stale-While-Revalidate for other assets
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => { });
                return cachedResponse || fetchPromise;
            })
        );
    }
});
