import { AlertTriangle } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'
import { CodeBlock } from './CodeBlock'

type ReaderBlock = {
  type: 'heading' | 'paragraph' | 'code' | 'warning'
  text: string
  level?: number
  language?: string
}

export type ReaderLink = {
  label: string
  target: string
}

export type ReaderDocument = {
  title: string
  source: string
  blocks: ReaderBlock[]
  links?: ReaderLink[]
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

function renderParagraph(
  text: string,
  links: ReaderLink[] | undefined,
  onInternalLink: ((link: ReaderLink) => void) | undefined,
): ReactNode {
  if (!links?.length) return text

  const linkByLabel = new Map(links.map((link) => [link.label, link]))
  const parts = text.split(/(\[[^\]]+\]\([^)]*\))/g)
  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]*)\)$/)
    if (!match) return <span key={`text-${index}`}>{part}</span>

    const link = linkByLabel.get(match[1])
    if (!link) return <span key={`text-${index}`}>{part}</span>
    return (
      <a
        key={`link-${index}`}
        href={`#reader-link-${encodeURIComponent(link.target)}`}
        className="text-x-mint-strong underline decoration-x-mint-strong/40 underline-offset-4 hover:decoration-x-mint-strong"
        onClick={(event) => {
          if (link.target.startsWith('http://') || link.target.startsWith('https://')) return
          event.preventDefault()
          onInternalLink?.(link)
        }}
      >
        {link.label}
      </a>
    )
  })
}

function renderBlock(
  block: ReaderBlock,
  index: number,
  links: ReaderLink[] | undefined,
  onInternalLink: ((link: ReaderLink) => void) | undefined,
): ReactNode {
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
          {renderParagraph(block.text, links, onInternalLink)}
        </p>
      )
  }
}

export function DocumentView({
  document,
  onInternalLink,
  zoom = 100,
}: {
  document: ReaderDocument
  onInternalLink?: (link: ReaderLink) => void
  zoom?: number
}): ReactNode {
  return (
    <article className="mx-auto max-w-3xl animate-[fade-in_.2s_ease-out]">
      <div className="mb-10 border-b border-x-line pb-7">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-x-mint-strong">
          {document.source}
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight">{document.title}</h1>
      </div>
      <div className="space-y-6" style={{ fontSize: `${zoom}%` }}>
        {document.blocks.map((block, index) => renderBlock(block, index, document.links, onInternalLink))}
      </div>
    </article>
  )
}
