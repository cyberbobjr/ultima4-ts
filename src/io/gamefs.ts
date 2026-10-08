// Save files: the app data dir (Tauri) or localStorage (browser). Game resources are not read
// here: they come from the extracted assets (src/assets/store.ts).
const isTauri = "__TAURI_INTERNALS__" in window;

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
