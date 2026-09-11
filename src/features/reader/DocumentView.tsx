import { AlertTriangle } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'
import { CodeBlock } from './CodeBlock'

export type ReaderInlineSpan = {
  type: 'text' | 'emphasis' | 'strong' | 'inlineCode' | 'link'
  text?: string
  target?: string
  children?: ReaderInlineSpan[]
}

export type ReaderBlock = {
  type: 'heading' | 'paragraph' | 'code' | 'image' | 'table' | 'warning' | 'embed'
  text: string
  level?: number
  language?: string
  target?: string
  url?: string
  inline?: ReaderInlineSpan[]
  headers?: ReaderInlineSpan[][]
  rows?: ReaderInlineSpan[][][]
  location?: { line: number; column: number }
}

export type ReaderLink = {
  label: string
  target: string
}

export type ReaderNavigationItem = {
  label: string
  path: string
  children?: ReaderNavigationItem[]
}

export type ReaderDocument = {
  title: string
  source: string
  blocks: ReaderBlock[]
  links?: ReaderLink[]
  navigation?: ReaderNavigationItem[]
  focusLocation?: { line: number; column: number }
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

function headingAnchor(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function renderParagraph(
  text: string,
  links: ReaderLink[] | undefined,
  onInternalLink: ((link: ReaderLink) => void) | undefined,
  onExternalLink: ((link: ReaderLink) => void) | undefined,
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
          if (link.target.startsWith('http://') || link.target.startsWith('https://')) {
            event.preventDefault()
            onExternalLink?.(link)
            return
          }
          event.preventDefault()
          onInternalLink?.(link)
        }}
      >
        {link.label}
      </a>
    )
  })
}

function inlineText(spans: ReaderInlineSpan[]): string {
  return spans.map((span) => span.text ?? inlineText(span.children ?? [])).join('')
}

function renderInlineSpans(
  spans: ReaderInlineSpan[],
  onInternalLink: ((link: ReaderLink) => void) | undefined,
  onExternalLink: ((link: ReaderLink) => void) | undefined,
): ReactNode {
  return spans.map((span, index) => {
    const key = `${span.type}-${index}`
    const children = renderInlineSpans(span.children ?? [], onInternalLink, onExternalLink)

    switch (span.type) {
      case 'text':
        return <span key={key}>{span.text}</span>
      case 'emphasis':
        return <em key={key}>{children}</em>
      case 'strong':
        return <strong key={key}>{children}</strong>
      case 'inlineCode':
        return <code key={key} className="rounded bg-x-panel px-1.5 py-0.5 font-mono text-[0.9em] text-x-ink">{span.text}</code>
      case 'link': {
        const link = { label: inlineText(span.children ?? []), target: span.target ?? '' }
        return (
          <a
            key={key}
            href={`#reader-link-${encodeURIComponent(link.target)}`}
            className="text-x-mint-strong underline decoration-x-mint-strong/40 underline-offset-4 hover:decoration-x-mint-strong"
            onClick={(event) => {
              event.preventDefault()
              if (link.target.startsWith('http://') || link.target.startsWith('https://')) {
                onExternalLink?.(link)
                return
              }
              onInternalLink?.(link)
            }}
          >
            {children}
          </a>
        )
      }
    }
  })
}

