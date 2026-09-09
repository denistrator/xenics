export type SelectableItem = { id: string; selectable?: boolean }

export function selectRange(items: SelectableItem[], from: number, to: number): string[] {
  const start = Math.min(from, to)
  const end = Math.max(from, to)

  return items
    .slice(start, end + 1)
    .filter((item) => item.selectable !== false)
    .map((item) => item.id)
}

export function toggleSelection(selected: string[], id: string): string[] {
  return selected.includes(id)
    ? selected.filter((value) => value !== id)
    : [...selected, id]
}
