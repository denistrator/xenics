#[cfg(test)]
mod tests {
    use super::{RepositoryCapability, TaskEvent, TaskState};

    #[test]
    fn terminal_task_states_are_not_reopened() {
        let event = TaskEvent::new("task-1", 2, TaskState::Running);
        assert!(!event.can_follow(TaskState::Succeeded));
    }

    #[test]
    fn capabilities_are_serializable_domain_values() {
        let value = serde_json::to_string(&RepositoryCapability::PartiallyReadable).unwrap();
        assert_eq!(value, "\"PartiallyReadable\"");
    }
}
use crate::{core::ids::TaskId, diagnostics::error::XenicsError};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum RepositoryCapability {
    Readable,
    PartiallyReadable,
    FilesOnly,
    WebsiteOnly,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum TaskState {
    Queued,
    Running,
    WaitingToRetry,
    NeedsAction,
    Canceling,
    Canceled,
    Succeeded,
    SucceededWithWarnings,
    Failed,
    Interrupted,
}

impl TaskState {
    pub fn is_terminal(self) -> bool {
        matches!(
            self,
            Self::Succeeded
                | Self::SucceededWithWarnings
                | Self::Failed
                | Self::Canceled
                | Self::Interrupted
        )
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct TaskEvent {
    pub task_id: TaskId,
    pub sequence: u64,
    pub phase: String,
    pub progress: Option<f32>,
    pub state: TaskState,
    pub error: Option<XenicsError>,
}

impl TaskEvent {
    pub fn new(task_id: &str, sequence: u64, state: TaskState) -> Self {
        Self {
            task_id: task_id.into(),
            sequence,
            phase: "unknown".into(),
            progress: None,
            state,
            error: None,
        }
    }

    pub fn can_follow(&self, previous: TaskState) -> bool {
        !previous.is_terminal()
    }
}
