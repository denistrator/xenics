pub mod commands;
pub mod core;
pub mod desktop;
pub mod diagnostics;
pub mod documents;
pub mod filesystem;
pub mod git;
pub mod persistence;
pub mod tasks;

use std::sync::Arc;
use tauri::{Emitter, Manager};

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
            let app_handle = app.handle().clone();
            let event_sink: tasks::TaskEventSink = Arc::new(move |event| {
                let event_name = format!("task://{}", event.task_id.0);
                let _ = app_handle.emit(&event_name, event);
            });
            app.manage(
                commands::AppState::open_with_event_sink(data_dir, Some(event_sink))
                    .map_err(std::io::Error::other)?,
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_sources,
            commands::add_local_source,
            commands::open_source_folder,
            commands::open_source_website,
            commands::download_source,
            commands::start_download_source,
            commands::update_source,
            commands::start_update_source,
            commands::remove_source,
            commands::search_documents,
            commands::read_document,
            commands::deep_links::parse_deep_link,
            commands::organization::list_bookmarks,
            commands::organization::save_bookmark,
            commands::organization::create_collection,
            commands::organization::create_tag,
            commands::organization::list_collections,
            commands::organization::list_tags,
            commands::organization::get_settings,
            commands::organization::update_settings,
            commands::organization::get_reader_session,
            commands::organization::save_reader_session,
            desktop::external_actions::open_external_url,
            desktop::external_actions::open_external_folder,
            commands::tasks::get_tasks,
            commands::tasks::cancel_task,
            commands::tasks::retry_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
