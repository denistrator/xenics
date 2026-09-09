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

  return (
    <section className="overflow-hidden rounded-2xl border border-x-line bg-[#17212b] text-[#e8f3ee]">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs">
        <span className="font-mono text-[#a7c6bb]">{language}</span>
        <div className="flex gap-1">
          <button aria-label="Copy code" onClick={copyCode} className="rounded-lg p-2 hover:bg-white/10">
            {copied ? <Check size={15} /> : <Clipboard size={15} />}
          </button>
          <button aria-label="Download code" className="rounded-lg p-2 hover:bg-white/10">
            <Download size={15} />
          </button>
        </div>
      </header>
      <pre className="overflow-x-auto p-4 text-sm leading-6"><code>{code}</code></pre>
    </section>
  )
}
