/* ============================================================
   Service Worker — يجعل الشاشة تعمل بدون إنترنت وتتحدث تلقائياً
   عند رفع نسخة جديدة على الاستضافة (غيّر رقم النسخة مع كل تحديث)
   ============================================================ */
var VERSION = 'mosque-screen-v7';

var CORE = [
  './',
  './index.html',
  './admin.html',
  './diagnostics.html',
  './js/version.js',
  './manifest.json',
  './admin.webmanifest',
  './css/style.css',
  './css/admin.css',
  './js/praytimes.js',
  './js/cities.js',
  './js/storage.js',
  './js/settings.js',
  './js/app.js',
  './js/admin.js',
  './fonts/cairo-arabic.woff2',
  './fonts/cairo-latin.woff2',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

var MEDIA = [
  './audio/adhan-makkah.mp3',
  './audio/adhan-madinah.mp3',
  './audio/adhan-quds.mp3',
  './audio/adhan-alhindi.mp3'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (cache) {
      /* الملفات الأساسية إلزامية، الصوتيات تُخزن بأفضل جهد */
      return cache.addAll(CORE).then(function () {
        return Promise.all(MEDIA.map(function (url) {
          return cache.add(url).catch(function () {});
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; /* الطلبات الخارجية (Gist...) تمر مباشرة */

  var isMedia = url.pathname.indexOf('/audio/') > -1 ||
                url.pathname.indexOf('/fonts/') > -1;

  if (isMedia) {
    /* الوسائط: من الكاش أولاً (لا تتغير) — لا نخزن الاستجابات الجزئية 206 */
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req).then(function (resp) {
          if (resp.ok && resp.status === 200) {
            var copy = resp.clone();
            caches.open(VERSION).then(function (c) { c.put(req, copy); });
          }
          return resp;
        });
      })
    );
  } else {
    /* الكود والواجهة: الشبكة أولاً حتى تصل التحديثات — وأي خطأ HTTP
       (404/5xx أثناء إعادة نشر الاستضافة) يرجع للكاش السليم بدل شاشة ميتة */
    e.respondWith(
      fetch(req).then(function (resp) {
        if (resp.ok) {
          if (resp.status === 200) {
            var copy = resp.clone();
            caches.open(VERSION).then(function (c) { c.put(req, copy); });
          }
          return resp;
        }
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          return hit || resp;
        });
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
  }
});
