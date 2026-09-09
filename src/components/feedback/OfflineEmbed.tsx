type OfflineEmbedProps = { title?: string }

export function OfflineEmbed({ title = 'This content is unavailable offline.' }: OfflineEmbedProps) {
  return <div className="rounded-xl border border-dashed border-x-line bg-x-panel p-6 text-sm text-x-muted">{title} You can still browse downloaded documentation.</div>
}
