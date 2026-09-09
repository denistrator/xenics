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
        let title = document
            .blocks
            .iter()
            .find_map(|block| match block {
                super::ReaderBlock::Heading { text, .. } => Some(text.as_str()),
                _ => None,
            })
            .unwrap_or("");
        let prose = document.reader_text();
        self.database.replace_document(
            source_id,
            &path.display().to_string(),
            title,
            title,
            &prose,
            "",
            "",
        )?;
        Ok(true)
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
