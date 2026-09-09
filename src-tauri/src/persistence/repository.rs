#[derive(Debug, Eq, PartialEq)]
pub struct RebuildReport {
    pub source_id: String,
    pub documents_removed: u64,
}
