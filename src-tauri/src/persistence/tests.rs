use super::{SearchDb, UserDb};
use tempfile::tempdir;

#[test]
fn rebuilding_search_does_not_delete_user_bookmarks() {
    let directory = tempdir().unwrap();
    let user = UserDb::open(directory.path().join("user.sqlite")).unwrap();
    let search = SearchDb::open(directory.path().join("search.sqlite")).unwrap();
    user.insert_bookmark("source-1", "main", "docs/start.md")
        .unwrap();
    search.rebuild("source-1").unwrap();
    assert_eq!(user.bookmark_count().unwrap(), 1);
}

#[test]
fn fts5_is_available_in_the_packaged_sqlite_build() {
    let db = SearchDb::open_in_memory().unwrap();
    assert!(db.fts5_available().unwrap());
}

#[test]
fn both_databases_enable_wal_and_migrations_are_idempotent() {
    let directory = tempdir().unwrap();
    let user_path = directory.path().join("user.sqlite");
    let search_path = directory.path().join("search.sqlite");
    let user = UserDb::open(&user_path).unwrap();
    let search = SearchDb::open(&search_path).unwrap();
    assert_eq!(user.journal_mode().unwrap(), "wal");
    assert_eq!(search.journal_mode().unwrap(), "wal");
    drop(user);
    drop(search);
    UserDb::open(&user_path).unwrap();
    SearchDb::open(&search_path).unwrap();
}

#[test]
fn task_records_are_durable_and_upsertable() {
    let db = UserDb::open_in_memory().unwrap();
    db.upsert_task_record("task-1", "Running", "{\"phase\":\"clone\"}")
        .unwrap();
    db.upsert_task_record("task-1", "Succeeded", "{\"phase\":\"complete\"}")
        .unwrap();
    assert_eq!(db.task_record_count().unwrap(), 1);
}

#[test]
fn source_records_are_durable_and_listed_in_creation_order() {
    let db = UserDb::open_in_memory().unwrap();
    db.upsert_source(
        "react",
        "React",
        "Readable",
        Some("main"),
        Some("https://example.test/react"),
        None,
    )
    .unwrap();
    db.upsert_source(
        "rust",
        "Rust",
        "Readable",
        Some("stable"),
        Some("https://example.test/rust"),
        None,
    )
    .unwrap();

    let sources = db.list_sources().unwrap();
    assert_eq!(
        sources
            .iter()
            .map(|source| source.id.as_str())
            .collect::<Vec<_>>(),
        ["react", "rust"]
    );
    assert_eq!(sources[0].selected_ref.as_deref(), Some("main"));
}

#[test]
fn bookmarks_are_upserted_and_listed_without_duplicates() {
    let db = UserDb::open_in_memory().unwrap();
    let first = db
        .save_bookmark("react", "main", "docs/start.md", Some("install"))
        .unwrap();
    let second = db
        .save_bookmark("react", "main", "docs/start.md", Some("advanced"))
        .unwrap();

    assert_eq!(first, second);
    let bookmarks = db.list_bookmarks().unwrap();
    assert_eq!(bookmarks.len(), 1);
    assert_eq!(bookmarks[0].anchor.as_deref(), Some("advanced"));
}

#[test]
fn collections_and_tags_are_created_idempotently() {
    let db = UserDb::open_in_memory().unwrap();

    assert_eq!(
        db.create_collection("Frontend").unwrap(),
        "collection:frontend"
    );
    assert_eq!(
        db.create_collection("Frontend").unwrap(),
        "collection:frontend"
    );
    assert_eq!(db.create_tag("Important").unwrap(), "tag:important");
    assert_eq!(db.create_tag("Important").unwrap(), "tag:important");
    assert_eq!(db.list_collections().unwrap().len(), 1);
    assert_eq!(db.list_tags().unwrap().len(), 1);
}

#[test]
fn bookmarks_can_be_assigned_to_collections_and_tags_idempotently() {
    let db = UserDb::open_in_memory().unwrap();
    let bookmark_id = db
        .save_bookmark("react", "main", "docs/start.md", None)
        .unwrap();
    let collection_id = db.create_collection("Reading list").unwrap();
    let tag_id = db.create_tag("Important").unwrap();

    db.assign_collection(bookmark_id, &collection_id, true)
        .unwrap();
    db.assign_collection(bookmark_id, &collection_id, true)
        .unwrap();
    db.assign_tag(bookmark_id, &tag_id, true).unwrap();
    assert_eq!(
        db.list_bookmark_collections(bookmark_id).unwrap(),
        vec![collection_id.clone()]
    );
    assert_eq!(
        db.list_bookmark_tags(bookmark_id).unwrap(),
        vec![tag_id.clone()]
    );
    db.assign_tag(bookmark_id, &tag_id, false).unwrap();
    assert!(db.list_bookmark_tags(bookmark_id).unwrap().is_empty());
}

#[test]
fn settings_are_upserted_and_read_as_json_values() {
    let db = UserDb::open_in_memory().unwrap();

    db.update_settings(serde_json::json!({ "theme": "dark", "density": "compact" }))
        .unwrap();

    assert_eq!(
        db.get_settings().unwrap(),
        serde_json::json!({ "theme": "dark", "density": "compact" })
    );
}

#[test]
fn reader_session_is_durable_and_defaults_to_an_empty_object() {
    let db = UserDb::open_in_memory().unwrap();
    assert_eq!(db.get_session().unwrap(), serde_json::json!({}));
    db.save_session(&serde_json::json!({ "activeTabId": "react:docs/start.md" }))
        .unwrap();
    assert_eq!(
        db.get_session().unwrap(),
        serde_json::json!({ "activeTabId": "react:docs/start.md" })
    );
}

#[test]
fn source_removal_is_idempotent_and_reports_whether_it_removed_a_record() {
    let db = UserDb::open_in_memory().unwrap();
    db.upsert_source("react", "React", "Readable", Some("main"), None, None)
        .unwrap();
    assert!(db.remove_source("react").unwrap());
    assert!(!db.remove_source("react").unwrap());
}

#[test]
fn removing_search_source_deletes_only_its_documents() {
    let db = SearchDb::open_in_memory().unwrap();
    db.replace_document("react", "docs/start.md", "Start", "", "react", "", "")
        .unwrap();
    db.replace_document("rust", "docs/start.md", "Start", "", "rust", "", "")
        .unwrap();
    assert_eq!(db.remove_source("react").unwrap(), 1);
    assert_eq!(db.query_documents("rust").unwrap().len(), 1);
    assert!(db.query_documents("react").unwrap().is_empty());
}

#[test]
fn removing_one_search_document_preserves_other_documents() {
    let db = SearchDb::open_in_memory().unwrap();
    db.replace_document("react", "a.md", "A", "", "alpha", "", "")
        .unwrap();
    db.replace_document("react", "b.md", "B", "", "beta", "", "")
        .unwrap();
    assert!(db.remove_document("react", "a.md").unwrap());
    assert!(!db.remove_document("react", "a.md").unwrap());
    assert_eq!(db.query_documents("beta").unwrap().len(), 1);
}
