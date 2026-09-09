use super::{CancellableTaskOperation, RetryPlan, TaskManager, TaskOperation};
use crate::{
    core::models::TaskState,
    diagnostics::error::{ErrorCode, RetryClass, XenicsError},
    persistence::UserDb,
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

#[test]
fn task_transitions_are_persisted_for_recovery() {
    let database = Arc::new(UserDb::open_in_memory().unwrap());
    let manager = TaskManager::new_with_store(Arc::clone(&database));
    let task = manager.submit(Arc::new(|| Ok(())));

    for _ in 0..20 {
        if manager.snapshot_for(&task).unwrap().state == TaskState::Succeeded {
            break;
        }
        thread::sleep(Duration::from_millis(10));
    }

    assert_eq!(database.task_record_count().unwrap(), 1);
}

#[test]
fn cancellable_operations_receive_the_cancel_signal_before_completion() {
    let finished = Arc::new(std::sync::atomic::AtomicBool::new(false));
    let operation_finished = Arc::clone(&finished);
    let operation: CancellableTaskOperation = Arc::new(move |cancellation| {
        while !cancellation.is_cancelled() {
            thread::yield_now();
        }
        operation_finished.store(true, std::sync::atomic::Ordering::Release);
        Ok(())
    });
    let manager = TaskManager::new();
    let task = manager.submit_cancellable(operation);

    for _ in 0..20 {
        if manager.snapshot_for(&task).unwrap().state == TaskState::Running {
            break;
        }
        thread::sleep(Duration::from_millis(5));
    }
    manager.cancel(&task).unwrap();

    for _ in 0..20 {
        if manager.snapshot_for(&task).unwrap().state == TaskState::Canceled {
            assert!(finished.load(std::sync::atomic::Ordering::Acquire));
            return;
        }
        thread::sleep(Duration::from_millis(5));
    }
    panic!("cancellable task did not finish after its operation received cancellation");
}
