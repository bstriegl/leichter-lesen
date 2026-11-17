// Version bei jeder Änderung der App hochzählen
const CACHE = "leichter-lesen-v1";
const KERN = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png",
  "lib/hyph.js", "lib/pdf.min.js", "lib/pdf.worker.min.js", "lib/mammoth.browser.min.js"];
const OCR = ["ocr/tesseract.min.js", "ocr/worker.min.js", "ocr/tesseract-core-simd-lstm.wasm.js",
  "ocr/tesseract-core-lstm.wasm.js", "ocr/lang/deu.traineddata.gz", "ocr/lang/eng.traineddata.gz"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(KERN);
    try { await c.addAll(OCR); } catch (err) { /* Texterkennung wird dann beim ersten Foto geladen */ }
  }));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const gross = url.pathname.includes("/ocr/") || url.pathname.includes("/lib/");
  if (gross) {
    // Große Bibliotheken: aus dem Speicher, sonst aus dem Netz (und merken)
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => {
      const k = n.clone(); caches.open(CACHE).then(c => c.put(e.request, k)); return n;
    })));
  } else {
    // Seite selbst: erst aus dem Netz (damit Updates ankommen), ohne Netz aus dem Speicher
    e.respondWith(fetch(e.request).then(n => {
      const k = n.clone(); caches.open(CACHE).then(c => c.put(e.request, k)); return n;
    }).catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match("index.html"))));
  }
});
