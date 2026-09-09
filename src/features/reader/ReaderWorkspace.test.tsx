import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReaderWorkspace } from './ReaderWorkspace'
const tab = { id: 'react:README.md', sourceId: 'react', refName: 'main', path: 'README.md', title: 'React', pinned: false, history: ['README.md'] }
const readerDocument = { title: 'React', source: 'React · main', blocks: [{ type: 'heading' as const, text: 'useEffect', level: 2 }, { type: 'paragraph' as const, text: 'Installation steps' }, { type: 'warning' as const, text: 'Unsupported component' }] }
describe('ReaderWorkspace', () => { it('renders tabs and safe unsupported-content warnings', () => { render(<ReaderWorkspace initialTabs={[tab]} document={readerDocument} />); expect(screen.getByRole('tab', { name: 'React' })).toHaveAttribute('aria-selected', 'true'); expect(screen.getByText(/unsupported component/i)).toBeInTheDocument(); expect(globalThis.document.querySelector('script')).toBeNull() }) })
