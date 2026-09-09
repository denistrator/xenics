use super::{delete_explicit_path, filesystem_error};
use crate::diagnostics::error::ErrorCode;
use std::path::{Path, PathBuf};

#[derive(Debug, Eq, PartialEq)]
pub struct ResetPreview {
    pub deletable_paths: Vec<PathBuf>,
}

#[derive(Debug, Eq, PartialEq)]
pub struct ResetReport {
    pub deleted_paths: Vec<PathBuf>,
}

pub struct ResetService {
    deletable_paths: Vec<PathBuf>,
    referenced_external_paths: Vec<PathBuf>,
}

impl ResetService {
    pub fn for_test(external_path: impl AsRef<Path>) -> Self {
        Self::for_test_with_paths(Vec::new(), external_path)
    }

    pub fn for_test_with_paths(
        deletable_paths: Vec<PathBuf>,
        external_path: impl AsRef<Path>,
    ) -> Self {
        Self {
            deletable_paths,
            referenced_external_paths: vec![external_path.as_ref().to_path_buf()],
        }
    }

    pub fn preview(&self) -> ResetPreview {
        ResetPreview {
            deletable_paths: self.safe_paths(),
        }
    }

    pub fn confirmation_token(&self) -> String {
        format!(
            "xenics-reset-v1:{}",
            self.preview()
                .deletable_paths
                .iter()
                .map(|path| path.display().to_string())
                .collect::<Vec<_>>()
                .join("|")
        )
    }

    pub fn execute(
        &self,
        confirmation_token: &str,
    ) -> Result<ResetReport, crate::diagnostics::error::XenicsError> {
        if confirmation_token != self.confirmation_token() {
            return Err(filesystem_error(
                ErrorCode::ResetConfirmationRequired,
                "reset confirmation does not match the current preview",
            ));
        }
        let mut deleted_paths = Vec::new();
        for path in self.safe_paths() {
            if path.exists() {
                delete_explicit_path(&path)?;
                deleted_paths.push(path);
            }
        }
        Ok(ResetReport { deleted_paths })
    }

    fn safe_paths(&self) -> Vec<PathBuf> {
        self.deletable_paths
            .iter()
            .filter(|path| {
                !self
                    .referenced_external_paths
                    .iter()
                    .any(|external| external == *path)
            })
            .cloned()
            .collect()
    }
}
