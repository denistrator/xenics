use super::watcher::Watcher;
use std::{fs, thread, time::Duration};
use tempfile::tempdir;

#[test]
fn missed_watcher_events_are_recovered_by_reconciliation() {
    let root = tempdir().unwrap();
    let path = root.path().join("docs/start.md");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, "old").unwrap();
    let watcher = Watcher::new(root.path());
    let handle = watcher.start("docs").unwrap();
    assert_eq!(handle.reconcile("docs").changed_files.len(), 1);
    thread::sleep(Duration::from_millis(2));
    fs::write(&path, "new").unwrap();
    let report = handle.reconcile("docs");
    assert_eq!(report.changed_files, vec![path]);
}

#[test]
fn watcher_reports_supported_document_changes_and_ignores_dependencies() {
    let root = tempdir().unwrap();
    let document = root.path().join("docs/start.md");
    let dependency = root.path().join("node_modules/pkg/readme.md");
    fs::create_dir_all(document.parent().unwrap()).unwrap();
    fs::create_dir_all(dependency.parent().unwrap()).unwrap();

    let watcher = Watcher::new(root.path());
    let handle = watcher.start("docs").unwrap();
    thread::sleep(Duration::from_millis(50));
    fs::write(&document, "new").unwrap();
    fs::write(&dependency, "new").unwrap();
    let canonical_document = fs::canonicalize(&document).unwrap_or_else(|_| document.clone());

    let mut changes = Vec::new();
    for _ in 0..100 {
        changes.extend(handle.poll_changes());
        if changes.contains(&canonical_document) {
            break;
        }
        thread::sleep(Duration::from_millis(25));
    }

    assert!(changes.contains(&canonical_document));
    assert!(!changes.contains(&dependency));
}
