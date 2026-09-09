use super::{database_error, migrations, RebuildReport};
use crate::diagnostics::error::XenicsError;
use rusqlite::{params, Connection};
use std::{path::Path, sync::Mutex};

pub struct SearchDb { connection: Mutex<Connection> }

impl SearchDb {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, XenicsError> {
        let connection = Connection::open(path).map_err(database_error)?;
        Self::initialize(connection)
    }

    pub fn open_in_memory() -> Result<Self, XenicsError> {
        Self::initialize(Connection::open_in_memory().map_err(database_error)?)
    }

    fn initialize(connection: Connection) -> Result<Self, XenicsError> {
        connection.pragma_update(None, "journal_mode", "WAL").map_err(database_error)?;
        migrations::apply_search(&connection).map_err(database_error)?;
        Ok(Self { connection: Mutex::new(connection) })
    }

    pub fn fts5_available(&self) -> Result<bool, XenicsError> {
        let connection = self.connection.lock().expect("search database mutex");
        connection.query_row("SELECT sqlite_compileoption_used('ENABLE_FTS5')", [], |row| row.get::<_, i64>(0))
            .map(|value| value == 1).map_err(database_error)
    }

    pub fn rebuild(&self, source_id: &str) -> Result<RebuildReport, XenicsError> {
        let connection = self.connection.lock().expect("search database mutex");
        let transaction = connection.unchecked_transaction().map_err(database_error)?;
        let removed = transaction.execute("DELETE FROM documents WHERE source_id = ?1", params![source_id]).map_err(database_error)?;
        transaction.commit().map_err(database_error)?;
        Ok(RebuildReport { source_id: source_id.to_owned(), documents_removed: removed as u64 })
    }

    pub fn journal_mode(&self) -> Result<String, XenicsError> {
        let connection = self.connection.lock().expect("search database mutex");
        connection.query_row("PRAGMA journal_mode", [], |row| row.get(0)).map_err(database_error)
    }
}
