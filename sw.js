const CACHE_NAME = 'mapzo-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/event.html',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Inter:wght@400;600&display=swap'
];

// Install Event
self.addEventListener('install', (evt) => {
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log(' caching shell assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event (Cleanup old caches)
self.addEventListener('activate', (evt) => {
    evt.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            );
        })
    );
});

// Fetch Event (Offline Fallback)
self.addEventListener('fetch', (evt) => {
    // We only want to handle GET requests
    if (evt.request.method !== 'GET') return;
    
    // Skip Firebase Firestore requests (they have their own offline persistence)
    if (evt.request.url.includes('firestore.googleapis.com')) return;

    evt.respondWith(
        fetch(evt.request).catch(() => {
            return caches.match(evt.request);
        })
    );
});