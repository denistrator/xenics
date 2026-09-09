import { Plus, Tag as TagIcon } from 'lucide-react'
import type { Tag } from './organization-model'

type TagPickerProps = {
  tags: Tag[]
  selected: string[]
  onToggle: (tagId: string) => void
}

export function TagPicker({ tags, selected, onToggle }: TagPickerProps) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-x-muted">
        <TagIcon size={14} />
        Tags
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selected.includes(tag.id)

          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(tag.id)}
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                isSelected ? 'bg-x-mint text-x-ink' : 'bg-x-paper text-x-muted'
              }`}
            >
              {tag.name}
            </button>
          )
        })}
        <button
          type="button"
          aria-label="Create tag"
          className="rounded-full bg-x-paper px-3 py-2 text-x-muted"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}
