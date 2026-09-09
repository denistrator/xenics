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
