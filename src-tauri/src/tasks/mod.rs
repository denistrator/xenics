mod manager;
mod recovery;
mod retry;

pub use manager::{
    CancellableTaskOperation, TaskEventSink, TaskManager, TaskOperation, TaskSnapshot,
};
pub use recovery::reconcile_snapshots;
pub use retry::RetryPlan;

#[cfg(test)]
mod tests;
