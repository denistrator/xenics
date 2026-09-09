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
}

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
  },
] satisfies readonly Repository[]
