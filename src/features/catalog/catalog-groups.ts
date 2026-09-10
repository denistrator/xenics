import type { Repository } from './catalog-model'

export type TechnologyGroup = {
  id: string
  name: string
  description: string
  repositoryIds: string[]
}

export const technologyGroups: TechnologyGroup[] = [
  {
    id: 'web-foundations',
    name: 'Web foundations',
    description: 'The core libraries and language tools behind a modern web stack.',
    repositoryIds: ['react', 'typescript', 'tailwind'],
  },
]

export function getGroupRepositories(
  group: TechnologyGroup,
  catalogRepositories: Repository[],
): Repository[] {
  const repositoriesById = new Map(catalogRepositories.map((repository) => [repository.id, repository]))
  return group.repositoryIds.flatMap((repositoryId) => {
    const repository = repositoriesById.get(repositoryId)
    return repository ? [repository] : []
  })
}
