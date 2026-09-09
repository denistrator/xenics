use crate::diagnostics::error::{ErrorCode, RetryClass, XenicsError};
use std::{
    fs,
    path::{Path, PathBuf},
};

mod paths;
pub mod reconcile;
mod reset;
pub mod watcher;

pub use paths::{validate_managed_path, ManagedPath};
pub use reset::{ResetPreview, ResetReport, ResetService};

pub(crate) fn filesystem_error(code: ErrorCode, message: impl Into<String>) -> XenicsError {
    let mut error = XenicsError::new(code, RetryClass::Permanent);
    error.message = message.into();
    error
}

pub(crate) fn delete_explicit_path(path: &Path) -> Result<(), XenicsError> {
    if path.is_dir() {
        fs::remove_dir_all(path)
    } else {
        fs::remove_file(path)
    }
    .map_err(|error| filesystem_error(ErrorCode::Unknown, error.to_string()))
}

#[derive(Debug, Eq, PartialEq)]
pub struct MoveReport {
    pub source: PathBuf,
    pub destination: PathBuf,
    pub verified: bool,
}

#[cfg(test)]
mod tests;
#[cfg(test)]
mod watcher_tests;
