use super::reconcile::{ReconcileReport, Reconciler};
use crate::{documents::Indexer, git::CancellationToken, persistence::SearchDb};
use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher as NotifyWatcher};
use std::{
    path::{Path, PathBuf},
    sync::{mpsc, Arc, Mutex},
};

pub struct Watcher {
    root: PathBuf,
    reconciler: Arc<Mutex<Reconciler>>,
}
pub struct WatcherHandle {
    pub(crate) reconciler: Arc<Mutex<Reconciler>>,
    receiver: mpsc::Receiver<notify::Result<Event>>,
    _watcher: RecommendedWatcher,
}
impl Watcher {
    pub fn new(root: impl Into<std::path::PathBuf>) -> Self {
        let root = root.into();
        Self {
            reconciler: Arc::new(Mutex::new(Reconciler::new(&root))),
            root,
        }
    }
    pub fn start(&self, _source_id: &str) -> Result<WatcherHandle, String> {
        let (sender, receiver) = mpsc::channel();
        let mut watcher = notify::recommended_watcher(move |event| {
            let _ = sender.send(event);
        })
        .map_err(|error| error.to_string())?;
        watcher
            .watch(&self.root, RecursiveMode::Recursive)
            .map_err(|error| error.to_string())?;

        Ok(WatcherHandle {
            reconciler: Arc::clone(&self.reconciler),
            receiver,
            _watcher: watcher,
        })
    }
}
impl WatcherHandle {
    pub fn reconcile(&self, source_id: &str) -> ReconcileReport {
        self.reconciler.lock().unwrap().scan_source(source_id)
    }

    pub fn poll_changes(&self) -> Vec<PathBuf> {
        let mut changes = Vec::new();
        while let Ok(event) = self.receiver.try_recv() {
            let Ok(event) = event else { continue };
            changes.extend(
                event
                    .paths
                    .into_iter()
                    .filter(|path| is_supported_document(path) && !is_ignored_path(path)),
            );
        }
        changes.sort();
        changes.dedup();
        changes
    }

    pub fn reindex_changes(
        &self,
        source_id: &str,
        root: &Path,
        database: &SearchDb,
        cancellation: &CancellationToken,
    ) -> Result<u64, crate::diagnostics::error::XenicsError> {
        let indexer = Indexer::new(database, root);
        let mut indexed = 0;
        for path in self.poll_changes() {
            if cancellation.is_cancelled() || !path.starts_with(root) {
                continue;
            }
            if path.exists() {
                if indexer.index_file(source_id, &path)? {
                    indexed += 1;
                }
            } else if let Ok(relative_path) = path.strip_prefix(root) {
                if database.remove_document(
                    source_id,
                    &relative_path.to_string_lossy().replace('\\', "/"),
                )? {
                    indexed += 1;
                }
            }
        }
        Ok(indexed)
    }
}

fn is_supported_document(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| matches!(extension, "md" | "mdx"))
}

fn is_ignored_path(path: &Path) -> bool {
    path.components().any(|component| {
        component
            .as_os_str()
            .to_str()
            .is_some_and(|name| matches!(name, ".git" | "node_modules" | "target"))
    })
}
