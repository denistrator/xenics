#[cfg(test)]
mod tests {
    use super::{ErrorCode, RetryClass, XenicsError};

    #[test]
    fn retry_class_is_not_inferred_from_display_text() {
        let error = XenicsError::new(ErrorCode::GitAuthentication, RetryClass::NeedsAction);
        assert_eq!(error.retry_class, RetryClass::NeedsAction);
    }
}
use crate::core::ids::{DocumentId, SourceId, TaskId};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum ErrorCode {
    GitAuthentication,
    InvalidTaskEvent,
    Database,
    ManagedPathCollision,
    InvalidManagedPath,
    ResetConfirmationRequired,
    Unknown,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum RetryClass {
    Automatic,
    NeedsAction,
    Permanent,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct XenicsError {
    pub code: ErrorCode,
    pub source_id: Option<SourceId>,
    pub document_id: Option<DocumentId>,
    pub task_id: Option<TaskId>,
    pub phase: Option<String>,
    pub retry_class: RetryClass,
    pub message: String,
    pub actions: Vec<String>,
    pub diagnostic_id: String,
}

impl XenicsError {
    pub fn new(code: ErrorCode, retry_class: RetryClass) -> Self {
        Self {
            code,
            source_id: None,
            document_id: None,
            task_id: None,
            phase: None,
            retry_class,
            message: String::new(),
            actions: Vec::new(),
            diagnostic_id: String::new(),
        }
    }
}
