use tauri::ipc::Response;

/// Only plain DOS-style file names are accepted, so nothing outside the app data dir is reachable.
fn valid_name(name: &str) -> bool {
    !name.is_empty() && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.') && !name.contains("..")
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

/// User configuration: config.json in the app data dir (defaults live in the front end).
#[tauri::command]
fn read_config(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri::Manager;
    let file = app.path().app_data_dir().map_err(|e| e.to_string())?.join("config.json");
    match std::fs::read_to_string(file) {
        Ok(text) => Ok(Some(text)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn write_config(app: tauri::AppHandle, text: String) -> Result<(), String> {
    use tauri::Manager;
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("config.json"), text).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![write_save_file, read_save_file, read_config, write_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
