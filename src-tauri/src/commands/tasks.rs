use crate::tasks::{TaskManager, TaskSnapshot};

pub fn list_tasks(manager: &TaskManager) -> Vec<TaskSnapshot> {
    manager.snapshot()
}
