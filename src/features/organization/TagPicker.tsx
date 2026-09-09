import { Plus, Tag as TagIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Tag } from './organization-model'

type TagPickerProps = {
  tags: Tag[]
  selected: string[]
  onToggle: (tagId: string) => void
  onCreateTag?: () => void
}

export function TagPicker({ tags, selected, onToggle, onCreateTag }: TagPickerProps): ReactNode {
  const selectedTagIds = new Set(selected)

  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-x-muted">
        <TagIcon aria-hidden="true" size={14} />
        Tags
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.has(tag.id)

          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(tag.id)}
              className={`rounded-full px-3 py-2 text-xs font-semibold ${isSelected ? 'bg-x-mint text-x-ink' : 'bg-x-paper text-x-muted'}`}
            >
              {tag.name}
            </button>
          )
        })}
        <button
          type="button"
          aria-label="Create tag"
          onClick={onCreateTag}
          className="rounded-full bg-x-paper px-3 py-2 text-x-muted"
        >
          <Plus aria-hidden="true" size={14} />
        </button>
      </div>
    </div>
  )
}
