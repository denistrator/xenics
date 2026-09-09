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
