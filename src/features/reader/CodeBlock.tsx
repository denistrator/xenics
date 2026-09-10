import { Check, Clipboard, Download, WrapText } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

type CopyState = 'idle' | 'copied' | 'failed'

type CodeBlockProps = {
  code: string
  language?: string
}

function getDownloadExtension(language: string): string {
  const extension = language
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24)

  return extension || 'txt'
}

export function CodeBlock({ code, language = 'text' }: CodeBlockProps): ReactNode {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [wrapLines, setWrapLines] = useState(false)
  const resetCopyStateTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => {
    if (resetCopyStateTimer.current !== undefined) window.clearTimeout(resetCopyStateTimer.current)
  }, [])

  async function copyCode(): Promise<void> {
    if (!navigator.clipboard) {
      setCopyState('failed')
      return
    }

    try {
      await navigator.clipboard.writeText(code)
      setCopyState('copied')
      if (resetCopyStateTimer.current !== undefined) window.clearTimeout(resetCopyStateTimer.current)
      resetCopyStateTimer.current = window.setTimeout(() => setCopyState('idle'), 1200)
    } catch {
      setCopyState('failed')
    }
  }

  function downloadCode(): void {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `xenics-snippet.${getDownloadExtension(language)}`
    link.click()
    URL.revokeObjectURL(objectUrl)
  }

  const copyLabel = copyState === 'copied'
    ? 'Code copied'
    : copyState === 'failed'
      ? 'Copy failed'
      : 'Copy code'

  return (
    <section className="overflow-hidden rounded-2xl border border-x-line bg-x-code text-x-code-foreground">
      <header className="flex items-center justify-between border-b border-x-code-muted/20 px-4 py-3 text-xs">
        <span className="font-mono text-x-code-muted">{language}</span>
        <div className="flex gap-1">
          <button type="button" aria-label={wrapLines ? 'Disable line wrapping' : 'Enable line wrapping'} aria-pressed={wrapLines} onClick={() => setWrapLines((current) => !current)} className="rounded-lg p-2 hover:bg-x-code-muted/20">
            <WrapText aria-hidden="true" size={15} />
          </button>
          <button
            type="button"
            aria-label={copyLabel}
            onClick={() => void copyCode()}
            className="rounded-lg p-2 hover:bg-x-code-muted/20"
          >
            {copyState === 'copied' ? <Check aria-hidden="true" size={15} /> : <Clipboard aria-hidden="true" size={15} />}
          </button>
          <button
            type="button"
            aria-label="Download code"
            onClick={downloadCode}
            className="rounded-lg p-2 hover:bg-x-code-muted/20"
          >
            <Download aria-hidden="true" size={15} />
          </button>
        </div>
      </header>
      <pre className={`${wrapLines ? 'whitespace-pre-wrap break-words' : 'overflow-x-auto'} p-4 text-sm leading-6`}><code>{code.split('\n').map((line, index) => <span key={`${index}-${line}`} className="block"><span aria-hidden="true" className="mr-4 inline-block w-6 select-none text-right text-x-code-muted">{index + 1}</span>{line}</span>)}</code></pre>
    </section>
  )
}
