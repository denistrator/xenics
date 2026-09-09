use super::AppState;
use crate::persistence::BookmarkRecord;
use serde_json::{Map, Value};
use tauri::State;

#[tauri::command]
pub fn list_bookmarks(state: State<'_, AppState>) -> Result<Vec<BookmarkRecord>, String> {
    state
        .user_db
        .list_bookmarks()
        .map_err(|error| error.message)
}

#[tauri::command]
pub fn save_bookmark(
    state: State<'_, AppState>,
    source_id: String,
    ref_name: String,
    document_path: String,
    anchor: Option<String>,
) -> Result<i64, String> {
    if !is_safe_value(&source_id)
        || !is_safe_value(&ref_name)
        || !is_safe_relative_path(&document_path)
    {
        return Err("bookmark target is invalid".into());
    }
    if anchor.as_deref().is_some_and(|value| !is_safe_value(value)) {
        return Err("bookmark anchor is invalid".into());
    }
    state
        .user_db
        .save_bookmark(&source_id, &ref_name, &document_path, anchor.as_deref())
        .map_err(|error| error.message)
}

#[tauri::command]
pub fn create_collection(state: State<'_, AppState>, name: String) -> Result<String, String> {
    state
        .user_db
        .create_collection(&name)
        .map_err(|error| error.message)
}

#[tauri::command]
pub fn create_tag(state: State<'_, AppState>, name: String) -> Result<String, String> {
    state
        .user_db
        .create_tag(&name)
        .map_err(|error| error.message)
}

#[tauri::command]
pub fn list_collections(
    state: State<'_, AppState>,
) -> Result<Vec<crate::persistence::NamedRecord>, String> {
    state
        .user_db
        .list_collections()
        .map_err(|error| error.message)
}

#[tauri::command]
pub fn list_tags(
    state: State<'_, AppState>,
) -> Result<Vec<crate::persistence::NamedRecord>, String> {
    state.user_db.list_tags().map_err(|error| error.message)
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<Value, String> {
    state.user_db.get_settings().map_err(|error| error.message)
}

#[tauri::command]
pub fn update_settings(state: State<'_, AppState>, patch: Value) -> Result<(), String> {
    let Some(values) = patch.as_object() else {
        return Err("settings patch must be an object".into());
    };
    let mut allowed = Map::new();
    for (key, value) in values {
        if !matches!(
            key.as_str(),
            "theme"
                | "density"
                | "updateSchedule"
                | "editorCommand"
                | "allowLocalFolderUpdates"
                | "notificationsEnabled"
                | "libraryPath"
        ) {
            return Err("settings key is not supported".into());
        }
        if let Value::String(string) = value {
            if string.len() > 4096 || string.chars().any(|character| character.is_control()) {
                return Err("settings value is invalid".into());
            }
        }
        allowed.insert(key.clone(), value.clone());
    }
    state
        .user_db
        .update_settings(Value::Object(allowed))
        .map_err(|error| error.message)
}

fn is_safe_value(value: &str) -> bool {
    !value.is_empty() && !value.chars().any(|character| character.is_control())
}

fn is_safe_relative_path(value: &str) -> bool {
    is_safe_value(value)
        && !value.starts_with('/')
        && !value.contains('\\')
        && !value
            .split('/')
            .any(|segment| segment.is_empty() || segment == "." || segment == "..")
}

#[cfg(test)]
mod tests {
    use super::is_safe_relative_path;

    #[test]
    fn bookmark_paths_reject_traversal_and_absolute_targets() {
        assert!(is_safe_relative_path("docs/start.md"));
        assert!(!is_safe_relative_path("../secret.md"));
        assert!(!is_safe_relative_path(r"docs\..\secret.md"));
        assert!(!is_safe_relative_path("/etc/passwd"));
    }
}
