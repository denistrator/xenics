#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NotificationKind {
    Completed,
    Failed,
}

pub fn should_notify(app_is_focused: bool, enabled: bool, _kind: NotificationKind) -> bool {
    enabled && !app_is_focused
}

#[cfg(test)]
mod tests {
    use super::{should_notify, NotificationKind};

    #[test]
    fn notifications_are_only_allowed_when_unfocused_and_enabled() {
        assert!(should_notify(false, true, NotificationKind::Completed));
        assert!(!should_notify(true, true, NotificationKind::Failed));
        assert!(!should_notify(false, false, NotificationKind::Failed));
    }
}
