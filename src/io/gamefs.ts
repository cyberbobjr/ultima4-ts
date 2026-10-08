// Access to the original game files (never bundled) and to save files.
const isTauri = "__TAURI_INTERNALS__" in window;

const cache = new Map<string, Uint8Array>();

export async function loadGameFile(name: string): Promise<Uint8Array> {
  const key = name.toUpperCase();
  const hit = cache.get(key);
  if (hit) return hit;
  let data: Uint8Array;
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    const buf = await invoke<ArrayBuffer>("read_game_file", { name: key });
    data = new Uint8Array(buf);
  } else {
    const res = await fetch(`/game/${key}`);
    if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
    data = new Uint8Array(await res.arrayBuffer());
  }
  cache.set(key, data);
  return data;
}

const SAVE_PREFIX = "u4save:";

export async function writeSave(name: string, data: Uint8Array): Promise<void> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("write_save_file", { name, data: Array.from(data) });
  } else {
    try { localStorage.setItem(SAVE_PREFIX + name, btoa(String.fromCharCode(...data))); } catch { /* storage unavailable */ }
  }
}

export async function readSave(name: string): Promise<Uint8Array | null> {
  try {
    if (isTauri) {
      const { invoke } = await import("@tauri-apps/api/core");
      return new Uint8Array(await invoke<ArrayBuffer>("read_save_file", { name }));
    }
    const s = localStorage.getItem(SAVE_PREFIX + name);
    if (!s) return null;
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}
