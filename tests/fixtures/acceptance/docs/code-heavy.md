# Code-heavy examples

```rust
pub async fn open_database(path: &Path) -> Result<Connection, XenicsError> {
    let connection = Connection::open(path)?;
    connection.pragma_update(None, "journal_mode", "WAL")?;
    Ok(connection)
}
```

```typescript
export async function runTask(signal: AbortSignal): Promise<void> {
  await fetch('/sources', { signal })
}
```

```tsx
export function ReaderPage() {
  const [isOpen, setIsOpen] = useState(false)
  return <button onClick={() => setIsOpen(true)}>Open reader</button>
}
```

The implementation uses `CancellationToken`, `AbortSignal`, `rusqlite`, `tauri`, and `useEffect` where appropriate.
