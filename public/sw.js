// Minimal service worker — its only job is to make the app installable
// (Add to Home Screen / Install app) on Android. No offline caching: this
// app always needs a live connection to Supabase, so caching pages would
// just risk showing stale, broken screens.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // no-op: let every request go to the network as normal
});