function renderBlock(
  block: ReaderBlock,
  index: number,
  links: ReaderLink[] | undefined,
  onInternalLink: ((link: ReaderLink) => void) | undefined,
  onExternalLink: ((link: ReaderLink) => void) | undefined,
  focusLocation: { line: number; column: number } | undefined,
  focusAnchor: string | undefined,
): ReactNode {
  const key = `${block.type}-${index}`
  const isFocused = focusLocation !== undefined && block.location?.line === focusLocation.line
  const focusProps = block.location ? { 'data-reader-line': block.location.line, 'data-reader-focused': isFocused ? 'true' : 'false' } : {}

  switch (block.type) {
    case 'code':
      return <div key={key} {...focusProps} className={isFocused ? 'rounded-lg ring-2 ring-x-amber/60 ring-offset-2' : ''}><CodeBlock code={block.text} language={block.language} /></div>
    case 'image':
      return block.url && isSafeLocalAsset(block.url) ? (
        <figure key={key} {...focusProps} className="overflow-hidden rounded-2xl border border-x-line bg-x-paper">
          <img src={block.url} alt={block.text} loading="lazy" className="mx-auto max-h-[32rem] object-contain" />
          <figcaption className="border-t border-x-line px-4 py-2 text-sm text-x-muted">{block.text}</figcaption>
        </figure>
      ) : (
        <p key={key} {...focusProps} className="rounded-xl border border-dashed border-x-line p-4 text-sm text-x-muted">Image unavailable offline: {block.text}</p>
      )
    case 'warning':
      return (
        <aside {...focusProps}
          key={key}
          aria-label="Content warning"
          className="flex gap-3 rounded-xl border border-x-amber/40 bg-x-amber/10 p-4 text-sm"
        >
          <AlertTriangle aria-hidden="true" className="shrink-0" size={18} />
          <span>{block.text}</span>
        </aside>
      )
    case 'embed':
      return (
        <aside key={key} className="rounded-xl border border-dashed border-x-line bg-x-paper p-5" aria-label="Unsupported offline embed">
          <p className="text-sm font-semibold">{block.text}</p>
          <p className="mt-1 text-sm text-x-muted">This interactive content is unavailable offline.</p>
          {block.target && <button type="button" onClick={() => onExternalLink?.({ label: block.text, target: block.target! })} className="mt-3 rounded-lg bg-x-ink px-3 py-2 text-sm font-semibold text-x-paper">Open in browser</button>}
        </aside>
      )
    case 'heading': {
      const Heading = getHeadingTag(block.level)
      const anchor = headingAnchor(block.text)
      const isAnchorFocused = focusAnchor !== undefined && anchor === headingAnchor(focusAnchor)
      return (
        <Heading key={key} id={anchor || undefined} {...focusProps} data-reader-focused={isAnchorFocused || isFocused ? 'true' : 'false'} className="pt-4 text-2xl font-semibold tracking-tight">
          {block.inline ? renderInlineSpans(block.inline, onInternalLink, onExternalLink) : block.text}
        </Heading>
      )
    }
    case 'paragraph':
      // React escapes text nodes, so untrusted repository content is never treated as HTML.
      return (
        <p key={key} {...focusProps} className="text-base leading-8 text-x-muted">
          {block.inline
            ? renderInlineSpans(block.inline, onInternalLink, onExternalLink)
            : renderParagraph(block.text, links, onInternalLink, onExternalLink)}
        </p>
      )
    case 'table':
      return (
        <div key={key} {...focusProps} className="overflow-x-auto rounded-xl border border-x-line">
          <table aria-label="Documentation table" className="w-full min-w-max border-collapse text-left text-sm">
            <thead className="bg-x-panel text-x-ink">
              <tr>
                {(block.headers ?? []).map((cell, cellIndex) => (
                  <th key={`header-${cellIndex}`} scope="col" className="border-b border-x-line px-4 py-3 font-semibold">
                    {renderInlineSpans(cell, onInternalLink, onExternalLink)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-x-muted">
              {(block.rows ?? []).map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-b border-x-line last:border-b-0">
                  {row.map((cell, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`} className="px-4 py-3 align-top">
                      {renderInlineSpans(cell, onInternalLink, onExternalLink)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

function isSafeLocalAsset(url: string): boolean {
  return !url.startsWith('/')
    && !url.startsWith('\\')
    && !/^[a-z][a-z\d+.-]*:/i.test(url)
    && !url.split('/').includes('..')
}

export function DocumentView({
  document,
  onInternalLink,
  onExternalLink,
  zoom = 100,
  density = 'comfortable',
  focusLocation,
  focusAnchor,
}: {
  document: ReaderDocument
  onInternalLink?: (link: ReaderLink) => void
  onExternalLink?: (link: ReaderLink) => void
  zoom?: number
  density?: 'comfortable' | 'compact'
  focusLocation?: { line: number; column: number }
  focusAnchor?: string
}): ReactNode {
  const densityClass = density === 'compact' ? 'space-y-3' : 'space-y-6'
  return (
    <article className="mx-auto max-w-3xl animate-[fade-in_.2s_ease-out]">
      <div className="mb-10 border-b border-x-line pb-7">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-x-mint-strong">
          {document.source}
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight">{document.title}</h1>
      </div>
      <div className={densityClass} style={{ fontSize: `${zoom}%` }}>
        {document.blocks.map((block, index) => renderBlock(block, index, document.links, onInternalLink, onExternalLink, focusLocation, focusAnchor))}
      </div>
    </article>
  )
}
