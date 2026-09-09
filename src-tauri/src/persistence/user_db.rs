use super::{database_error, migrations};
use crate::diagnostics::error::XenicsError;
use rusqlite::{params, Connection};
use serde::Serialize;
use std::{path::Path, sync::Mutex};

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceRecord {
    pub id: String,
    pub display_name: String,
    pub capability: String,
    pub selected_ref: Option<String>,
    pub clone_mode: Option<String>,
    pub local_path: Option<String>,
    pub remote_url: Option<String>,
}

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

    pub fn upsert_task_record(
        &self,
        task_id: &str,
        state: &str,
        payload_json: &str,
    ) -> Result<(), XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        connection
            .execute(
                "INSERT INTO task_records(id, state, payload_json) VALUES (?1, ?2, ?3)
                 ON CONFLICT(id) DO UPDATE SET state = excluded.state,
                 payload_json = excluded.payload_json, updated_at = CURRENT_TIMESTAMP",
                params![task_id, state, payload_json],
            )
            .map(|_| ())
            .map_err(database_error)
    }

    pub fn task_record_count(&self) -> Result<i64, XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        connection
            .query_row("SELECT COUNT(*) FROM task_records", [], |row| row.get(0))
            .map_err(database_error)
    }

    pub fn upsert_source(
        &self,
        id: &str,
        display_name: &str,
        capability: &str,
        selected_ref: Option<&str>,
        remote_url: Option<&str>,
        local_path: Option<&str>,
    ) -> Result<(), XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        connection
            .execute(
                "INSERT INTO sources(id, display_name, capability, selected_ref, clone_mode, local_path, remote_url)
                 VALUES (?1, ?2, ?3, ?4, 'shallow', ?5, ?6)
                 ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name,
                 capability = excluded.capability, selected_ref = excluded.selected_ref,
                 local_path = excluded.local_path, remote_url = excluded.remote_url,
                 updated_at = CURRENT_TIMESTAMP",
                params![id, display_name, capability, selected_ref, local_path, remote_url],
            )
            .map(|_| ())
            .map_err(database_error)
    }

    pub fn list_sources(&self) -> Result<Vec<SourceRecord>, XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        let mut statement = connection
            .prepare(
                "SELECT id, display_name, capability, selected_ref, clone_mode, local_path, remote_url
                 FROM sources ORDER BY created_at, id",
            )
            .map_err(database_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok(SourceRecord {
                    id: row.get(0)?,
                    display_name: row.get(1)?,
                    capability: row.get(2)?,
                    selected_ref: row.get(3)?,
                    clone_mode: row.get(4)?,
                    local_path: row.get(5)?,
                    remote_url: row.get(6)?,
                })
            })
            .map_err(database_error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(database_error)
    }

    pub fn find_source(&self, id: &str) -> Result<Option<SourceRecord>, XenicsError> {
        Ok(self
            .list_sources()?
            .into_iter()
            .find(|source| source.id == id))
    }
}
