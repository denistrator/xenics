pub mod commands;
pub mod core;
pub mod desktop;
pub mod diagnostics;
pub mod documents;
pub mod filesystem;
pub mod git;
pub mod persistence;
pub mod tasks;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(feature = "e2e")]
    let builder = builder.plugin(tauri_plugin_wdio_webdriver::init());

    builder
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
