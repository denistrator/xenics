use super::reconcile::{ReconcileReport, Reconciler};
use std::sync::{Arc, Mutex};

pub struct Watcher {
    reconciler: Arc<Mutex<Reconciler>>,
}
pub struct WatcherHandle {
    pub(crate) reconciler: Arc<Mutex<Reconciler>>,
}
impl Watcher {
    pub fn new(root: impl Into<std::path::PathBuf>) -> Self {
        Self {
            reconciler: Arc::new(Mutex::new(Reconciler::new(root))),
        }
    }
    pub fn start(&self, _source_id: &str) -> Result<WatcherHandle, String> {
        Ok(WatcherHandle {
            reconciler: Arc::clone(&self.reconciler),
        })
    }
}
impl WatcherHandle {
    pub fn reconcile(&self, source_id: &str) -> ReconcileReport {
        self.reconciler.lock().unwrap().scan_source(source_id)
    }
}
