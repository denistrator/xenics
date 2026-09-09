use crate::{
    core::{ids::TaskId, models::TaskState},
    diagnostics::error::{ErrorCode, RetryClass, XenicsError},
};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

pub type TaskOperation = Arc<dyn Fn() -> Result<(), XenicsError> + Send + Sync + 'static>;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TaskSnapshot {
    pub task_id: TaskId,
    pub state: TaskState,
    pub phase: String,
    pub attempts: u32,
    pub error: Option<XenicsError>,
}

struct TaskEntry {
    snapshot: TaskSnapshot,
    operation: TaskOperation,
    cancel_requested: bool,
}

pub struct TaskManager {
    tasks: Arc<Mutex<HashMap<TaskId, TaskEntry>>>,
}

impl Default for TaskManager {
    fn default() -> Self {
        Self::new()
    }
}

impl TaskManager {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn submit(&self, operation: TaskOperation) -> TaskId {
        let task_id = TaskId::from(format!("task-{}", unique_suffix()).as_str());
        let entry = TaskEntry {
            snapshot: TaskSnapshot {
                task_id: task_id.clone(),
                state: TaskState::Queued,
                phase: "queued".into(),
                attempts: 0,
                error: None,
            },
            operation: operation.clone(),
            cancel_requested: false,
        };
        self.tasks.lock().unwrap().insert(task_id.clone(), entry);
        let tasks = Arc::clone(&self.tasks);
        let worker_id = task_id.clone();
        thread::spawn(move || {
            {
                let mut all = tasks.lock().unwrap();
                if let Some(entry) = all.get_mut(&worker_id) {
                    entry.snapshot.state = TaskState::Running;
                    entry.snapshot.phase = "running".into();
                    entry.snapshot.attempts += 1;
                }
            }
            let result = operation();
            let mut all = tasks.lock().unwrap();
            if let Some(entry) = all.get_mut(&worker_id) {
                if entry.cancel_requested {
                    entry.snapshot.state = TaskState::Canceled;
                    entry.snapshot.phase = "canceled".into();
                } else if let Err(error) = result {
                    entry.snapshot.state = TaskState::Failed;
                    entry.snapshot.phase = "failed".into();
                    entry.snapshot.error = Some(error);
                } else {
                    entry.snapshot.state = TaskState::Succeeded;
                    entry.snapshot.phase = "complete".into();
                }
            }
        });
        task_id
    }

    pub fn cancel(&self, task_id: &TaskId) -> Result<(), XenicsError> {
        let mut all = self.tasks.lock().unwrap();
        let entry = all
            .get_mut(task_id)
            .ok_or_else(|| task_error(ErrorCode::Unknown, "task not found"))?;
        if entry.snapshot.state.is_terminal() {
            return Ok(());
        }
        entry.cancel_requested = true;
        entry.snapshot.state = TaskState::Canceling;
        entry.snapshot.phase = "canceling".into();
        Ok(())
    }

    pub fn retry(&self, task_id: &TaskId) -> Result<TaskId, XenicsError> {
        let operation = {
            let all = self.tasks.lock().unwrap();
            let entry = all
                .get(task_id)
                .ok_or_else(|| task_error(ErrorCode::Unknown, "task not found"))?;
            if !matches!(
                entry.snapshot.state,
                TaskState::Failed | TaskState::Interrupted
            ) {
                return Err(task_error(
                    ErrorCode::Unknown,
                    "only failed or interrupted tasks can be retried",
                ));
            }
            entry.operation.clone()
        };
        Ok(self.submit(operation))
    }

    pub fn snapshot(&self) -> Vec<TaskSnapshot> {
        self.tasks
            .lock()
            .unwrap()
            .values()
            .map(|entry| entry.snapshot.clone())
            .collect()
    }

    pub fn snapshot_for(&self, task_id: &TaskId) -> Option<TaskSnapshot> {
        self.tasks
            .lock()
            .unwrap()
            .get(task_id)
            .map(|entry| entry.snapshot.clone())
    }

    pub fn reconcile_after_restart(&self) -> Vec<TaskSnapshot> {
        let mut snapshots = self.snapshot();
        crate::tasks::reconcile_snapshots(&mut snapshots)
    }
}

fn task_error(code: ErrorCode, message: impl Into<String>) -> XenicsError {
    let mut error = XenicsError::new(code, RetryClass::Permanent);
    error.message = message.into();
    error
}
fn unique_suffix() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_nanos()
}
