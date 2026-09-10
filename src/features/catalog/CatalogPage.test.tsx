import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CatalogPage } from './CatalogPage'
import type { Repository } from './catalog-model'

describe('CatalogPage', () => {
  it('renders the catalog and bulk download action', () => {
    render(<CatalogPage />)

    expect(screen.getByRole('heading', { name: /tools you build with/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download all/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'React' })).toBeInTheDocument()
  })

  it('filters repositories without losing the bulk download contract', async () => {
    render(<CatalogPage />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Search repositories' }), {
      target: { value: 'rust' },
    })

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rust' })).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'React' })).not.toBeInTheDocument()
    expect(screen.getByText('1 technology')).toBeInTheDocument()
  })

  it('filters repositories by category and capability', () => {
    render(<CatalogPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Filter repositories' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by category' }), { target: { value: 'Data' } })
    expect(screen.getByRole('heading', { name: 'SQLite' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'React' })).not.toBeInTheDocument()
  })

  it('delegates bulk downloads and exposes the completed state', async () => {
    const onDownload = vi.fn().mockResolvedValue(undefined)
    render(<CatalogPage onDownload={onDownload} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download all' }))

    await waitFor(() => expect(onDownload).toHaveBeenCalledWith([
      'react',
      'typescript',
      'rust',
      'tauri',
      'tailwind',
    ]))
    expect(await screen.findByRole('button', { name: 'Downloads queued' })).toBeInTheDocument()
  })

  it('opens source details from the card body without changing selection', () => {
    render(<CatalogPage />)

    fireEvent.click(screen.getByRole('button', { name: 'React details' }))

    expect(screen.getByRole('dialog', { name: 'React details' })).toBeInTheDocument()
    expect(screen.getByText('https://github.com/facebook/react.git')).toBeInTheDocument()
  })

  it('adds a local source through the explicit source dialog', async () => {
    const localSource: Repository = {
      id: 'local-team-docs',
      name: 'Team docs',
      vendor: 'Local source',
      description: 'A user-owned local documentation folder.',
      category: 'Custom',
      accent: 'violet',
      status: 'Ready',
      capability: 'Files only',
      sourceUrl: '',
      selectedRef: '',
    }
    const onAddLocalSource = vi.fn().mockResolvedValue(localSource)
    render(<CatalogPage onAddLocalSource={onAddLocalSource} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add local source' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Team docs' } })
    fireEvent.change(screen.getByLabelText('Folder path'), { target: { value: '/tmp/team-docs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add source' }))

    await waitFor(() => expect(onAddLocalSource).toHaveBeenCalledWith({
      id: 'local-team-docs',
      displayName: 'Team docs',
      path: '/tmp/team-docs',
    }))
    expect(await screen.findByRole('heading', { name: 'Team docs' })).toBeInTheDocument()
  })

  it('supports pinning and hiding catalog cards', () => {
    render(<CatalogPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Pin React' }))
    expect(screen.getByRole('button', { name: 'Unpin React' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hide React' }))
    expect(screen.queryByRole('heading', { name: 'React' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Filter repositories' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show hidden sources' }))
    expect(screen.getByRole('heading', { name: 'React' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show React' })).toBeInTheDocument()
  })

  it('edits repository metadata and accepts a custom category', () => {
    render(<CatalogPage />)
    fireEvent.click(screen.getByRole('button', { name: 'React details' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit metadata' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit display name' }), { target: { value: 'React Core' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Edit category' }), { target: { value: 'UI libraries' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit tags' }), { target: { value: 'hooks, ui' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getAllByRole('heading', { name: 'React Core' })).toHaveLength(2)
    expect(screen.getAllByText('UI libraries')).toHaveLength(2)
    expect(screen.getByText('#hooks')).toBeInTheDocument()
  })

  it('adds an unsupported remote repository through HTTPS or SSH', async () => {
    const repository: Repository = { id: 'custom-team-docs', name: 'Team docs', vendor: 'Custom source', description: 'A user-added Git repository.', category: 'Custom', accent: 'violet', status: 'Ready', capability: 'Files only', sourceUrl: 'git@github.com:org/team-docs.git', selectedRef: 'main' }
    const onAddRemoteSource = vi.fn().mockResolvedValue(repository)
    render(<CatalogPage onAddRemoteSource={onAddRemoteSource} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Git repository' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Git repository name' }), { target: { value: 'Team docs' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Git repository URL' }), { target: { value: 'git@github.com:org/team-docs.git' } })
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Add Git repository' })).getByRole('button', { name: 'Download repository' }))
    await waitFor(() => expect(onAddRemoteSource).toHaveBeenCalledWith({ id: 'custom-team-docs', displayName: 'Team docs', source: 'git@github.com:org/team-docs.git', selectedRef: 'main' }))
    expect(await screen.findByRole('heading', { name: 'Team docs' })).toBeInTheDocument()
  })

  it('opens the local-source dialog when a folder path is dropped', () => {
    render(<CatalogPage onAddLocalSource={vi.fn()} />)
    const catalog = document.getElementById('catalog')!
    const droppedFile = new File([], 'team-docs') as File & { path?: string }
    Object.defineProperty(droppedFile, 'path', { value: '/tmp/team-docs' })
    fireEvent.drop(catalog, { dataTransfer: { files: [droppedFile] } })
    expect(screen.getByRole('dialog', { name: 'Add local source' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Folder path' })).toHaveValue('/tmp/team-docs')
  })

  it('opens the local-source dialog from the folder picker', () => {
    render(<CatalogPage onAddLocalSource={vi.fn()} />)
    const folderPicker = screen.getByLabelText('Choose local folder') as HTMLInputElement
    const selectedFile = new File([], 'team-docs') as File & { path?: string }
    Object.defineProperty(selectedFile, 'path', { value: '/tmp/team-docs/README.md' })
    fireEvent.change(folderPicker, { target: { files: [selectedFile] } })
    expect(screen.getByRole('dialog', { name: 'Add local source' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Folder path' })).toHaveValue('/tmp/team-docs')
  })
})
