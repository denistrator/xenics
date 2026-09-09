use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

#[derive(Debug, Eq, PartialEq)]
pub struct ReconcileReport {
    pub changed_files: Vec<PathBuf>,
    pub removed_files: Vec<PathBuf>,
}

pub struct Reconciler {
    root: PathBuf,
    known: HashMap<PathBuf, (u64, u128)>,
}
impl Reconciler {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self {
            root: root.into(),
            known: HashMap::new(),
        }
    }
    pub fn scan_source(&mut self, _source_id: &str) -> ReconcileReport {
        let mut current = HashMap::new();
        collect(&self.root, &mut current);
        let changed_files = current
            .iter()
            .filter(|(path, fingerprint)| self.known.get(*path) != Some(*fingerprint))
            .map(|(path, _)| path.clone())
            .collect();
        let removed_files = self
            .known
            .keys()
            .filter(|path| !current.contains_key(*path))
            .cloned()
            .collect();
        self.known = current;
        ReconcileReport {
            changed_files,
            removed_files,
        }
    }
}
fn collect(root: &Path, files: &mut HashMap<PathBuf, (u64, u128)>) {
    let Ok(entries) = fs::read_dir(root) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| matches!(name, ".git" | "node_modules" | "target"))
        {
            continue;
        }
        if path.is_dir() {
            collect(&path, files);
        } else if path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| matches!(ext, "md" | "mdx"))
        {
            if let Ok(metadata) = fs::metadata(&path) {
                let modified = metadata
                    .modified()
                    .ok()
                    .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|duration| duration.as_nanos())
                    .unwrap_or(0);
                files.insert(path, (metadata.len(), modified));
            }
        }
    }
}
