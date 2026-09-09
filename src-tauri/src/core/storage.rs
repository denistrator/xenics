use crate::{
    diagnostics::error::ErrorCode,
    filesystem::{filesystem_error, MoveReport},
};
use std::{fs, path::Path};

pub struct StorageService;

impl StorageService {
    pub fn move_library(
        source: impl AsRef<Path>,
        destination: impl AsRef<Path>,
    ) -> Result<MoveReport, crate::diagnostics::error::XenicsError> {
        let source = source.as_ref().to_path_buf();
        let destination = destination.as_ref().to_path_buf();
        if !source.exists() {
            return Err(filesystem_error(
                ErrorCode::Unknown,
                "library source does not exist",
            ));
        }
        if destination.exists() {
            return Err(filesystem_error(
                ErrorCode::ManagedPathCollision,
                "library destination already exists",
            ));
        }
        fs::rename(&source, &destination)
            .map_err(|error| filesystem_error(ErrorCode::Unknown, error.to_string()))?;
        if !destination.exists() {
            return Err(filesystem_error(
                ErrorCode::Unknown,
                "library move could not be verified",
            ));
        }
        Ok(MoveReport {
            source,
            destination,
            verified: true,
        })
    }
}
