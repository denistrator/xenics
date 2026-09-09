use super::filesystem_error;
use crate::diagnostics::error::ErrorCode;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Eq, PartialEq)]
pub struct ManagedPath(pub PathBuf);

impl ManagedPath {
    pub fn for_remote(
        library_root: impl AsRef<Path>,
        vendor: &str,
        package: &str,
    ) -> Result<PathBuf, crate::diagnostics::error::XenicsError> {
        validate_component(vendor)?;
        validate_component(package)?;
        let path = library_root
            .as_ref()
            .join("library")
            .join(vendor)
            .join(package);
        if path.exists() {
            return Err(filesystem_error(
                ErrorCode::ManagedPathCollision,
                format!("managed path already exists: {}", path.display()),
            ));
        }
        Ok(path)
    }
}

pub fn validate_managed_path(
    path: impl AsRef<Path>,
) -> Result<(), crate::diagnostics::error::XenicsError> {
    if path
        .as_ref()
        .components()
        .any(|component| matches!(component, Component::ParentDir))
    {
        return Err(filesystem_error(
            ErrorCode::InvalidManagedPath,
            "managed path cannot contain parent traversal",
        ));
    }
    if path.as_ref().file_name().is_none() {
        return Err(filesystem_error(
            ErrorCode::InvalidManagedPath,
            "managed path must name a repository",
        ));
    }
    Ok(())
}

fn validate_component(value: &str) -> Result<(), crate::diagnostics::error::XenicsError> {
    if value.is_empty()
        || value == "."
        || value == ".."
        || value.contains('/')
        || value.contains('\\')
    {
        return Err(filesystem_error(
            ErrorCode::InvalidManagedPath,
            "managed path component is invalid",
        ));
    }
    Ok(())
}
