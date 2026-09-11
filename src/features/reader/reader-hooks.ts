import { useEffect, useState } from 'react'
import type { ReaderDocument, ReaderInlineSpan, ReaderLink } from './DocumentView'
import type { ReaderTarget } from './tab-state'
import { invokeCommand } from '../../lib/tauri'

type NativeLocation = { line: number; column: number }
type NativeInlineSpan = ReaderInlineSpan
type NativeBlock = {
  type: 'heading' | 'paragraph' | 'code' | 'image' | 'table'
  text: string
  level?: number
  language?: string
  url?: string
  inline?: NativeInlineSpan[]
  headers?: NativeInlineSpan[][]
  rows?: NativeInlineSpan[][][]
  location: NativeLocation
}
type NativeDocument = {
  path: string
  blocks: NativeBlock[]
  links: Array<{ label: string; target: string; location: NativeLocation }>
  warnings: Array<{ code: string; message: string; location?: NativeLocation }>
}

export type ReaderLoadState = {
  document?: ReaderDocument
  error?: string
  loading: boolean
}

export function toReaderDocument(document: NativeDocument, target: ReaderTarget): ReaderDocument {
  return {
    title: target.title,
    source: `${target.sourceId} · ${target.refName}`,
    links: document.links.map(({ label, target: linkTarget }): ReaderLink => ({ label, target: linkTarget })),
    blocks: [
      ...document.blocks.map((block) => ({
        type: block.type,
        text: block.text,
        ...(block.level === undefined ? {} : { level: block.level }),
        ...(block.language === undefined ? {} : { language: block.language }),
        ...(block.url === undefined ? {} : { url: block.url }),
        ...(block.inline === undefined ? {} : { inline: block.inline }),
        ...(block.headers === undefined ? {} : { headers: block.headers }),
        ...(block.rows === undefined ? {} : { rows: block.rows }),
        location: block.location,
      })),
      ...document.warnings.map((warning) => ({ type: 'warning' as const, text: warning.message })),
    ],
    focusLocation: target.location,
  }
}

export function useReaderDocument(target: ReaderTarget | undefined): ReaderLoadState {
  const [state, setState] = useState<ReaderLoadState>({ loading: Boolean(target) })

  useEffect(() => {
    if (!target) {
      setState({ loading: false })
      return
    }

    let disposed = false
    setState({ loading: true })
    void invokeCommand<NativeDocument>('read_document', {
      sourceId: target.sourceId,
      path: target.path,
    }).then((document) => {
      if (!disposed) setState({ document: toReaderDocument(document, target), loading: false })
    }).catch((error: unknown) => {
      if (!disposed) setState({ error: error instanceof Error ? error.message : String(error), loading: false })
    })

    return () => { disposed = true }
  }, [target])

  return state
}
