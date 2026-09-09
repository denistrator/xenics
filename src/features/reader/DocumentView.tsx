import { AlertTriangle } from 'lucide-react'
import type { ElementType } from 'react'
import { CodeBlock } from './CodeBlock'

export type ReaderDocument = {
  title: string
  source: string
  blocks: Array<{ type: 'heading' | 'paragraph' | 'code' | 'warning'; text: string; level?: number; language?: string }>
}

export function DocumentView({ document }: { document: ReaderDocument }) {
  return <article className="mx-auto max-w-3xl animate-[fade-in_.2s_ease-out]">
    <div className="mb-10 border-b border-x-line pb-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-x-mint-strong">{document.source}</p><h1 className="mt-3 font-display text-4xl tracking-tight">{document.title}</h1></div>
    <div className="space-y-6">{document.blocks.map((block, index) => {
      if (block.type === 'code') return <CodeBlock key={index} code={block.text} language={block.language} />
      if (block.type === 'warning') return <aside key={index} className="flex gap-3 rounded-xl border border-x-amber/40 bg-x-amber/10 p-4 text-sm"><AlertTriangle size={18} className="shrink-0" /><span>{block.text}</span></aside>
      if (block.type === 'heading') { const Heading = `h${Math.min(block.level ?? 2, 6)}` as ElementType; return <Heading key={index} className="pt-4 text-2xl font-semibold tracking-tight">{block.text}</Heading> }
      return <p key={index} className="text-base leading-8 text-x-muted">{block.text.replace(/<[^>]+>/g, '')}</p>
    })}</div>
  </article>
}
