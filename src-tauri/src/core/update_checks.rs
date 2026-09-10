use crate::core::ids::SourceId;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UpdateSchedule {
    OnLaunch,
    Daily,
    Weekly,
    Disabled,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum Availability {
    Unknown,
    Available,
    UpToDate,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct AvailabilitySnapshot {
    pub source_id: SourceId,
    pub availability: Availability,
    pub last_attempt: Option<i64>,
    pub last_successful_check: Option<i64>,
    pub next_due: Option<i64>,
}

pub trait Clock: Send + Sync {
    fn now(&self) -> i64;
}

#[derive(Default)]
pub struct SystemClock;
impl Clock for SystemClock {
    fn now(&self) -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64
    }
}

pub struct UpdateCheckService<C: Clock = SystemClock> {
    clock: Arc<C>,
    schedule: Mutex<UpdateSchedule>,
    snapshots: Mutex<HashMap<SourceId, AvailabilitySnapshot>>,
    in_flight: Mutex<HashSet<SourceId>>,
}

impl Default for UpdateCheckService<SystemClock> {
    fn default() -> Self {
        Self::new(Arc::new(SystemClock))
    }
}

impl<C: Clock> UpdateCheckService<C> {
    pub fn new(clock: Arc<C>) -> Self {
        Self {
            clock,
            schedule: Mutex::new(UpdateSchedule::OnLaunch),
            snapshots: Mutex::new(HashMap::new()),
            in_flight: Mutex::new(HashSet::new()),
        }
    }

    pub fn register_source(&self, source_id: SourceId) {
        self.snapshots
            .lock()
            .unwrap()
            .entry(source_id.clone())
            .or_insert(AvailabilitySnapshot {
                source_id,
                availability: Availability::Unknown,
                last_attempt: None,
                last_successful_check: None,
                next_due: None,
            });
    }

    pub fn restore_snapshots(&self, snapshots: impl IntoIterator<Item = AvailabilitySnapshot>) {
        let mut stored = self.snapshots.lock().unwrap();
        for snapshot in snapshots {
            stored.insert(snapshot.source_id.clone(), snapshot);
        }
    }

    pub fn apply_schedule(&self, schedule: UpdateSchedule) {
        *self.schedule.lock().unwrap() = schedule;
        let now = self.clock.now();
        let interval = schedule.interval_seconds();
        for snapshot in self.snapshots.lock().unwrap().values_mut() {
            snapshot.next_due = match schedule {
                UpdateSchedule::Disabled => None,
                UpdateSchedule::OnLaunch => Some(now),
                _ => snapshot
                    .last_successful_check
                    .map(|last| last + interval.expect("interval schedule"))
                    .or(Some(now)),
            };
        }
    }

    pub fn schedule(&self) -> UpdateSchedule {
        *self.schedule.lock().unwrap()
    }

    pub fn on_startup(&self) -> Vec<SourceId> {
        if *self.schedule.lock().unwrap() == UpdateSchedule::OnLaunch {
            let now = self.clock.now();
            for snapshot in self.snapshots.lock().unwrap().values_mut() {
                if snapshot.last_attempt.is_none() {
                    snapshot.next_due = Some(now);
                }
            }
        }
        self.check_due(self.clock.now())
    }

    pub fn check_due(&self, now: i64) -> Vec<SourceId> {
        let schedule = *self.schedule.lock().unwrap();
        if schedule == UpdateSchedule::Disabled {
            return Vec::new();
        }
        let due: Vec<_> = self
            .snapshots
            .lock()
            .unwrap()
            .values()
            .filter(|snapshot| snapshot.next_due.map(|time| time <= now).unwrap_or(false))
            .map(|snapshot| snapshot.source_id.clone())
            .collect();
        let mut in_flight = self.in_flight.lock().unwrap();
        due.into_iter()
            .filter(|source_id| in_flight.insert(source_id.clone()))
            .collect()
    }

    pub fn finish_check(&self, source_id: &SourceId, now: i64, success: bool, available: bool) {
        if let Some(snapshot) = self.snapshots.lock().unwrap().get_mut(source_id) {
            snapshot.last_attempt = Some(now);
            if success {
                snapshot.last_successful_check = Some(now);
                snapshot.availability = if available {
                    Availability::Available
                } else {
                    Availability::UpToDate
                };
            } else {
                snapshot.availability = Availability::Unknown;
            }
            snapshot.next_due = self
                .schedule
                .lock()
                .unwrap()
                .interval_seconds()
                .map(|interval| now + interval);
        }
        self.in_flight.lock().unwrap().remove(source_id);
    }

    pub fn snapshot(&self, source_id: &SourceId) -> Option<AvailabilitySnapshot> {
        self.snapshots.lock().unwrap().get(source_id).cloned()
    }
    pub fn snapshots(&self) -> Vec<AvailabilitySnapshot> {
        self.snapshots.lock().unwrap().values().cloned().collect()
    }
}

impl UpdateSchedule {
    fn interval_seconds(self) -> Option<i64> {
        match self {
            Self::Daily => Some(86_400),
            Self::Weekly => Some(604_800),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests;
