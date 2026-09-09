import { AlertTriangle } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'
import { CodeBlock } from './CodeBlock'

type ReaderBlock = {
  type: 'heading' | 'paragraph' | 'code' | 'warning'
  text: string
  level?: number
  language?: string
}

export type ReaderDocument = {
  title: string
  source: string
  blocks: ReaderBlock[]
}

const headingTags = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6',
} as const

function getHeadingTag(level = 2): ElementType {
  const safeLevel = Number.isFinite(level) ? Math.trunc(level) : 2
  const normalizedLevel = Math.min(Math.max(safeLevel, 1), 6) as keyof typeof headingTags
  return headingTags[normalizedLevel]
}

function renderBlock(block: ReaderBlock, index: number): ReactNode {
  const key = `${block.type}-${index}`

  switch (block.type) {
    case 'code':
      return <CodeBlock key={key} code={block.text} language={block.language} />
    case 'warning':
      return (
        <aside
          key={key}
          aria-label="Content warning"
          className="flex gap-3 rounded-xl border border-x-amber/40 bg-x-amber/10 p-4 text-sm"
        >
          <AlertTriangle aria-hidden="true" className="shrink-0" size={18} />
          <span>{block.text}</span>
        </aside>
      )
    case 'heading': {
      const Heading = getHeadingTag(block.level)
      return (
        <Heading key={key} className="pt-4 text-2xl font-semibold tracking-tight">
          {block.text}
        </Heading>
      )
    }
    case 'paragraph':
      // React escapes text nodes, so untrusted repository content is never treated as HTML.
      return (
        <p key={key} className="text-base leading-8 text-x-muted">
          {block.text}
        </p>
      )
  }
}

export function DocumentView({ document }: { document: ReaderDocument }): ReactNode {
  return (
    <article className="mx-auto max-w-3xl animate-[fade-in_.2s_ease-out]">
      <div className="mb-10 border-b border-x-line pb-7">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-x-mint-strong">
          {document.source}
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight">{document.title}</h1>
      </div>
      <div className="space-y-6">{document.blocks.map(renderBlock)}</div>
    </article>
  )
}
