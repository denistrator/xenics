use super::{classify_git_failure, CancellationToken, GitCommand, GitRequest, GitService};
use crate::diagnostics::error::{ErrorCode, RetryClass};
use std::{fs, path::PathBuf, process::Command};
use tempfile::tempdir;

#[test]
fn git_arguments_do_not_use_shell_interpolation() {
    let command = GitCommand::clone("https://example.test/docs", "/tmp/xenics/docs");
    assert_eq!(command.program, "git");
    assert_eq!(
        command.args,
        vec!["clone", "https://example.test/docs", "/tmp/xenics/docs"]
    );
    assert!(!command.shell_string().contains("&&"));
}

#[test]
fn clone_arguments_preserve_selected_ref_and_shallow_mode() {
    let command = GitCommand::clone_with_options(
        "https://example.test/docs",
        "/tmp/xenics/docs",
        Some("release/v1"),
        true,
    )
    .unwrap();

    assert_eq!(
        command.args,
        vec![
            "clone",
            "--depth",
            "1",
            "--branch",
            "release/v1",
            "https://example.test/docs",
            "/tmp/xenics/docs"
        ]
    );
}

#[test]
fn clone_arguments_reject_option_injection_through_ref() {
    let error = GitCommand::clone_with_options(
        "https://example.test/docs",
        "/tmp/xenics/docs",
        Some("--upload-pack=evil"),
        false,
    )
    .unwrap_err();

    assert_eq!(error.code, ErrorCode::InvalidGitRef);
}

#[test]
fn authentication_output_is_sanitized_and_requires_action() {
    let error = classify_git_failure(
        128,
        "fatal: Authentication failed for 'https://token@example.test/docs'",
    );
    assert_eq!(error.code, ErrorCode::GitAuthentication);
    assert_eq!(error.retry_class, RetryClass::NeedsAction);
    assert!(!error.message.contains("token@"));
}

#[test]
fn canceled_operations_do_not_spawn_git() {
    let token = CancellationToken::default();
    token.cancel();
    let request = GitRequest {
        source: "https://example.test/docs".into(),
        destination: PathBuf::from("/tmp/docs"),
        reference: None,
        shallow: false,
    };
    let error = GitService::clone(&request, &token).unwrap_err();
    assert_eq!(error.code, ErrorCode::GitCanceled);
}

#[test]
fn local_repository_status_and_remote_are_read_through_system_git() {
    let root = tempdir().unwrap();
    run_git(root.path(), &["init", "-q"]);
    run_git(
        root.path(),
        &["config", "user.email", "xenics@example.test"],
    );
    run_git(root.path(), &["config", "user.name", "Xenics Test"]);
    fs::write(root.path().join("README.md"), "Xenics").unwrap();
    run_git(root.path(), &["add", "README.md"]);
    run_git(root.path(), &["commit", "-qm", "initial"]);
    run_git(
        root.path(),
        &["remote", "add", "origin", "https://example.test/xenics.git"],
    );

    let request = GitRequest {
        source: root.path().display().to_string(),
        destination: root.path().to_path_buf(),
        reference: None,
        shallow: false,
    };
    let status = GitService::status(&request).unwrap();
    let remote = GitService::open_remote(root.path()).unwrap();

    assert!(!status.dirty);
    assert!(!status.diverged);
    assert_eq!(remote.url, "https://example.test/xenics.git");
}

fn run_git(directory: &std::path::Path, args: &[&str]) {
    let output = Command::new("git")
        .args(args)
        .current_dir(directory)
        .output()
        .unwrap();
    assert!(output.status.success(), "git failed: {:?}", output);
}
