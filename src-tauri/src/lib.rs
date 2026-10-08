use std::path::PathBuf;
use tauri::ipc::Response;

const DEFAULT_GAME_DIR: &str = r"C:\Program Files\GOG Galaxy\Games\Ultima 4";

fn game_dir() -> PathBuf {
    std::env::var("U4_GAME_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(DEFAULT_GAME_DIR))
}

/// Only plain DOS-style file names are accepted, so nothing outside the game dir is reachable.
fn valid_name(name: &str) -> bool {
    !name.is_empty() && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.') && !name.contains("..")
}

#[tauri::command]
fn read_game_file(name: String) -> Result<Response, String> {
    if !valid_name(&name) {
        return Err(format!("invalid file name: {name}"));
    }
    std::fs::read(game_dir().join(&name))
        .map(Response::new)
        .map_err(|e| format!("{name}: {e}"))
}

/// Saves go to the app data dir, never into the original install.
#[tauri::command]
fn write_save_file(app: tauri::AppHandle, name: String, data: Vec<u8>) -> Result<(), String> {
    use tauri::Manager;
    if !valid_name(&name) {
        return Err(format!("invalid file name: {name}"));
    }
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join(name), data).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_save_file(app: tauri::AppHandle, name: String) -> Result<Response, String> {
    use tauri::Manager;
    if !valid_name(&name) {
        return Err(format!("invalid file name: {name}"));
    }
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::read(dir.join(&name))
        .map(Response::new)
        .map_err(|e| format!("{name}: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_game_file, write_save_file, read_save_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
