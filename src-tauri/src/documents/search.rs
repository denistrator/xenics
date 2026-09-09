use crate::{
    diagnostics::error::XenicsError,
    persistence::{SearchDb, SearchHit},
};

pub struct SearchService<'a> {
    database: &'a SearchDb,
}
impl<'a> SearchService<'a> {
    pub fn new(database: &'a SearchDb) -> Self {
        Self { database }
    }
    pub fn query(&self, query: &str) -> Result<Vec<SearchHit>, XenicsError> {
        let normalized = normalize_query(query);
        if normalized.is_empty() {
            return Ok(Vec::new());
        }
        self.database.query_documents(&normalized)
    }
}
fn normalize_query(query: &str) -> String {
    query
        .split_whitespace()
        .filter_map(|token| {
            let token = token.replace('"', "");
            let (value, is_prefix) = token
                .strip_suffix('*')
                .map_or((token.as_str(), false), |value| (value, true));
            if value.is_empty() {
                return None;
            }

            if is_prefix {
                Some(format!("\"{}\"*", value))
            } else {
                Some(format!("\"{}\"", value))
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}
