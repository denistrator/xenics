use super::TaskSnapshot;
use crate::core::models::TaskState;

pub fn reconcile_snapshots(snapshots: &mut [TaskSnapshot]) -> Vec<TaskSnapshot> {
    for snapshot in snapshots.iter_mut() {
        if !snapshot.state.is_terminal() {
            snapshot.state = TaskState::Interrupted;
        }
    }
    snapshots.to_vec()
}
