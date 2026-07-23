// =========================================================================
// sw.js — Service Worker: يجعل التطبيق قابلاً للتثبيت (PWA) ويتيح فتحه
// حتى بدون اتصال بالإنترنت (باستخدام آخر نسخة محفوظة من الصفحات والتنسيقات).
// =========================================================================
// ملاحظة: طلبات Firebase (قراءة/كتابة الأسعار وعروض الأسعار) لا يتم
// التعامل معها هنا إطلاقًا — تمر مباشرة للشبكة كالمعتاد، فتبقى الأسعار
// والحفظ يعملان بشكل حي طبيعي طالما هناك اتصال بالإنترنت.

const CACHE_NAME = "stac-floor-calc-v1";

const APP_SHELL = [
  "./index.html",
  "./products.html",
  "./quotation.html",
  "./style.css",
  "./defaults.js",
  "./firebase-config.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=> cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener("activate", event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=> k !== CACHE_NAME).map(k=> caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event=>{
  const req = event.request;

  // only handle same-origin GET requests for our own app files;
  // let everything else (Firebase, Google Fonts, gstatic CDN, etc.) pass straight through
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(cached=>{
      const network = fetch(req)
        .then(res=>{
          if(res && res.ok){
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache=> cache.put(req, clone));
          }
          return res;
        })
        .catch(()=> cached);
      // cache-first for instant loads, but refresh the cache in the background
      return cached || network;
    })
  );
});
