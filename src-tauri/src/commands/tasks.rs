use super::AppState;
use crate::tasks::{TaskManager, TaskSnapshot};
use tauri::State;

pub fn list_tasks(manager: &TaskManager) -> Vec<TaskSnapshot> {
    manager.snapshot()
}

#[tauri::command]
pub fn get_tasks(state: State<'_, AppState>) -> Vec<TaskSnapshot> {
    list_tasks(&state.task_manager)
}

#[tauri::command]
pub fn cancel_task(state: State<'_, AppState>, task_id: String) -> Result<(), String> {
    state
        .task_manager
        .cancel(&task_id.as_str().into())
        .map_err(|error| error.message)
}

#[tauri::command]
pub fn retry_task(state: State<'_, AppState>, task_id: String) -> Result<String, String> {
    state
        .task_manager
        .retry(&task_id.as_str().into())
        .map(|id| id.0)
        .map_err(|error| error.message)
}
