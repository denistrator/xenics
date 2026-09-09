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

#[test]
fn search_supports_prefixes_for_punctuation_heavy_identifiers() {
    let root = tempdir().unwrap();
    fs::write(
        root.path().join("api.md"),
        "# std::vector\nUse std::vector here",
    )
    .unwrap();
    let db = SearchDb::open_in_memory().unwrap();
    Indexer::new(&db, root.path())
        .index_source("cpp", &CancellationToken::default())
        .unwrap();

    let results = SearchService::new(&db).query("std::vec*").unwrap();

    assert_eq!(results.len(), 1);
    assert!(results[0].path.ends_with("/api.md"));
}

#[test]
fn empty_search_queries_are_noops() {
    let db = SearchDb::open_in_memory().unwrap();

    let results = SearchService::new(&db).query("   ").unwrap();

    assert!(results.is_empty());
}

#[test]
fn search_treats_fts_operators_as_user_text() {
    let root = tempdir().unwrap();
    fs::write(root.path().join("api.md"), "# API\nA stable API reference.").unwrap();
    let db = SearchDb::open_in_memory().unwrap();
    Indexer::new(&db, root.path())
        .index_source("cpp", &CancellationToken::default())
        .unwrap();

    let results = SearchService::new(&db).query("OR *").unwrap();

    assert!(results.is_empty());
}
