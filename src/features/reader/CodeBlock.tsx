import { Check, Clipboard, Download } from 'lucide-react'
import { useState } from 'react'

type CodeBlockProps = { code: string; language?: string }

export function CodeBlock({ code, language = 'text' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    await navigator.clipboard?.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  function downloadCode() {
    const blob = new Blob([code], { type: 'text/plain' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `xenics-snippet.${language === 'text' ? 'txt' : language}`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-x-line bg-x-code text-x-code-foreground">
      <header className="flex items-center justify-between border-b border-x-code-muted/20 px-4 py-3 text-xs">
        <span className="font-mono text-x-code-muted">{language}</span>
        <div className="flex gap-1">
          <button aria-label={copied ? 'Code copied' : 'Copy code'} onClick={copyCode} className="rounded-lg p-2 hover:bg-x-code-muted/20">
            {copied ? <Check size={15} /> : <Clipboard size={15} />}
          </button>
          <button aria-label="Download code" onClick={downloadCode} className="rounded-lg p-2 hover:bg-x-code-muted/20">
            <Download size={15} />
          </button>
        </div>
      </header>
      <pre className="overflow-x-auto p-4 text-sm leading-6"><code>{code}</code></pre>
    </section>
  )
}
