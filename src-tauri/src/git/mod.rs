mod classifier;
mod progress;
mod service;

pub use classifier::classify_git_failure;
pub use progress::CancellationToken;
pub use service::{
    GitCommand, GitPrerequisites, GitRequest, GitResult, GitService, RemoteIdentity,
    WorkingTreeStatus,
};

#[cfg(test)]
mod tests;
