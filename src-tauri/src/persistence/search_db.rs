use super::{database_error, migrations, RebuildReport};
use crate::diagnostics::error::XenicsError;
use rusqlite::{params, Connection};
use serde::Serialize;
use std::{path::Path, sync::Mutex};

pub struct SearchDb {
    connection: Mutex<Connection>,
}

impl SearchDb {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, XenicsError> {
        let connection = Connection::open(path).map_err(database_error)?;
        Self::initialize(connection)
    }

    pub fn open_in_memory() -> Result<Self, XenicsError> {
        Self::initialize(Connection::open_in_memory().map_err(database_error)?)
    }

    fn initialize(connection: Connection) -> Result<Self, XenicsError> {
        connection
            .pragma_update(None, "journal_mode", "WAL")
            .map_err(database_error)?;
        migrations::apply_search(&connection).map_err(database_error)?;
        Ok(Self {
            connection: Mutex::new(connection),
        })
    }

    pub fn fts5_available(&self) -> Result<bool, XenicsError> {
        let connection = self.connection.lock().expect("search database mutex");
        connection
            .query_row(
                "SELECT sqlite_compileoption_used('ENABLE_FTS5')",
                [],
                |row| row.get::<_, i64>(0),
            )
            .map(|value| value == 1)
            .map_err(database_error)
    }

    pub fn rebuild(&self, source_id: &str) -> Result<RebuildReport, XenicsError> {
        let connection = self.connection.lock().expect("search database mutex");
        let transaction = connection.unchecked_transaction().map_err(database_error)?;
        let removed = transaction
            .execute(
                "DELETE FROM documents WHERE source_id = ?1",
                params![source_id],
            )
            .map_err(database_error)?;
        transaction.commit().map_err(database_error)?;
        Ok(RebuildReport {
            source_id: source_id.to_owned(),
            documents_removed: removed as u64,
        })
    }

    pub fn journal_mode(&self) -> Result<String, XenicsError> {
        let connection = self.connection.lock().expect("search database mutex");
        connection
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))
            .map_err(database_error)
    }

    pub fn replace_document(
        &self,
        source_id: &str,
        path: &str,
        title: &str,
        headings: &str,
        prose: &str,
        code: &str,
        api_name: &str,
    ) -> Result<(), XenicsError> {
        let connection = self.connection.lock().expect("search database mutex");
        connection
            .execute(
                "DELETE FROM documents WHERE source_id = ?1 AND path = ?2",
                params![source_id, path],
            )
            .map_err(database_error)?;
        connection.execute("INSERT INTO documents(source_id,path,title,headings,prose,code,metadata,api_name) VALUES (?1,?2,?3,?4,?5,?6,'',?7)", params![source_id,path,title,headings,prose,code,api_name]).map_err(database_error)?;
        Ok(())
    }

    pub fn query_documents(&self, query: &str) -> Result<Vec<SearchHit>, XenicsError> {
        let connection = self.connection.lock().expect("search database mutex");
        let mut statement = connection.prepare("SELECT source_id, path, title, snippet(documents, 4, '<mark>', '</mark>', '…', 12), bm25(documents, 10.0, 6.0, 2.0, 1.0, 1.0, 8.0) FROM documents WHERE documents MATCH ?1 ORDER BY bm25(documents, 10.0, 6.0, 2.0, 1.0, 1.0, 8.0)").map_err(database_error)?;
        let rows = statement
            .query_map(params![query], |row| {
                Ok(SearchHit {
                    source_id: row.get(0)?,
                    path: row.get(1)?,
                    title: row.get(2)?,
                    snippet: row.get(3)?,
                    rank: row.get(4)?,
                })
            })
            .map_err(database_error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(database_error)
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub source_id: String,
    pub path: String,
    pub title: String,
    pub snippet: String,
    pub rank: f64,
}
