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
        self.database.query_documents(&normalize_query(query))
    }
}
fn normalize_query(query: &str) -> String {
    query
        .split_whitespace()
        .map(|token| {
            if token.chars().any(|c| ":._-".contains(c)) {
                format!("\"{}\"", token.replace('"', ""))
            } else {
                token.replace('"', "")
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}
