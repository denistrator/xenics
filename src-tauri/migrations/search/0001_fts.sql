CREATE VIRTUAL TABLE IF NOT EXISTS documents USING fts5(
    source_id UNINDEXED,
    path UNINDEXED,
    title,
    headings,
    prose,
    code,
    metadata,
    api_name,
    tokenize = 'unicode61'
);

CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY NOT NULL
);

INSERT OR IGNORE INTO schema_migrations(id) VALUES ('search-0001');
