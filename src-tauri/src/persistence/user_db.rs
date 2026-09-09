use super::{database_error, migrations};
use crate::diagnostics::error::XenicsError;
use rusqlite::{params, Connection};
use std::{path::Path, sync::Mutex};

pub struct UserDb {
    connection: Mutex<Connection>,
}

impl UserDb {
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
        migrations::apply_user(&connection).map_err(database_error)?;
        Ok(Self {
            connection: Mutex::new(connection),
        })
    }

    pub fn insert_bookmark(
        &self,
        source_id: &str,
        ref_name: &str,
        document_path: &str,
    ) -> Result<(), XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        connection
            .execute(
                "INSERT INTO bookmarks(source_id, ref_name, document_path) VALUES (?1, ?2, ?3)",
                params![source_id, ref_name, document_path],
            )
            .map(|_| ())
            .map_err(database_error)
    }

    pub fn bookmark_count(&self) -> Result<i64, XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        connection
            .query_row("SELECT COUNT(*) FROM bookmarks", [], |row| row.get(0))
            .map_err(database_error)
    }

    pub fn journal_mode(&self) -> Result<String, XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        connection
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))
            .map_err(database_error)
    }
}
