export type RepositoryCapability = 'Readable' | 'Partially readable' | 'Files only' | 'Website only'
export type RepositoryStatus = 'Ready' | 'Not installed'
export type RepositoryAccent = 'mint' | 'sky' | 'coral' | 'amber' | 'teal' | 'violet'

export interface Repository {
  id: string
  name: string
  vendor: string
  description: string
  category: string
  accent: RepositoryAccent
  status: RepositoryStatus
  capability: RepositoryCapability
  sourceUrl: string
  selectedRef: string
  tags?: string[]
}

export type RepositoryMetadataOverride = Partial<Pick<Repository, 'name' | 'description' | 'category' | 'tags'>>

export const repositories: Repository[] = [
  {
    id: 'react',
    name: 'React',
    vendor: 'Meta',
    description: 'The library for web and native user interfaces.',
    category: 'Frontend',
    accent: 'mint',
    status: 'Ready',
    capability: 'Readable',
    sourceUrl: 'https://github.com/facebook/react.git',
    selectedRef: 'main',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    vendor: 'Microsoft',
    description: 'JavaScript with syntax for types.',
    category: 'Languages',
    accent: 'sky',
    status: 'Ready',
    capability: 'Readable',
    sourceUrl: 'https://github.com/microsoft/TypeScript.git',
    selectedRef: 'main',
  },
  {
    id: 'rust',
    name: 'Rust',
    vendor: 'Rust Foundation',
    description: 'A language empowering everyone to build reliable software.',
    category: 'Languages',
    accent: 'coral',
    status: 'Not installed',
    capability: 'Readable',
    sourceUrl: 'https://github.com/rust-lang/rust.git',
    selectedRef: 'master',
  },
  {
    id: 'tauri',
    name: 'Tauri',
    vendor: 'Tauri',
    description: 'Build smaller, faster, and more secure desktop applications.',
    category: 'Desktop',
    accent: 'amber',
    status: 'Ready',
    capability: 'Partially readable',
    sourceUrl: 'https://github.com/tauri-apps/tauri.git',
    selectedRef: 'dev',
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    vendor: 'Tailwind Labs',
    description: 'Build modern websites without leaving your HTML.',
    category: 'Frontend',
    accent: 'teal',
    status: 'Not installed',
    capability: 'Readable',
    sourceUrl: 'https://github.com/tailwindlabs/tailwindcss.git',
    selectedRef: 'main',
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    vendor: 'SQLite',
    description: 'A small, fast, self-contained SQL database engine.',
    category: 'Data',
    accent: 'violet',
    status: 'Not installed',
    capability: 'Files only',
    sourceUrl: 'https://github.com/sqlite/sqlite.git',
    selectedRef: 'master',
  },
] satisfies readonly Repository[]
