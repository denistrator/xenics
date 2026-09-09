use super::{Availability, Clock, UpdateCheckService, UpdateSchedule};
use crate::core::ids::SourceId;
use std::sync::{Arc, Mutex};

struct TestClock(Mutex<i64>);
impl Clock for TestClock {
    fn now(&self) -> i64 {
        *self.0.lock().unwrap()
    }
}

fn service(now: i64) -> (Arc<TestClock>, UpdateCheckService<TestClock>, SourceId) {
    let clock = Arc::new(TestClock(Mutex::new(now)));
    let service = UpdateCheckService::new(Arc::clone(&clock));
    let source = SourceId::from("react");
    service.register_source(source.clone());
    (clock, service, source)
}

#[test]
fn on_launch_checks_each_source_once_and_deduplicates_overlap() {
    let (_, service, source) = service(100);
    assert_eq!(service.on_startup(), vec![source.clone()]);
    assert!(service.check_due(100).is_empty());
    service.finish_check(&source, 100, true, false);
    assert!(service.check_due(100).is_empty());
}

#[test]
fn daily_schedule_runs_when_due_and_only_once_after_an_overdue_restart() {
    let (clock, service, source) = service(100);
    service.apply_schedule(UpdateSchedule::Daily);
    assert_eq!(service.on_startup(), vec![source.clone()]);
    service.finish_check(&source, 100, true, false);
    *clock.0.lock().unwrap() = 86_500;
    assert_eq!(service.on_startup(), vec![source.clone()]);
    assert!(service.check_due(86_500).is_empty());
}

#[test]
fn disabled_schedule_never_checks_and_failures_keep_last_success() {
    let (_, service, source) = service(100);
    service.apply_schedule(UpdateSchedule::Weekly);
    service.finish_check(&source, 100, true, false);
    service.finish_check(&source, 200, false, false);
    let snapshot = service.snapshot(&source).unwrap();
    assert_eq!(snapshot.availability, Availability::Unknown);
    assert_eq!(snapshot.last_successful_check, Some(100));
    service.apply_schedule(UpdateSchedule::Disabled);
    assert!(service.on_startup().is_empty());
}
