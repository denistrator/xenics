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

CREATE TABLE IF NOT EXISTS document_locations (
    source_id TEXT NOT NULL,
    path TEXT NOT NULL,
    line INTEGER NOT NULL,
    column_number INTEGER NOT NULL,
    PRIMARY KEY (source_id, path)
);

CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY NOT NULL
);

INSERT OR IGNORE INTO schema_migrations(id) VALUES ('search-0001');
