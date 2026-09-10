pub mod deep_links;
pub mod organization;
pub mod tasks;

use crate::{
    documents::{IndexReport, Indexer, SearchService},
    filesystem::ManagedPath,
    git::{CancellationToken, GitRequest, GitService},
    persistence::{SearchDb, SourceRecord, UserDb},
    tasks::{CancellableTaskOperation, TaskManager},
};
use serde::Serialize;
use std::{fs, path::PathBuf, sync::Arc};
use tauri::State;

pub struct AppState {
    pub user_db: Arc<UserDb>,
    pub search_db: Arc<SearchDb>,
    pub library_root: PathBuf,
    pub task_manager: TaskManager,
}

impl AppState {
    pub fn open(data_dir: PathBuf) -> Result<Self, String> {
        Self::open_with_event_sink(data_dir, None)
    }

    pub fn open_with_event_sink(
        data_dir: PathBuf,
        event_sink: Option<crate::tasks::TaskEventSink>,
    ) -> Result<Self, String> {
        fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;
        let user_db =
            Arc::new(UserDb::open(data_dir.join("user.sqlite")).map_err(|error| error.message)?);
        Ok(Self {
            user_db: Arc::clone(&user_db),
            search_db: Arc::new(
                SearchDb::open(data_dir.join("search.sqlite")).map_err(|error| error.message)?,
            ),
            library_root: data_dir,
            task_manager: match event_sink {
                Some(sink) => TaskManager::new_with_store_and_event_sink(user_db, sink),
                None => TaskManager::new_with_store(user_db),
            },
        })
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadReport {
    pub source: SourceRecord,
    pub index: IndexReport,
}

#[tauri::command]
pub fn list_sources(state: State<'_, AppState>) -> Result<Vec<SourceRecord>, String> {
    state
        .user_db
        .list_sources()
        .map(|sources| {
            sources
                .into_iter()
                .map(|mut source| {
                    if let Some(path) = source.local_path.as_deref() {
                        source.disk_usage_bytes =
                            Some(directory_size(PathBuf::from(path).as_path()));
                    }
                    source
                })
                .collect()
        })
        .map_err(|error| error.message)
}

fn directory_size(path: &std::path::Path) -> u64 {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return 0;
    };
    if metadata.is_file() {
        return metadata.len();
    }
    if !metadata.is_dir() {
        return 0;
    }
    fs::read_dir(path)
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .map(|entry| directory_size(entry.path().as_path()))
        .sum()
}

#[tauri::command]
pub fn preview_reset(
    state: State<'_, AppState>,
) -> Result<crate::filesystem::ResetPreview, String> {
    let root = state
        .library_root
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let sources = state
        .user_db
        .list_sources()
        .map_err(|error| error.message)?;
    let deletable_paths = sources
        .iter()
        .filter_map(|source| source.local_path.as_ref())
        .filter_map(|path| PathBuf::from(path).canonicalize().ok())
        .filter(|path| path.starts_with(&root) && *path != root)
        .collect();
    let external_paths = sources
        .iter()
        .filter_map(|source| source.local_path.as_ref())
        .filter_map(|path| PathBuf::from(path).canonicalize().ok())
        .filter(|path| !path.starts_with(&root))
        .collect();
    let service = crate::filesystem::ResetService::new(deletable_paths, external_paths);
    Ok(service.preview())
}

#[tauri::command]
pub fn execute_reset(
    state: State<'_, AppState>,
    confirmation_token: String,
) -> Result<crate::filesystem::ResetReport, String> {
    let root = state
        .library_root
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let sources = state
        .user_db
        .list_sources()
        .map_err(|error| error.message)?;
    let deletable_paths = sources
        .iter()
        .filter_map(|source| source.local_path.as_ref())
        .filter_map(|path| PathBuf::from(path).canonicalize().ok())
        .filter(|path| path.starts_with(&root) && *path != root)
        .collect();
    let external_paths = sources
        .iter()
        .filter_map(|source| source.local_path.as_ref())
        .filter_map(|path| PathBuf::from(path).canonicalize().ok())
        .filter(|path| !path.starts_with(&root))
        .collect();
    let service = crate::filesystem::ResetService::new(deletable_paths, external_paths);
    let report = service
        .execute(&confirmation_token)
        .map_err(|error| error.message)?;
    state
        .user_db
        .clear_user_data()
        .map_err(|error| error.message)?;
    state.search_db.clear().map_err(|error| error.message)?;
    Ok(report)
}

#[tauri::command]
pub fn add_local_source(
    state: State<'_, AppState>,
    id: String,
    display_name: String,
    path: String,
    capability: Option<String>,
) -> Result<SourceRecord, String> {
    if !is_safe_source_value(&id) || !is_safe_source_value(&display_name) {
        return Err("source identity is invalid".into());
    }
    let local_path = PathBuf::from(path)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if !local_path.is_dir() {
        return Err("source folder does not exist".into());
    }
    let remote_url = GitService::open_remote(&local_path)
        .ok()
        .map(|remote| remote.url);
    state
        .user_db
        .upsert_source(
            &id,
            &display_name,
            capability.as_deref().unwrap_or("FilesOnly"),
            None,
            remote_url.as_deref(),
            Some(local_path.to_string_lossy().as_ref()),
        )
        .map_err(|error| error.message)?;
    state
        .user_db
        .find_source(&id)
        .map_err(|error| error.message)?
        .ok_or_else(|| "local source was not persisted".into())
}

#[tauri::command]
pub fn open_source_folder(state: State<'_, AppState>, source_id: String) -> Result<(), String> {
    let source = state
        .user_db
        .find_source(&source_id)
        .map_err(|error| error.message)?
        .ok_or("source is not installed")?;
    let path = source.local_path.ok_or("source has no local folder")?;
    crate::desktop::external_actions::open_external_folder(path)
}

#[tauri::command]
pub fn open_source_website(state: State<'_, AppState>, source_id: String) -> Result<(), String> {
    let source = state
        .user_db
        .find_source(&source_id)
        .map_err(|error| error.message)?
        .ok_or("source is not installed")?;
    let url = source.remote_url.ok_or("source has no remote URL")?;
    crate::desktop::external_actions::open_external_url(url)
}

#[tauri::command]
pub fn open_source_file(
    state: State<'_, AppState>,
    source_id: String,
    path: String,
) -> Result<(), String> {
    if !is_safe_document_path(&path) {
        return Err("document path is outside the source".into());
    }
    let source = state
        .user_db
        .find_source(&source_id)
        .map_err(|error| error.message)?
        .ok_or("source is not installed")?;
    let root = PathBuf::from(source.local_path.ok_or("source has no local folder")?)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let file = root
        .join(&path)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if !file.starts_with(&root) || !file.is_file() {
        return Err("source file does not exist".into());
    }
    tauri_plugin_opener::open_path(file, None::<&str>).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn open_source_file_in_editor(
    state: State<'_, AppState>,
    source_id: String,
    path: String,
) -> Result<(), String> {
    if !is_safe_document_path(&path) {
        return Err("document path is outside the source".into());
    }
    let source = state
        .user_db
        .find_source(&source_id)
        .map_err(|error| error.message)?
        .ok_or("source is not installed")?;
    let root = PathBuf::from(source.local_path.ok_or("source has no local folder")?)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let file = root
        .join(&path)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if !file.starts_with(&root) || !file.is_file() {
        return Err("source file does not exist".into());
    }
    let settings = state
        .user_db
        .get_settings()
        .map_err(|error| error.message)?;
    let editor = settings
        .get("editorCommand")
        .and_then(|value| value.as_str())
        .ok_or("configure an editor command in Settings first")?;
    crate::desktop::external_actions::open_configured_editor(editor, &file)
}

#[tauri::command]
pub fn open_source_terminal(state: State<'_, AppState>, source_id: String) -> Result<(), String> {
    let source = state
        .user_db
        .find_source(&source_id)
        .map_err(|error| error.message)?
        .ok_or("source is not installed")?;
    let root = PathBuf::from(source.local_path.ok_or("source has no local folder")?)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    crate::desktop::external_actions::open_terminal(&root)
}

#[tauri::command]
pub fn download_source(
    state: State<'_, AppState>,
    id: String,
    display_name: String,
    vendor: String,
    package: String,
    source: String,
    selected_ref: Option<String>,
    shallow: Option<bool>,
    capability: String,
) -> Result<DownloadReport, String> {
    let destination = ManagedPath::for_remote(&state.library_root, &vendor, &package)
        .map_err(|error| error.message)?;
    fs::create_dir_all(
        destination
            .parent()
            .ok_or("invalid repository destination")?,
    )
    .map_err(|error| error.to_string())?;
    let cancellation = CancellationToken::default();
    GitService::clone(
        &GitRequest {
            source: source.clone(),
            destination: destination.clone(),
            reference: selected_ref.clone(),
            shallow: shallow.unwrap_or(true),
        },
        &cancellation,
    )
    .map_err(|error| error.message)?;

    let index = Indexer::new(&state.search_db, &destination)
        .index_source(&id, &cancellation)
        .map_err(|error| error.message)?;
    state
        .user_db
        .upsert_source(
            &id,
            &display_name,
            &capability,
            selected_ref.as_deref(),
            Some(&source),
            Some(&destination.display().to_string()),
        )
        .map_err(|error| error.message)?;
    let source = state
        .user_db
        .list_sources()
        .map_err(|error| error.message)?
        .into_iter()
        .find(|record| record.id == id)
        .ok_or("downloaded source was not persisted")?;
    Ok(DownloadReport { source, index })
}

#[tauri::command]
pub fn start_download_source(
    state: State<'_, AppState>,
    id: String,
    display_name: String,
    vendor: String,
    package: String,
    source: String,
    selected_ref: Option<String>,
    shallow: Option<bool>,
    capability: String,
) -> String {
    let library_root = state.library_root.clone();
    let user_db = Arc::clone(&state.user_db);
    let search_db = Arc::clone(&state.search_db);
    let operation: CancellableTaskOperation = Arc::new(move |cancellation| {
        let destination =
            ManagedPath::for_remote(&library_root, &vendor, &package).map_err(|error| error)?;
        fs::create_dir_all(destination.parent().ok_or_else(|| {
            crate::diagnostics::error::XenicsError::new(
                crate::diagnostics::error::ErrorCode::InvalidManagedPath,
                crate::diagnostics::error::RetryClass::Permanent,
            )
        })?)
        .map_err(|error| {
            let mut result = crate::diagnostics::error::XenicsError::new(
                crate::diagnostics::error::ErrorCode::Unknown,
                crate::diagnostics::error::RetryClass::Automatic,
            );
            result.message = error.to_string();
            result
        })?;
        GitService::clone(
            &GitRequest {
                source: source.clone(),
                destination: destination.clone(),
                reference: selected_ref.clone(),
                shallow: shallow.unwrap_or(true),
            },
            &cancellation,
        )?;
        Indexer::new(&search_db, &destination).index_source(&id, &cancellation)?;
        user_db.upsert_source(
            &id,
            &display_name,
            &capability,
            selected_ref.as_deref(),
            Some(&source),
            Some(&destination.display().to_string()),
        )?;
        Ok(())
    });
    state.task_manager.submit_cancellable(operation).0
}

#[tauri::command]
pub fn update_source(
    state: State<'_, AppState>,
    source_id: String,
) -> Result<SourceRecord, String> {
    let source = state
        .user_db
        .find_source(&source_id)
        .map_err(|error| error.message)?
        .ok_or("source is not installed")?;
    let local_path = source
        .local_path
        .clone()
        .ok_or("source has no local path")?;
    ensure_local_update_allowed(&state, &local_path)?;
    let remote_url = source
        .remote_url
        .clone()
        .ok_or("source is not a Git source")?;
    let cancellation = CancellationToken::default();
    GitService::fetch(
        &GitRequest {
            source: remote_url,
            destination: PathBuf::from(&local_path),
            reference: source.selected_ref.clone(),
            shallow: source.clone_mode.as_deref() != Some("full"),
        },
        &cancellation,
    )
    .map_err(|error| error.message)?;
    GitService::fast_forward(
        &GitRequest {
            source: String::from("origin"),
            destination: PathBuf::from(&local_path),
            reference: source.selected_ref.clone(),
            shallow: source.clone_mode.as_deref() != Some("full"),
        },
        &cancellation,
    )
    .map_err(|error| error.message)?;
    Indexer::new(&state.search_db, PathBuf::from(&local_path).as_path())
        .index_source(&source_id, &cancellation)
        .map_err(|error| error.message)?;
    state
        .user_db
        .find_source(&source_id)
        .map_err(|error| error.message)?
        .ok_or_else(|| "updated source was not persisted".to_owned())
}

#[tauri::command]
pub fn start_update_source(
    state: State<'_, AppState>,
    source_id: String,
) -> Result<String, String> {
    let source = state
        .user_db
        .find_source(&source_id)
        .map_err(|error| error.message)?
        .ok_or("source is not installed")?;
    let local_path = source.local_path.ok_or("source has no local path")?;
    ensure_local_update_allowed(&state, &local_path)?;
    let remote_url = source.remote_url.ok_or("source is not a Git source")?;
    let selected_ref = source.selected_ref;
    let shallow = source.clone_mode.as_deref() != Some("full");
    let search_db = Arc::clone(&state.search_db);
    let operation: CancellableTaskOperation = Arc::new(move |cancellation| {
        GitService::fetch(
            &GitRequest {
                source: remote_url.clone(),
                destination: PathBuf::from(&local_path),
                reference: selected_ref.clone(),
                shallow,
            },
            &cancellation,
        )?;
        GitService::fast_forward(
            &GitRequest {
                source: String::from("origin"),
                destination: PathBuf::from(&local_path),
                reference: selected_ref.clone(),
                shallow,
            },
            &cancellation,
        )?;
        Indexer::new(&search_db, PathBuf::from(&local_path))
            .index_source(&source_id, &cancellation)?;
        Ok(())
    });
    Ok(state.task_manager.submit_cancellable(operation).0)
}

#[tauri::command]
pub fn remove_source(
    state: State<'_, AppState>,
    source_id: String,
    delete_managed_files: Option<bool>,
) -> Result<bool, String> {
    let source = state
        .user_db
        .find_source(&source_id)
        .map_err(|error| error.message)?
        .ok_or("source is not installed")?;
    if delete_managed_files.unwrap_or(false) {
        let local_path = source
            .local_path
            .as_deref()
            .ok_or("source has no local path")?;
        let root = state
            .library_root
            .canonicalize()
            .map_err(|error| error.to_string())?;
        let path = PathBuf::from(local_path)
            .canonicalize()
            .map_err(|error| error.to_string())?;
        if !path.starts_with(&root) || path == root {
            return Err("only Xenics-managed library folders can be deleted".into());
        }
        fs::remove_dir_all(&path).map_err(|error| error.to_string())?;
    }
    state
        .search_db
        .remove_source(&source_id)
        .map_err(|error| error.message)?;
    state
        .user_db
        .remove_source(&source_id)
        .map_err(|error| error.message)
}

#[tauri::command]
pub fn search_documents(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<crate::persistence::SearchHit>, String> {
    SearchService::new(&state.search_db)
        .query(&query)
        .map_err(|error| error.message)
}

#[tauri::command]
pub fn read_document(
    state: State<'_, AppState>,
    source_id: String,
    path: String,
) -> Result<crate::documents::ParsedDocument, String> {
    if !is_safe_document_path(&path) {
        return Err("document path is outside the source".into());
    }
    let source = state
        .user_db
        .find_source(&source_id)
        .map_err(|error| error.message)?
        .ok_or("source is not installed")?;
    let root = PathBuf::from(source.local_path.ok_or("source has no local path")?);
    let root = root.canonicalize().map_err(|error| error.to_string())?;
    let document_path = root
        .join(&path)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if !document_path.starts_with(&root) {
        return Err("document path is outside the source".into());
    }
    let bytes = fs::read(&document_path).map_err(|error| error.to_string())?;
    crate::documents::DocumentParser::parse(&document_path, &bytes)
        .map_err(|error| error.to_string())
}

fn is_safe_document_path(path: &str) -> bool {
    !path.is_empty()
        && !PathBuf::from(path).is_absolute()
        && !path
            .split(['/', '\\'])
            .any(|part| part.is_empty() || part == "..")
}

fn is_safe_source_value(value: &str) -> bool {
    !value.trim().is_empty() && !value.chars().any(|character| character.is_control())
}

fn ensure_local_update_allowed(state: &AppState, local_path: &str) -> Result<(), String> {
    let source_path = PathBuf::from(local_path)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let library_root = state
        .library_root
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if source_path.starts_with(&library_root) {
        return Ok(());
    }

    let settings = state
        .user_db
        .get_settings()
        .map_err(|error| error.message)?;
    if settings
        .get("allowLocalFolderUpdates")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false)
    {
        Ok(())
    } else {
        Err("updates for external local folders are disabled in Settings".into())
    }
}

#[cfg(test)]
mod tests {
    use super::{
        ensure_local_update_allowed, is_safe_document_path, is_safe_source_value, AppState,
    };
    use tempfile::tempdir;

    #[test]
    fn document_paths_reject_absolute_and_cross_platform_traversal() {
        assert!(is_safe_document_path("docs/start.md"));
        assert!(!is_safe_document_path("../secret.md"));
        assert!(!is_safe_document_path(r"docs\\..\\secret.md"));
        assert!(!is_safe_document_path("/etc/passwd"));
    }

    #[test]
    fn source_identity_rejects_empty_and_control_values() {
        assert!(is_safe_source_value("local-docs"));
        assert!(!is_safe_source_value("  "));
        assert!(!is_safe_source_value("docs\n"));
    }

    #[test]
    fn external_local_updates_require_explicit_setting() {
        let temp = tempdir().unwrap();
        let data_dir = temp.path().join("xenics-data");
        let external = temp.path().join("external-repo");
        std::fs::create_dir_all(&external).unwrap();
        let state = AppState::open(data_dir).unwrap();

        let error = ensure_local_update_allowed(&state, external.to_str().unwrap()).unwrap_err();
        assert!(error.contains("disabled"));

        state
            .user_db
            .update_settings(serde_json::json!({ "allowLocalFolderUpdates": true }))
            .unwrap();
        assert!(ensure_local_update_allowed(&state, external.to_str().unwrap()).is_ok());
    }
}
