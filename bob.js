// service-worker.js (eller bob.js)

// Navn på cachen (versjonsnummer er lurt for oppdateringer)
const CACHE_NAME = 'fit-g4fl-cache-v1';

// Filer som skal mellomlagres for offline bruk
// VIKTIG: Oppdater denne listen hvis du legger til/endrer viktige filer!
const urlsToCache = [
  '.', // Betyr rotmappen (Index.html)
  'index.html',
  // CSS (hvis du hadde en separat fil, legg den til her)
  // 'style.css',
  // JavaScript-filer
  'Script Level names.js',
  'Script 1.js',
  'Script 2.js', // <--- LAGT TIL HER
  'Script 3.js',
  'Script 4.js',
  'Script 5.js',
  'Script 6.js',
  'Script 7.js',
  'Script 8.js',
  'Script 9.js',
  'Script 10.js',
  // Eventuelle ikonfiler (viktig for "Legg til på startskjerm")
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  // Andre viktige ressurser (f.eks. logo, fonter lastet lokalt)
  // 'logo.png',
  // Eksterne ressurser (CDN) KAN IKKE caches pålitelig på denne måten
  // så vi lar nettleseren håndtere dem når online.
];

// Event: Install - Kjøres når service workeren installeres
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  // Vent til mellomlagring er fullført
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Opened cache:', CACHE_NAME);
        // Legg til alle definerte filer i cachen
        // Viktig: Sørg for at ALLE filene i urlsToCache faktisk finnes,
        // ellers vil installasjonen feile her!
        return cache.addAll(urlsToCache).then(() => {
            console.log('[Service Worker] Files successfully cached.');
        }).catch(error => {
            console.error('[Service Worker] Failed to cache some files during install. Check paths in urlsToCache! Error:', error);
            // Kast feilen videre for å signalisere at installasjonen feilet
            throw error;
        });
      })
      .then(() => {
        // Tving den nye service workeren til å bli aktiv umiddelbart
        // (ellers må brukeren lukke alle faner av siden først)
        console.log('[Service Worker] Installation successful, skipping waiting.');
        return self.skipWaiting();
      })
      .catch(error => {
        // Logg at installasjonen feilet overordnet
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Event: Activate - Kjøres når service workeren aktiveres
// Her kan man rydde opp i gamle cacher hvis CACHE_NAME endres
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        // Ta kontroll over åpne sider umiddelbart
        console.log('[Service Worker] Claiming clients...');
        return self.clients.claim();
    })
  );
   console.log('[Service Worker] Activated.');
});

// Event: Fetch - Kjøres hver gang nettleseren prøver å hente en ressurs
self.addEventListener('fetch', event => {
  // Vi bruker en "Cache first, falling back to network"-strategi for filene vi har cachet
  // For alle andre forespørsler (f.eks. Firebase, andre API-er), går vi rett til nettverket.

  const requestUrl = new URL(event.request.url);

  // Gå rett til nettverket for ikke-GET requests eller eksterne domener/API-kall
  // (La oss være litt mer presise her for å unngå å cache for mye)
  const isExternal = requestUrl.origin !== self.location.origin;
  const isFirebase = requestUrl.hostname.includes('firebase') || requestUrl.hostname.includes('gstatic') || requestUrl.hostname.includes('google.com'); // Eller andre API-domener
  const isExtension = requestUrl.protocol.startsWith('chrome-extension');

  if (event.request.method !== 'GET' || isExtension || isFirebase || isExternal) {
    // console.log('[Service Worker] Bypassing cache for non-GET or external/API request:', event.request.url);
    // La nettleseren håndtere disse som normalt
    return;
  }

  // Strategi: Cache First, then Network (for lokale assets listet i urlsToCache)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Hvis funnet i cache, returner den
        if (cachedResponse) {
          // console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Hvis ikke funnet i cache, hent fra nettverket
        // console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // VIKTIG: Ikke legg automatisk alt fra nettverket i cachen her
            // med mindre du har en god grunn og en strategi for å oppdatere den.
            // Den opprinnelige cache.addAll() i 'install' håndterer de essensielle filene.
            return networkResponse;
          }
        ).catch(error => {
            // Håndter feil ved nettverkshenting (f.eks. vis en offline-side)
            // Dette skjer når brukeren er offline OG ressursen ikke finnes i cache.
            console.warn('[Service Worker] Fetch failed; user may be offline or resource unavailable.', error, event.request.url);
            // Du kan returnere en fallback her, f.eks. en enkel offline-side
            // if (event.request.mode === 'navigate') { // Bare for side-navigasjon
            //   // return caches.match('/offline.html'); // Krever at offline.html er cachet
            // }
            // Returner en generell feilrespons hvis ikke
             return new Response('Network error trying to fetch resource', {
               status: 408, // Request Timeout
               headers: { 'Content-Type': 'text/plain' },
             });
        });
      })
  );
}); // Slutt på fetch event listener
