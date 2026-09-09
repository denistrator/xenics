pub mod deep_links;
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
    state.user_db.list_sources().map_err(|error| error.message)
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

#[cfg(test)]
mod tests {
    use super::is_safe_document_path;

    #[test]
    fn document_paths_reject_absolute_and_cross_platform_traversal() {
        assert!(is_safe_document_path("docs/start.md"));
        assert!(!is_safe_document_path("../secret.md"));
        assert!(!is_safe_document_path(r"docs\\..\\secret.md"));
        assert!(!is_safe_document_path("/etc/passwd"));
    }
}
