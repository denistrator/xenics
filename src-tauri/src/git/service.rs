use super::{classify_git_failure, CancellationToken};
use crate::{
    diagnostics::error::{ErrorCode, RetryClass, XenicsError},
    filesystem::validate_managed_path,
};
use std::{
    io::Read,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::Duration,
};

#[derive(Debug, Eq, PartialEq)]
pub struct GitCommand {
    pub program: String,
    pub args: Vec<String>,
}

impl GitCommand {
    pub fn clone(source: impl Into<String>, destination: impl Into<String>) -> Self {
        Self {
            program: "git".into(),
            args: vec!["clone".into(), source.into(), destination.into()],
        }
    }

    pub fn clone_with_options(
        source: impl Into<String>,
        destination: impl Into<String>,
        reference: Option<&str>,
        shallow: bool,
    ) -> Result<Self, XenicsError> {
        if let Some(reference) = reference {
            validate_ref(reference)?;
        }

        let mut args = vec!["clone".into()];
        if shallow {
            args.extend(["--depth".into(), "1".into()]);
        }
        if let Some(reference) = reference {
            args.extend(["--branch".into(), reference.into()]);
        }
        args.extend([source.into(), destination.into()]);
        Ok(Self {
            program: "git".into(),
            args,
        })
    }
    pub fn shell_string(&self) -> String {
        std::iter::once(self.program.as_str())
            .chain(self.args.iter().map(String::as_str))
            .collect::<Vec<_>>()
            .join(" ")
    }
}

#[derive(Debug, Clone)]
pub struct GitRequest {
    pub source: String,
    pub destination: PathBuf,
    pub reference: Option<String>,
    pub shallow: bool,
}

#[derive(Debug, Eq, PartialEq)]
pub struct GitPrerequisites {
    pub executable: String,
    pub version: String,
}

#[derive(Debug, Eq, PartialEq)]
pub struct GitResult {
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Eq, PartialEq)]
pub struct WorkingTreeStatus {
    pub dirty: bool,
    pub diverged: bool,
}

#[derive(Debug, Eq, PartialEq)]
pub struct RemoteIdentity {
    pub url: String,
}

pub struct GitService;

impl GitService {
    pub fn check_prerequisites(_source: impl AsRef<str>) -> Result<GitPrerequisites, XenicsError> {
        let output = Command::new("git")
            .arg("--version")
            .output()
            .map_err(|error| {
                git_error(
                    ErrorCode::GitUnavailable,
                    error.to_string(),
                    RetryClass::NeedsAction,
                )
            })?;
        if !output.status.success() {
            return Err(git_error(
                ErrorCode::GitUnavailable,
                "system Git is unavailable",
                RetryClass::NeedsAction,
            ));
        }
        Ok(GitPrerequisites {
            executable: "git".into(),
            version: String::from_utf8_lossy(&output.stdout).trim().to_owned(),
        })
    }

    pub fn clone(
        request: &GitRequest,
        cancellation: &CancellationToken,
    ) -> Result<GitResult, XenicsError> {
        validate_request(request)?;
        let command = GitCommand::clone_with_options(
            &request.source,
            path_string(&request.destination),
            request.reference.as_deref(),
            request.shallow,
        )?;
        let args = command.args.iter().map(String::as_str).collect::<Vec<_>>();
        run(&args, cancellation)
    }

    pub fn fetch(
        request: &GitRequest,
        cancellation: &CancellationToken,
    ) -> Result<GitResult, XenicsError> {
        validate_request(request)?;
        run_in_repo(
            &request.destination,
            &["fetch", "--prune", "origin"],
            cancellation,
        )
    }

    pub fn fast_forward(
        request: &GitRequest,
        cancellation: &CancellationToken,
    ) -> Result<GitResult, XenicsError> {
        validate_request(request)?;
        run_in_repo(
            &request.destination,
            &["merge", "--ff-only", "FETCH_HEAD"],
            cancellation,
        )
    }

    pub fn checkout_ref(
        request: &GitRequest,
        cancellation: &CancellationToken,
    ) -> Result<GitResult, XenicsError> {
        validate_request(request)?;
        let reference = request.reference.as_deref().ok_or_else(|| {
            git_error(
                ErrorCode::InvalidGitRef,
                "a ref is required",
                RetryClass::Permanent,
            )
        })?;
        validate_ref(reference)?;
        run_in_repo(
            &request.destination,
            &["checkout", "--detach", reference],
            cancellation,
        )
    }

    pub fn status(request: &GitRequest) -> Result<WorkingTreeStatus, XenicsError> {
        validate_request(request)?;
        let output = Command::new("git")
            .args(["status", "--porcelain=v1", "--branch"])
            .current_dir(&request.destination)
            .output()
            .map_err(|error| {
                git_error(
                    ErrorCode::GitCommandFailed,
                    error.to_string(),
                    RetryClass::Automatic,
                )
            })?;
        if !output.status.success() {
            return Err(classify_git_failure(
                output.status.code().unwrap_or(-1),
                &String::from_utf8_lossy(&output.stderr),
            ));
        }
        let text = String::from_utf8_lossy(&output.stdout);
        Ok(WorkingTreeStatus {
            dirty: text.lines().any(|line| !line.starts_with("##")),
            diverged: text.contains("diverged"),
        })
    }

