export type RepositoryCapability = 'Readable' | 'Partially readable' | 'Files only' | 'Website only'
export type RepositoryStatus = 'Ready' | 'Not installed'
export type RepositoryAccent = 'mint' | 'sky' | 'coral' | 'amber' | 'teal' | 'violet'
export type RepositorySourceType = 'Git source' | 'Local folder' | 'Website'

export interface Repository {
  id: string
  name: string
  icon?: string
  vendor: string
  description: string
  category: string
  accent: RepositoryAccent
  status: RepositoryStatus
  capability: RepositoryCapability
  sourceUrl: string
  selectedRef: string
  sourceType?: RepositorySourceType
  localPath?: string
  lastSyncedAt?: string
  updateAvailable?: boolean
  diskUsageBytes?: number
  tags?: string[]
}

export type RepositoryMetadataOverride = Partial<Pick<Repository, 'name' | 'icon' | 'description' | 'category' | 'tags'>>

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
]

function websiteEntry(id: string, name: string, category: string, sourceUrl: string): Repository {
  return {
    id,
    name,
    vendor: 'Community',
    description: `${name} documentation and project resources.`,
    category,
    accent: 'sky',
    status: 'Not installed',
    capability: 'Website only',
    sourceUrl,
    selectedRef: '',
  }
}

export const websiteRepositories: Repository[] = [
  websiteEntry('javascript', 'JavaScript', 'Languages', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript'),
  websiteEntry('php', 'PHP', 'Languages', 'https://www.php.net/docs.php'),
  websiteEntry('python', 'Python', 'Languages', 'https://docs.python.org/3/'),
  websiteEntry('go', 'Go', 'Languages', 'https://go.dev/doc/'),
  websiteEntry('java', 'Java', 'Languages', 'https://docs.oracle.com/en/java/'),
  websiteEntry('c', 'C', 'Languages', 'https://en.cppreference.com/w/c'),
  websiteEntry('cpp', 'C++', 'Languages', 'https://en.cppreference.com/w/'),
  websiteEntry('sql', 'SQL', 'Languages', 'https://www.postgresql.org/docs/current/sql.html'),
  websiteEntry('bash', 'Bash', 'Languages', 'https://www.gnu.org/software/bash/manual/'),
  websiteEntry('html', 'HTML', 'Languages', 'https://developer.mozilla.org/en-US/docs/Web/HTML'),
  websiteEntry('css', 'CSS', 'Languages', 'https://developer.mozilla.org/en-US/docs/Web/CSS'),
  websiteEntry('vue', 'Vue', 'Frontend', 'https://vuejs.org/guide/introduction.html'),
  websiteEntry('nextjs', 'Next.js', 'Frontend', 'https://nextjs.org/docs'),
  websiteEntry('redux', 'Redux', 'Frontend', 'https://redux.js.org/introduction/getting-started'),
  websiteEntry('redux-toolkit', 'Redux Toolkit', 'Frontend', 'https://redux-toolkit.js.org/introduction/getting-started'),
  websiteEntry('pinia', 'Pinia', 'Frontend', 'https://pinia.vuejs.org/introduction.html'),
  websiteEntry('alpinejs', 'Alpine.js', 'Frontend', 'https://alpinejs.dev/start-here'),
  websiteEntry('tanstack-query', 'TanStack Query', 'Frontend', 'https://tanstack.com/query/latest/docs/framework/react/overview'),
  websiteEntry('vite', 'Vite', 'Frontend', 'https://vite.dev/guide/'),
  websiteEntry('svelte', 'Svelte', 'Frontend', 'https://svelte.dev/docs/svelte/overview'),
  websiteEntry('nodejs', 'Node.js', 'Backend', 'https://nodejs.org/docs/latest/api/'),
  websiteEntry('bun', 'Bun', 'Backend', 'https://bun.sh/docs'),
  websiteEntry('express', 'Express', 'Backend', 'https://expressjs.com/'),
  websiteEntry('fastify', 'Fastify', 'Backend', 'https://fastify.dev/docs/latest/'),
  websiteEntry('nestjs', 'NestJS', 'Backend', 'https://docs.nestjs.com/'),
  websiteEntry('fastapi', 'FastAPI', 'Backend', 'https://fastapi.tiangolo.com/'),
  websiteEntry('django', 'Django', 'Backend', 'https://docs.djangoproject.com/en/stable/'),
  websiteEntry('laravel', 'Laravel', 'Backend', 'https://laravel.com/docs'),
  websiteEntry('magento', 'Magento', 'Commerce/CMS', 'https://developer.adobe.com/commerce/docs/'),
  websiteEntry('woocommerce', 'WooCommerce', 'Commerce/CMS', 'https://woocommerce.com/documentation/'),
  websiteEntry('wordpress', 'WordPress', 'Commerce/CMS', 'https://developer.wordpress.org/'),
  websiteEntry('shopify', 'Shopify', 'Commerce/CMS', 'https://shopify.dev/docs'),
  websiteEntry('postgresql', 'PostgreSQL', 'Databases', 'https://www.postgresql.org/docs/'),
  websiteEntry('mysql', 'MySQL', 'Databases', 'https://dev.mysql.com/doc/'),
  websiteEntry('redis', 'Redis', 'Databases', 'https://redis.io/docs/latest/'),
  websiteEntry('mongodb', 'MongoDB', 'Databases', 'https://www.mongodb.com/docs/'),
  websiteEntry('docker', 'Docker', 'Infrastructure', 'https://docs.docker.com/'),
  websiteEntry('kubernetes', 'Kubernetes', 'Infrastructure', 'https://kubernetes.io/docs/home/'),
  websiteEntry('git', 'Git', 'Developer tools', 'https://git-scm.com/doc'),
  websiteEntry('composer', 'Composer', 'Developer tools', 'https://getcomposer.org/doc/'),
  websiteEntry('npm', 'npm', 'Developer tools', 'https://docs.npmjs.com/'),
  websiteEntry('aws-s3', 'AWS / S3', 'Infrastructure', 'https://docs.aws.amazon.com/s3/'),
  websiteEntry('cloudflare-r2', 'Cloudflare / R2', 'Infrastructure', 'https://developers.cloudflare.com/r2/'),
  websiteEntry('opencode', 'OpenCode', 'AI and developer productivity', 'https://opencode.ai/docs/'),
  websiteEntry('codex-cli', 'Codex CLI', 'AI and developer productivity', 'https://developers.openai.com/codex/cli/'),
  websiteEntry('cline', 'Cline', 'AI and developer productivity', 'https://docs.cline.bot/'),
  websiteEntry('cursor', 'Cursor', 'AI and developer productivity', 'https://docs.cursor.com/'),
  websiteEntry('openspec', 'OpenSpec', 'AI and developer productivity', 'https://github.com/Fission-AI/OpenSpec'),
]

repositories.push(...websiteRepositories)
