export type RepositoryCapability = 'Readable' | 'Partially readable' | 'Files only' | 'Website only'
export type RepositoryStatus = 'Ready' | 'Not installed'

export type Repository = {
  id: string
  name: string
  vendor: string
  description: string
  category: string
  accent: string
  status: RepositoryStatus
  capability: RepositoryCapability
}

export const repositories: Repository[] = [
  { id: 'react', name: 'React', vendor: 'Meta', description: 'The library for web and native user interfaces.', category: 'Frontend', accent: '#b8efd9', status: 'Ready', capability: 'Readable' },
  { id: 'typescript', name: 'TypeScript', vendor: 'Microsoft', description: 'JavaScript with syntax for types.', category: 'Languages', accent: '#9bc8f3', status: 'Ready', capability: 'Readable' },
  { id: 'rust', name: 'Rust', vendor: 'Rust Foundation', description: 'A language empowering everyone to build reliable software.', category: 'Languages', accent: '#f09b7c', status: 'Not installed', capability: 'Readable' },
  { id: 'tauri', name: 'Tauri', vendor: 'Tauri', description: 'Build smaller, faster, and more secure desktop applications.', category: 'Desktop', accent: '#f4c96b', status: 'Ready', capability: 'Partially readable' },
  { id: 'tailwind', name: 'Tailwind CSS', vendor: 'Tailwind Labs', description: 'Build modern websites without leaving your HTML.', category: 'Frontend', accent: '#9edbd4', status: 'Not installed', capability: 'Readable' },
  { id: 'sqlite', name: 'SQLite', vendor: 'SQLite', description: 'A small, fast, self-contained SQL database engine.', category: 'Data', accent: '#c7b6ed', status: 'Not installed', capability: 'Files only' },
]
