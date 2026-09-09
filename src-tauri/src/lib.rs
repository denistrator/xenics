pub mod commands;
pub mod core;
pub mod desktop;
pub mod diagnostics;
pub mod documents;
pub mod filesystem;
pub mod git;
pub mod persistence;
pub mod tasks;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(feature = "e2e")]
    let builder = builder.plugin(tauri_plugin_wdio_webdriver::init());

    builder
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| std::io::Error::other(error.to_string()))?;
            app.manage(commands::AppState::open(data_dir).map_err(std::io::Error::other)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_sources,
            commands::download_source,
            commands::search_documents,
            commands::read_document,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
