use super::{DocumentDiscovery, DocumentParser};
use crate::{
    diagnostics::error::{ErrorCode, RetryClass, XenicsError},
    git::CancellationToken,
    persistence::SearchDb,
};
use std::path::PathBuf;

#[derive(Debug, Eq, PartialEq)]
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
            match std::fs::read(&path)
                .ok()
                .and_then(|bytes| DocumentParser::parse(&path, &bytes).ok())
            {
                Some(document) => {
                    let title = document
                        .blocks
                        .iter()
                        .find_map(|block| {
                            if let super::ReaderBlock::Heading { text, .. } = block {
                                Some(text.as_str())
                            } else {
                                None
                            }
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
                    indexed += 1;
                }
                None => failed += 1,
            }
        }
        Ok(IndexReport {
            source_id: source_id.into(),
            indexed_files: indexed,
            failed_files: failed,
        })
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