    pub fn open_remote(source: impl AsRef<Path>) -> Result<RemoteIdentity, XenicsError> {
        let output = Command::new("git")
            .args(["config", "--get", "remote.origin.url"])
            .current_dir(source)
            .output()
            .map_err(|error| {
                git_error(
                    ErrorCode::GitCommandFailed,
                    error.to_string(),
                    RetryClass::Permanent,
                )
            })?;
        if !output.status.success() {
            return Err(classify_git_failure(
                output.status.code().unwrap_or(-1),
                &String::from_utf8_lossy(&output.stderr),
            ));
        }
        Ok(RemoteIdentity {
            url: String::from_utf8_lossy(&output.stdout).trim().to_owned(),
        })
    }
}

fn validate_request(request: &GitRequest) -> Result<(), XenicsError> {
    if request.source.trim().is_empty() {
        return Err(git_error(
            ErrorCode::InvalidGitSource,
            "Git source cannot be empty",
            RetryClass::Permanent,
        ));
    }
    if request.destination.as_os_str().is_empty() {
        return Err(git_error(
            ErrorCode::InvalidManagedPath,
            "Git destination cannot be empty",
            RetryClass::Permanent,
        ));
    }
    validate_managed_path(&request.destination)
}

fn validate_ref(reference: &str) -> Result<(), XenicsError> {
    if reference.is_empty() || reference.starts_with('-') || reference.contains("..") {
        return Err(git_error(
            ErrorCode::InvalidGitRef,
            "Git ref is invalid",
            RetryClass::Permanent,
        ));
    }
    Ok(())
}

fn run(args: &[&str], cancellation: &CancellationToken) -> Result<GitResult, XenicsError> {
    if cancellation.is_cancelled() {
        return Err(git_error(
            ErrorCode::GitCanceled,
            "Git operation canceled",
            RetryClass::Permanent,
        ));
    }
    let mut command = Command::new("git");
    command.args(args);
    let output = execute(command, cancellation)?;
    if !output.status.success() {
        return Err(classify_git_failure(
            output.status.code().unwrap_or(-1),
            &String::from_utf8_lossy(&output.stderr),
        ));
    }
    Ok(GitResult {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    })
}

fn run_in_repo(
    destination: &Path,
    args: &[&str],
    cancellation: &CancellationToken,
) -> Result<GitResult, XenicsError> {
    if cancellation.is_cancelled() {
        return Err(git_error(
            ErrorCode::GitCanceled,
            "Git operation canceled",
            RetryClass::Permanent,
        ));
    }
    let mut command = Command::new("git");
    command.args(args).current_dir(destination);
    let output = execute(command, cancellation)?;
    if !output.status.success() {
        return Err(classify_git_failure(
            output.status.code().unwrap_or(-1),
            &String::from_utf8_lossy(&output.stderr),
        ));
    }
    Ok(GitResult {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    })
}

fn path_string(path: &Path) -> &str {
    path.to_str().unwrap_or("")
}

fn execute(
    mut command: Command,
    cancellation: &CancellationToken,
) -> Result<std::process::Output, XenicsError> {
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = command.spawn().map_err(|error| {
        git_error(
            ErrorCode::GitCommandFailed,
            error.to_string(),
            RetryClass::Automatic,
        )
    })?;
    let mut stdout = child.stdout.take().ok_or_else(|| {
        git_error(
            ErrorCode::GitCommandFailed,
            "Git stdout pipe was not created",
            RetryClass::Automatic,
        )
    })?;
    let mut stderr = child.stderr.take().ok_or_else(|| {
        git_error(
            ErrorCode::GitCommandFailed,
            "Git stderr pipe was not created",
            RetryClass::Automatic,
        )
    })?;
    let stdout_reader = thread::spawn(move || {
        let mut bytes = Vec::new();
        let result = stdout.read_to_end(&mut bytes);
        (result, bytes)
    });
    let stderr_reader = thread::spawn(move || {
        let mut bytes = Vec::new();
        let result = stderr.read_to_end(&mut bytes);
        (result, bytes)
    });
    loop {
        if cancellation.is_cancelled() {
            let _ = child.kill();
            let _ = child.wait();
            let _ = stdout_reader.join();
            let _ = stderr_reader.join();
            return Err(git_error(
                ErrorCode::GitCanceled,
                "Git operation canceled",
                RetryClass::Permanent,
            ));
        }
        match child.try_wait() {
            Ok(Some(status)) => {
                let (stdout_result, stdout) = stdout_reader.join().map_err(|_| {
                    git_error(
                        ErrorCode::GitCommandFailed,
                        "Git stdout reader failed",
                        RetryClass::Automatic,
                    )
                })?;
                let (stderr_result, stderr) = stderr_reader.join().map_err(|_| {
                    git_error(
                        ErrorCode::GitCommandFailed,
                        "Git stderr reader failed",
                        RetryClass::Automatic,
                    )
                })?;
                stdout_result.map_err(|error| {
                    git_error(
                        ErrorCode::GitCommandFailed,
                        error.to_string(),
                        RetryClass::Automatic,
                    )
                })?;
                stderr_result.map_err(|error| {
                    git_error(
                        ErrorCode::GitCommandFailed,
                        error.to_string(),
                        RetryClass::Automatic,
                    )
                })?;
                return Ok(std::process::Output {
                    status,
                    stdout,
                    stderr,
                });
            }
            Ok(None) => thread::sleep(Duration::from_millis(20)),
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(git_error(
                    ErrorCode::GitCommandFailed,
                    error.to_string(),
                    RetryClass::Automatic,
                ));
            }
        }
    }
}
fn git_error(code: ErrorCode, message: impl Into<String>, retry_class: RetryClass) -> XenicsError {
    let mut error = XenicsError::new(code, retry_class);
    error.message = message.into();
    error
}
