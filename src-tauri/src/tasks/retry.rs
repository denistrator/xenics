use crate::diagnostics::error::{ErrorCode, XenicsError};

#[derive(Debug, Eq, PartialEq)]
pub struct RetryPlan {
    delays: Vec<u64>,
    manual_only: bool,
}

impl RetryPlan {
    pub fn for_error(code: ErrorCode) -> Self {
        if code == ErrorCode::RemoteUnavailable {
            Self {
                delays: vec![2, 10],
                manual_only: false,
            }
        } else {
            Self {
                delays: Vec::new(),
                manual_only: true,
            }
        }
    }

    pub fn delays_seconds(&self) -> Vec<u64> {
        self.delays.clone()
    }
    pub fn is_manual_only(&self) -> bool {
        self.manual_only
    }
    pub fn for_failure(error: &XenicsError) -> Self {
        Self::for_error(error.code)
    }
}
