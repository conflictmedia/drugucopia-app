mod ongoing;

use tauri::Manager;
use tauri_plugin_store::StoreExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Force WebKitGTK to use software rendering on Linux.
    // Without this, systems with certain GPU drivers fail to allocate
    // GBM DMA-BUF buffers and the webview renders nothing (blank window).
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            ongoing::show_ongoing_notification,
            ongoing::cancel_ongoing_notification,
            get_sync_credentials,
            set_sync_credentials,
            clear_sync_credentials,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn get_sync_credentials(app: tauri::AppHandle) -> Result<Option<(String, String)>, String> {
    let store = app.store("sync_credentials.json").map_err(|e| e.to_string())?;
    let room = store.get("room").and_then(|v| v.as_str().map(String::from));
    let pass = store.get("pass").and_then(|v| v.as_str().map(String::from));
    if let (Some(room), Some(pass)) = (room, pass) {
        Ok(Some((room, pass)))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn set_sync_credentials(app: tauri::AppHandle, room: String, pass: String) -> Result<(), String> {
    let store = app.store("sync_credentials.json").map_err(|e| e.to_string())?;
    store.set("room", serde_json::Value::String(room));
    store.set("pass", serde_json::Value::String(pass));
    store.save().map_err(|e| e.to_string())
}

#[tauri::command]
async fn clear_sync_credentials(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("sync_credentials.json").map_err(|e| e.to_string())?;
    store.delete("room");
    store.delete("pass");
    store.save().map_err(|e| e.to_string())
}
