use std::{
    fs,
    path::{Path, PathBuf},
};

#[derive(Debug, Eq, PartialEq)]
pub struct DiscoveryPreview {
    pub documentation_files: Vec<PathBuf>,
    pub start_page: Option<PathBuf>,
}

pub struct DocumentDiscovery;
impl DocumentDiscovery {
    pub fn preview(source_path: impl AsRef<Path>) -> DiscoveryPreview {
        let mut files = Vec::new();
        visit(source_path.as_ref(), &mut files);
        files.sort();
        let start_page = ["README.md", "index.md", "README.mdx", "index.mdx"]
            .iter()
            .map(|name| source_path.as_ref().join(name))
            .find(|path| path.is_file());
        DiscoveryPreview {
            documentation_files: files,
            start_page,
        }
    }
}
fn visit(path: &Path, files: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(path) else {
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
            visit(&path, files);
        } else if path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| matches!(ext, "md" | "mdx"))
        {
            files.push(path);
        }
    }
}
