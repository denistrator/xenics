# Xenics API reference

## RepositoryCapability

`RepositoryCapability` is one of `Readable`, `PartiallyReadable`, `FilesOnly`, or `WebsiteOnly`.

Readable capability is indexed and rendered for offline reading.

## TaskEvent

`TaskEvent` includes `taskId`, `sequence`, `phase`, `progress`, and `state`.

The Canceling state is observable while a task is stopping.

## XenicsError

`XenicsError` includes `sourceId`, `documentId`, `taskId`, `retryClass`, and `diagnosticId`.

## Search database

The disposable search database uses SQLite WAL mode and FTS5. A rebuild must not delete durable bookmarks.

## Endpoint

`POST /sources/{repoId}/documents` indexes a source. The `{repoId}` path parameter identifies the repository.
