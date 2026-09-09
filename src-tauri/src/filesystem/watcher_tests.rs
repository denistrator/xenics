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
