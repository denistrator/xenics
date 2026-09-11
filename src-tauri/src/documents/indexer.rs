use super::{DocumentDiscovery, DocumentParser};
use crate::{
    diagnostics::error::{ErrorCode, RetryClass, XenicsError},
    git::CancellationToken,
    persistence::SearchDb,
};
use serde::Serialize;
use std::path::PathBuf;

#[derive(Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexReport {
    pub source_id: String,
    pub indexed_files: u64,
    pub failed_files: u64,
}

pub struct Indexer<'a> {
    database: &'a SearchDb,
    root: PathBuf,
}
impl<'a> Indexer<'a> {
    pub fn new(database: &'a SearchDb, root: impl Into<PathBuf>) -> Self {
        Self {
            database,
            root: root.into(),
        }
    }
    pub fn index_source(
        &self,
        source_id: &str,
        cancellation: &CancellationToken,
    ) -> Result<IndexReport, XenicsError> {
        let mut indexed = 0;
        let mut failed = 0;
        for path in DocumentDiscovery::preview(&self.root).documentation_files {
            if cancellation.is_cancelled() {
                break;
            }
            match self.index_file(source_id, &path) {
                Ok(true) => indexed += 1,
                Ok(false) => failed += 1,
                Err(error) => return Err(error),
            }
        }
        Ok(IndexReport {
            source_id: source_id.into(),
            indexed_files: indexed,
            failed_files: failed,
        })
    }

    pub fn index_file(&self, source_id: &str, path: &PathBuf) -> Result<bool, XenicsError> {
        let Some(bytes) = std::fs::read(path).ok() else {
            return Ok(false);
        };
        let Some(document) = DocumentParser::parse(path, &bytes).ok() else {
            return Ok(false);
        };
        let headings = document
            .blocks
            .iter()
            .filter_map(|block| match block {
                super::ReaderBlock::Heading { text, .. } => Some(text.as_str()),
                _ => None,
            })
            .collect::<Vec<_>>()
            .join("\n");
        let prose = document
            .blocks
            .iter()
            .filter_map(|block| match block {
                super::ReaderBlock::Paragraph { text, .. } => Some(text.as_str()),
                super::ReaderBlock::Image { alt, .. } => Some(alt.as_str()),
                super::ReaderBlock::Table { text, .. } => Some(text.as_str()),
                _ => None,
            })
            .collect::<Vec<_>>()
            .join("\n");
        let code = document
            .blocks
            .iter()
            .filter_map(|block| match block {
                super::ReaderBlock::Code { text, .. } => Some(text.as_str()),
                _ => None,
            })
            .collect::<Vec<_>>()
            .join("\n");
        let title = document
            .blocks
            .iter()
            .find_map(|block| match block {
                super::ReaderBlock::Heading { text, .. } => Some(text.as_str()),
                _ => None,
            })
            .unwrap_or("");
        let relative_path = self.relative_path(path);
        let matches = document
            .search_records
            .iter()
            .map(|record| {
                (
                    record.text.clone(),
                    record.location.line,
                    record.location.column,
                )
            })
            .collect::<Vec<_>>();
        self.database.replace_document_with_matches(
            source_id,
            &relative_path,
            title,
            &headings,
            &prose,
            &code,
            &code,
            &matches,
        )?;
        Ok(true)
    }

    fn relative_path(&self, path: &PathBuf) -> String {
        path.strip_prefix(&self.root)
            .unwrap_or(path)
            .to_string_lossy()
            .replace('\\', "/")
    }
    pub fn retry_failed_documents(
        &self,
        source_id: &str,
        cancellation: &CancellationToken,
    ) -> Result<IndexReport, XenicsError> {
        self.index_source(source_id, cancellation)
    }
}

#[allow(dead_code)]
fn _index_error(message: &str) -> XenicsError {
    let mut error = XenicsError::new(ErrorCode::Database, RetryClass::Automatic);
    error.message = message.into();
    error
}
