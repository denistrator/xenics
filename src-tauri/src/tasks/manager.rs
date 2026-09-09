use crate::{
    core::{
        ids::TaskId,
        models::{TaskEvent, TaskState},
    },
    diagnostics::error::{ErrorCode, RetryClass, XenicsError},
    git::CancellationToken,
    persistence::UserDb,
};
use serde::Serialize;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

pub type TaskOperation = Arc<dyn Fn() -> Result<(), XenicsError> + Send + Sync + 'static>;
pub type CancellableTaskOperation =
    Arc<dyn Fn(CancellationToken) -> Result<(), XenicsError> + Send + Sync + 'static>;
pub type TaskEventSink = Arc<dyn Fn(TaskEvent) + Send + Sync + 'static>;

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
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
    cancellable_operation: Option<CancellableTaskOperation>,
    cancellation: Option<CancellationToken>,
    cancel_requested: bool,
    sequence: u64,
}

pub struct TaskManager {
    tasks: Arc<Mutex<HashMap<TaskId, TaskEntry>>>,
    store: Option<Arc<UserDb>>,
    event_sink: Option<TaskEventSink>,
}

impl Default for TaskManager {
    fn default() -> Self {
        Self::new()
    }
}

impl TaskManager {
    pub fn new() -> Self {
        Self::with_store(None)
    }

    pub fn new_with_store(store: Arc<UserDb>) -> Self {
        Self::with_store(Some(store))
    }

    fn with_store(store: Option<Arc<UserDb>>) -> Self {
        Self::with_store_and_sink(store, None)
    }

    pub fn new_with_event_sink(event_sink: TaskEventSink) -> Self {
        Self::with_store_and_sink(None, Some(event_sink))
    }

    pub fn new_with_store_and_event_sink(store: Arc<UserDb>, event_sink: TaskEventSink) -> Self {
        Self::with_store_and_sink(Some(store), Some(event_sink))
    }

    fn with_store_and_sink(store: Option<Arc<UserDb>>, event_sink: Option<TaskEventSink>) -> Self {
        Self {
            tasks: Arc::new(Mutex::new(HashMap::new())),
            store,
            event_sink,
        }
    }

    pub fn submit(&self, operation: TaskOperation) -> TaskId {
        self.submit_inner(operation, None)
    }

    pub fn submit_cancellable(&self, operation: CancellableTaskOperation) -> TaskId {
        let fallback_operation: TaskOperation = Arc::new(|| Ok(()));
        self.submit_inner(fallback_operation, Some(operation))
    }

    fn submit_inner(
        &self,
        operation: TaskOperation,
        cancellable_operation: Option<CancellableTaskOperation>,
    ) -> TaskId {
        let task_id = TaskId::from(format!("task-{}", unique_suffix()).as_str());
        let cancellation = cancellable_operation
            .as_ref()
            .map(|_| CancellationToken::default());
        let entry = TaskEntry {
            snapshot: TaskSnapshot {
                task_id: task_id.clone(),
                state: TaskState::Queued,
                phase: "queued".into(),
                attempts: 0,
                error: None,
            },
            operation: operation.clone(),
            cancellable_operation: cancellable_operation.clone(),
            cancellation: cancellation.clone(),
            cancel_requested: false,
            sequence: 0,
        };
        self.tasks.lock().unwrap().insert(task_id.clone(), entry);
        let tasks = Arc::clone(&self.tasks);
        let store = self.store.clone();
        let event_sink = self.event_sink.clone();
        let worker_operation = cancellable_operation;
        {
            let mut all = tasks.lock().unwrap();
            let entry = all.get_mut(&task_id).expect("new task entry");
            persist_snapshot(store.as_ref(), &entry.snapshot);
            emit_event(event_sink.as_ref(), &mut entry.sequence, &entry.snapshot);
        }
        let worker_id = task_id.clone();
        thread::spawn(move || {
            {
                let mut all = tasks.lock().unwrap();
                if let Some(entry) = all.get_mut(&worker_id) {
                    entry.snapshot.state = TaskState::Running;
                    entry.snapshot.phase = "running".into();
                    entry.snapshot.attempts += 1;
                    persist_snapshot(store.as_ref(), &entry.snapshot);
                    emit_event(event_sink.as_ref(), &mut entry.sequence, &entry.snapshot);
                }
            }
            let result = match worker_operation {
                Some(operation) => operation(cancellation.expect("cancellable token")),
                None => operation(),
            };
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
                persist_snapshot(store.as_ref(), &entry.snapshot);
                emit_event(event_sink.as_ref(), &mut entry.sequence, &entry.snapshot);
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
        if let Some(cancellation) = &entry.cancellation {
            cancellation.cancel();
        }
        entry.snapshot.state = TaskState::Canceling;
        entry.snapshot.phase = "canceling".into();
        persist_snapshot(self.store.as_ref(), &entry.snapshot);
        emit_event(
            self.event_sink.as_ref(),
            &mut entry.sequence,
            &entry.snapshot,
        );
        Ok(())
    }

    pub fn retry(&self, task_id: &TaskId) -> Result<TaskId, XenicsError> {
        let (operation, cancellable_operation) = {
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
            (entry.operation.clone(), entry.cancellable_operation.clone())
        };
        Ok(match cancellable_operation {
            Some(operation) => self.submit_cancellable(operation),
            None => self.submit(operation),
        })
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

fn persist_snapshot(store: Option<&Arc<UserDb>>, snapshot: &TaskSnapshot) {
    let Some(store) = store else { return };
    let Ok(payload) = serde_json::to_string(snapshot) else {
        return;
    };
    let _ = store.upsert_task_record(
        &snapshot.task_id.0,
        &format!("{:?}", snapshot.state),
        &payload,
    );
}

fn emit_event(sink: Option<&TaskEventSink>, sequence: &mut u64, snapshot: &TaskSnapshot) {
    let Some(sink) = sink else { return };
    *sequence += 1;
    let mut event = TaskEvent::new(&snapshot.task_id.0, *sequence, snapshot.state);
    event.phase = snapshot.phase.clone();
    event.error = snapshot.error.clone();
    sink(event);
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
