use super::{RetryPlan, TaskManager, TaskOperation};
use crate::{
    core::models::TaskState,
    diagnostics::error::{ErrorCode, RetryClass, XenicsError},
};
use std::{
    sync::{Arc, Condvar, Mutex},
    thread,
    time::Duration,
};

#[test]
fn cancellation_waits_for_operation_exit_before_becoming_canceled() {
    let gate = Arc::new((Mutex::new(false), Condvar::new()));
    let operation_gate = Arc::clone(&gate);
    let operation: TaskOperation = Arc::new(move || {
        let (lock, signal) = &*operation_gate;
        let mut released = lock.lock().unwrap();
        while !*released {
            released = signal.wait(released).unwrap();
        }
        Ok(())
    });
    let manager = TaskManager::new();
    let task = manager.submit(operation);
    thread::sleep(Duration::from_millis(20));
    manager.cancel(&task).unwrap();
    assert_eq!(
        manager.snapshot_for(&task).unwrap().state,
        TaskState::Canceling
    );
    let (lock, signal) = &*gate;
    *lock.lock().unwrap() = true;
    signal.notify_one();
    for _ in 0..20 {
        if manager.snapshot_for(&task).unwrap().state == TaskState::Canceled {
            return;
        }
        thread::sleep(Duration::from_millis(10));
    }
    panic!("task did not reach canceled state");
}

#[test]
fn only_transient_network_failures_receive_two_automatic_retries() {
    let plan = RetryPlan::for_error(ErrorCode::RemoteUnavailable);
    assert_eq!(plan.delays_seconds(), vec![2, 10]);
    assert!(RetryPlan::for_error(ErrorCode::GitAuthentication).is_manual_only());
}

#[test]
fn failed_task_can_be_retried_with_the_same_operation() {
    let manager = TaskManager::new();
    let operation: TaskOperation = Arc::new(|| {
        let mut error = XenicsError::new(ErrorCode::RemoteUnavailable, RetryClass::Automatic);
        error.message = "offline".into();
        Err(error)
    });
    let task = manager.submit(operation);
    for _ in 0..20 {
        if manager.snapshot_for(&task).unwrap().state == TaskState::Failed {
            break;
        }
        thread::sleep(Duration::from_millis(10));
    }
    let retry = manager.retry(&task).unwrap();
    assert_ne!(task, retry);
}
