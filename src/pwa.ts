// Installable web app (iPad home screen, Android): registers the service worker of public/sw.js,
// in production builds only (the dev server must always serve fresh modules). Not in Tauri.
if (import.meta.env.PROD && "serviceWorker" in navigator && !("__TAURI_INTERNALS__" in window)) {
  addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((e) => console.warn("service worker:", e));
  });
}

export {};
