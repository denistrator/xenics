use super::{validate_managed_path, ManagedPath, ResetService};
use crate::core::storage::StorageService;
use std::fs;
use tempfile::tempdir;

#[test]
fn duplicate_vendor_package_path_is_rejected_before_writing() {
    let root = tempdir().unwrap();
    let existing = root.path().join("library/acme/docs");
    fs::create_dir_all(&existing).unwrap();
    let error = ManagedPath::for_remote(root.path(), "acme", "docs").unwrap_err();
    assert_eq!(
        error.code,
        crate::diagnostics::error::ErrorCode::ManagedPathCollision
    );
}

#[test]
fn traversal_components_are_rejected() {
    let root = tempdir().unwrap();
    let error = ManagedPath::for_remote(root.path(), "../outside", "docs").unwrap_err();
    assert_eq!(
        error.code,
        crate::diagnostics::error::ErrorCode::InvalidManagedPath
    );
    assert!(validate_managed_path(root.path().join("library/acme/docs")).is_ok());
}

#[test]
fn reset_never_deletes_referenced_external_folder() {
    let external = tempdir().unwrap();
    let service =
        ResetService::for_test_with_paths(vec![external.path().to_path_buf()], external.path());
    let token = service.confirmation_token();
    let report = service.execute(&token).unwrap();
    assert!(external.path().exists());
    assert!(!report
        .deleted_paths
        .iter()
        .any(|path| path == external.path()));
}

#[test]
fn reset_rejects_a_confirmation_for_a_different_preview() {
    let external = tempdir().unwrap();
    let service = ResetService::for_test(external.path());
    let error = service.execute("wrong-confirmation").unwrap_err();
    assert_eq!(
        error.code,
        crate::diagnostics::error::ErrorCode::ResetConfirmationRequired
    );
}

#[test]
fn library_move_verifies_the_destination() {
    let root = tempdir().unwrap();
    let source = root.path().join("old-library");
    let destination = root.path().join("new-library");
    fs::create_dir_all(&source).unwrap();
    fs::write(source.join("marker.txt"), "xenics").unwrap();

    let report = StorageService::move_library(&source, &destination).unwrap();

    assert!(report.verified);
    assert!(!source.exists());
    assert_eq!(
        fs::read_to_string(destination.join("marker.txt")).unwrap(),
        "xenics"
    );
}

#[test]
fn library_move_rejects_an_existing_destination() {
    let root = tempdir().unwrap();
    let source = root.path().join("old-library");
    let destination = root.path().join("new-library");
    fs::create_dir_all(&source).unwrap();
    fs::create_dir_all(&destination).unwrap();

    let error = StorageService::move_library(&source, &destination).unwrap_err();

    assert_eq!(
        error.code,
        crate::diagnostics::error::ErrorCode::ManagedPathCollision
    );
    assert!(source.exists());
}
