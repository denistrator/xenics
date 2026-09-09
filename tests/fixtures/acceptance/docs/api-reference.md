# Xenics API reference

## RepositoryCapability

`RepositoryCapability` is one of `Readable`, `PartiallyReadable`, `FilesOnly`, or `WebsiteOnly`.

## TaskEvent

`TaskEvent` includes `taskId`, `sequence`, `phase`, `progress`, and `state`.

## XenicsError

`XenicsError` includes `sourceId`, `documentId`, `taskId`, `retryClass`, and `diagnosticId`.

## Search database

The disposable search database uses SQLite FTS5 and WAL mode. A rebuild must not delete durable bookmarks.

## Endpoint

`POST /sources/{repoId}/documents` indexes a source. The `{repoId}` path parameter identifies the repository.
