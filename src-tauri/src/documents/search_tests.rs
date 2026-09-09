use super::{Indexer, SearchService};
use crate::{git::CancellationToken, persistence::SearchDb};
use std::fs;
use tempfile::tempdir;

#[test]
fn identifier_queries_rank_exact_titles_first() {
    let root = tempdir().unwrap();
    fs::write(
        root.path().join("api.md"),
        "# std::vector\nUse std::vector here",
    )
    .unwrap();
    fs::write(
        root.path().join("guide.md"),
        "# Guide\nThe body mentions std::vector",
    )
    .unwrap();
    let db = SearchDb::open_in_memory().unwrap();
    Indexer::new(&db, root.path())
        .index_source("cpp", &CancellationToken::default())
        .unwrap();
    let results = SearchService::new(&db).query("std::vector").unwrap();
    assert_eq!(results[0].title, "std::vector");
}
