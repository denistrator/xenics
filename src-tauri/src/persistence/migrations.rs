use rusqlite::Connection;

pub fn apply_user(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(include_str!("../../migrations/user/0001_initial.sql"))
}

pub fn apply_search(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(include_str!("../../migrations/search/0001_fts.sql"))
}
