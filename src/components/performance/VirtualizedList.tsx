import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, type ReactNode } from 'react'

type VirtualizedListProps<Item> = {
  items: Item[]
  renderItem: (item: Item, index: number) => ReactNode
  estimateSize?: number
  overscan?: number
  threshold?: number
  className?: string
}

export function VirtualizedList<Item>({
  items,
  renderItem,
  estimateSize = 88,
  overscan = 5,
  threshold = 12,
  className = 'space-y-3',
}: VirtualizedListProps<Item>): ReactNode {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  })

  if (items.length <= threshold) {
    return <div className={className}>{items.map((item, index) => <div key={index}>{renderItem(item, index)}</div>)}</div>
  }

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div ref={parentRef} data-testid="virtualized-list" className="max-h-[42rem] overflow-auto">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualItems.length === 0
          ? items.map((item, index) => <div key={index} className={className}>{renderItem(item, index)}</div>)
          : virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            className={className}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualItem.start}px)` }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
