use super::{database_error, migrations};
use crate::diagnostics::error::{ErrorCode, RetryClass, XenicsError};
use rusqlite::{params, Connection};
use serde::Serialize;
use serde_json::{Map, Value};
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

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BookmarkRecord {
    pub id: i64,
    pub source_id: String,
    pub ref_name: String,
    pub document_path: String,
    pub anchor: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct NamedRecord {
    pub id: String,
    pub name: String,
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

    pub fn save_bookmark(
        &self,
        source_id: &str,
        ref_name: &str,
        document_path: &str,
        anchor: Option<&str>,
    ) -> Result<i64, XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        let transaction = connection.unchecked_transaction().map_err(database_error)?;
        transaction
            .execute(
                "DELETE FROM bookmarks WHERE source_id = ?1 AND ref_name = ?2 AND document_path = ?3",
                params![source_id, ref_name, document_path],
            )
            .map_err(database_error)?;
        transaction
            .execute(
                "INSERT INTO bookmarks(source_id, ref_name, document_path, anchor) VALUES (?1, ?2, ?3, ?4)",
                params![source_id, ref_name, document_path, anchor],
            )
            .map_err(database_error)?;
        let id = transaction.last_insert_rowid();
        transaction.commit().map_err(database_error)?;
        Ok(id)
    }

    pub fn list_bookmarks(&self) -> Result<Vec<BookmarkRecord>, XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        let mut statement = connection
            .prepare(
                "SELECT id, source_id, ref_name, document_path, anchor
                 FROM bookmarks ORDER BY created_at, id",
            )
            .map_err(database_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok(BookmarkRecord {
                    id: row.get(0)?,
                    source_id: row.get(1)?,
                    ref_name: row.get(2)?,
                    document_path: row.get(3)?,
                    anchor: row.get(4)?,
                })
            })
            .map_err(database_error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(database_error)
    }

    pub fn assign_collection(
        &self,
        bookmark_id: i64,
        collection_id: &str,
        assigned: bool,
    ) -> Result<(), XenicsError> {
        self.assign_named_record(
            "bookmark_collections",
            "collections",
            "collection_id",
            bookmark_id,
            collection_id,
            assigned,
        )
    }

    pub fn assign_tag(
        &self,
        bookmark_id: i64,
        tag_id: &str,
        assigned: bool,
    ) -> Result<(), XenicsError> {
        self.assign_named_record(
            "bookmark_tags",
            "tags",
            "tag_id",
            bookmark_id,
            tag_id,
            assigned,
        )
    }

    pub fn list_bookmark_collections(&self, bookmark_id: i64) -> Result<Vec<String>, XenicsError> {
        self.list_assignments("bookmark_collections", "collection_id", bookmark_id)
    }

    pub fn list_bookmark_tags(&self, bookmark_id: i64) -> Result<Vec<String>, XenicsError> {
        self.list_assignments("bookmark_tags", "tag_id", bookmark_id)
    }

    fn assign_named_record(
        &self,
        join_table: &str,
        records_table: &str,
        record_column: &str,
        bookmark_id: i64,
        record_id: &str,
        assigned: bool,
    ) -> Result<(), XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        let exists: bool = connection
            .query_row(
                &format!("SELECT EXISTS(SELECT 1 FROM bookmarks WHERE id = ?1)"),
                params![bookmark_id],
                |row| row.get(0),
            )
            .map_err(database_error)?;
        if !exists {
            return Err(invalid_user_value("bookmark does not exist"));
        }
        let record_exists: bool = connection
            .query_row(
                &format!("SELECT EXISTS(SELECT 1 FROM {records_table} WHERE id = ?1)"),
                params![record_id],
                |row| row.get(0),
            )
            .map_err(database_error)?;
        if !record_exists {
            return Err(invalid_user_value("organization record does not exist"));
        }
        if assigned {
            connection
                .execute(
                    &format!("INSERT OR IGNORE INTO {join_table}(bookmark_id, {record_column}) VALUES (?1, ?2)"),
                    params![bookmark_id, record_id],
                )
                .map_err(database_error)?;
        } else {
            connection
                .execute(
                    &format!(
                        "DELETE FROM {join_table} WHERE bookmark_id = ?1 AND {record_column} = ?2"
                    ),
                    params![bookmark_id, record_id],
                )
                .map_err(database_error)?;
        }
        Ok(())
    }

    fn list_assignments(
        &self,
        join_table: &str,
        record_column: &str,
        bookmark_id: i64,
    ) -> Result<Vec<String>, XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        let mut statement = connection
            .prepare(&format!("SELECT {record_column} FROM {join_table} WHERE bookmark_id = ?1 ORDER BY {record_column}"))
            .map_err(database_error)?;
        let rows = statement
            .query_map(params![bookmark_id], |row| row.get(0))
            .map_err(database_error)?;
        rows.collect::<Result<Vec<String>, _>>()
            .map_err(database_error)
    }

    pub fn create_collection(&self, name: &str) -> Result<String, XenicsError> {
        self.create_named_record("collections", "collection", name)
    }

    pub fn create_tag(&self, name: &str) -> Result<String, XenicsError> {
        self.create_named_record("tags", "tag", name)
    }

    pub fn list_collections(&self) -> Result<Vec<NamedRecord>, XenicsError> {
        self.list_named_records("collections")
    }

    pub fn list_tags(&self) -> Result<Vec<NamedRecord>, XenicsError> {
        self.list_named_records("tags")
    }

    fn create_named_record(
        &self,
        table: &str,
        prefix: &str,
        name: &str,
    ) -> Result<String, XenicsError> {
        let normalized_name = normalize_name(name)?;
        let id = format!("{prefix}:{}", normalized_name.replace(' ', "-"));
        let connection = self.connection.lock().expect("user database mutex");
        connection
            .execute(
                &format!("INSERT OR IGNORE INTO {table}(id, name) VALUES (?1, ?2)"),
                params![id, name.trim()],
            )
            .map_err(database_error)?;
        Ok(id)
    }

    fn list_named_records(&self, table: &str) -> Result<Vec<NamedRecord>, XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        let mut statement = connection
            .prepare(&format!(
                "SELECT id, name FROM {table} ORDER BY created_at, id"
            ))
            .map_err(database_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok(NamedRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                })
            })
            .map_err(database_error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(database_error)
    }

    pub fn bookmark_count(&self) -> Result<i64, XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        connection
            .query_row("SELECT COUNT(*) FROM bookmarks", [], |row| row.get(0))
            .map_err(database_error)
    }

    pub fn update_settings(&self, patch: Value) -> Result<(), XenicsError> {
        let Some(values) = patch.as_object() else {
            return Err(invalid_user_value("settings patch must be an object"));
        };
        let connection = self.connection.lock().expect("user database mutex");
        let transaction = connection.unchecked_transaction().map_err(database_error)?;
        for (key, value) in values {
            let value_json = serde_json::to_string(value)
                .map_err(|_| invalid_user_value("setting is not serializable"))?;
            transaction
                .execute(
                    "INSERT INTO settings(key, value_json) VALUES (?1, ?2)
                     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json",
                    params![key, value_json],
                )
                .map_err(database_error)?;
        }
        transaction.commit().map_err(database_error)
    }

    pub fn get_settings(&self) -> Result<Value, XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        let mut statement = connection
            .prepare("SELECT key, value_json FROM settings ORDER BY key")
            .map_err(database_error)?;
        let rows = statement
            .query_map([], |row| {
                let key: String = row.get(0)?;
                let value_json: String = row.get(1)?;
                Ok((key, value_json))
            })
            .map_err(database_error)?;
        let mut values = Map::new();
        for row in rows {
            let (key, value_json) = row.map_err(database_error)?;
            let value = serde_json::from_str(&value_json)
                .map_err(|_| invalid_user_value("stored setting is invalid"))?;
            values.insert(key, value);
        }
        Ok(Value::Object(values))
    }

    pub fn save_session(&self, session: &Value) -> Result<(), XenicsError> {
        let value_json = serde_json::to_string(session)
            .map_err(|_| invalid_user_value("session is not serializable"))?;
        if value_json.len() > 1_000_000 {
            return Err(invalid_user_value("session is too large"));
        }
        self.update_settings(serde_json::json!({ "readerSession": session }))
    }

    pub fn get_session(&self) -> Result<Value, XenicsError> {
        Ok(self
            .get_settings()?
            .get("readerSession")
            .cloned()
            .unwrap_or_else(|| Value::Object(Map::new())))
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

    pub fn remove_source(&self, id: &str) -> Result<bool, XenicsError> {
        let connection = self.connection.lock().expect("user database mutex");
        connection
            .execute("DELETE FROM sources WHERE id = ?1", params![id])
            .map(|count| count > 0)
            .map_err(database_error)
    }
}

fn normalize_name(name: &str) -> Result<String, XenicsError> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed.chars().any(|character| character.is_control()) {
        let mut error = XenicsError::new(ErrorCode::Unknown, RetryClass::Permanent);
        error.message = "name is invalid".into();
        return Err(error);
    }
    Ok(trimmed.to_lowercase())
}

fn invalid_user_value(message: &str) -> XenicsError {
    let mut error = XenicsError::new(ErrorCode::Unknown, RetryClass::Permanent);
    error.message = message.into();
    error
}
