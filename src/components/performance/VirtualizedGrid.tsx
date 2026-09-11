import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, type ReactNode } from 'react'

type VirtualizedGridProps<Item> = {
  items: Item[]
  renderItem: (item: Item, index: number) => ReactNode
  columns?: number
  estimateRowSize?: number
  threshold?: number
}

export function VirtualizedGrid<Item>({
  items,
  renderItem,
  columns = 3,
  estimateRowSize = 300,
  threshold = 12,
}: VirtualizedGridProps<Item>): ReactNode {
  const parentRef = useRef<HTMLDivElement>(null)
  const rows = useMemo(() => {
    const grouped: Item[][] = []
    for (let index = 0; index < items.length; index += columns) grouped.push(items.slice(index, index + columns))
    return grouped
  }, [columns, items])
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowSize,
    overscan: 3,
  })

  if (items.length <= threshold) {
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item, index) => <div key={index}>{renderItem(item, index)}</div>)}</div>
  }

  const virtualRows = virtualizer.getVirtualItems()

  return (
    <div ref={parentRef} data-testid="virtualized-grid" className="max-h-[48rem] overflow-auto">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualRows.length === 0
          ? rows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {row.map((item, offset) => (
                <div key={`${rowIndex}-${offset}`}>{renderItem(item, rowIndex * columns + offset)}</div>
              ))}
            </div>
          ))
          : virtualRows.map((virtualRow) => (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {rows[virtualRow.index].map((item, offset) => (
              <div key={`${virtualRow.index}-${offset}`}>{renderItem(item, virtualRow.index * columns + offset)}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
