// =========================================================================
// sw.js — Service Worker: يجعل التطبيق قابلاً للتثبيت (PWA) ويتيح فتحه
// حتى بدون اتصال بالإنترنت. يستخدم استراتيجية "الشبكة أولاً" حتى تظهر أي
// تحديثات جديدة تُرفع للموقع فورًا، مع الاحتفاظ بنسخة احتياطية للعمل
// بدون إنترنت إن انقطعت الشبكة.
// =========================================================================
// ملاحظة: طلبات Firebase (قراءة/كتابة الأسعار وعروض الأسعار) لا يتم
// التعامل معها هنا إطلاقًا — تمر مباشرة للشبكة كالمعتاد.

const CACHE_NAME = "stac-floor-calc-v2"; // غيّر هذا الرقم عند أي تحديث مستقبلي لإجبار تحديث الكاش

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

  // network-first: always try to get the freshest file when online,
  // so updates you deploy show up immediately without a stale cached copy.
  // falls back to the cached version only when the network request fails (offline).
  event.respondWith(
    fetch(req)
      .then(res=>{
        if(res && res.ok){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache=> cache.put(req, clone));
        }
        return res;
      })
      .catch(()=> caches.match(req))
  );
});
