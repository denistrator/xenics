export type SearchCoverage = { complete: boolean; indexed: number; total: number }
export type SearchLocation = { line: number; column: number }
export type SearchResultModel = {
  id: string
  title: string
  source: string
  path: string
  excerpt: string
  matchCount: number
  location: SearchLocation
  matchIndex: number
}
export type SearchResponse = { query: string; results: SearchResultModel[]; coverage: SearchCoverage; error?: string }

export function coverageMessage(coverage: SearchCoverage): string | undefined {
  if (coverage.complete) return undefined
  return `${Math.max(coverage.total - coverage.indexed, 0)} still indexing`
}

export function openSearchResult(result: SearchResultModel) {
  return { sourceId: result.source, refName: 'main', path: result.path, title: result.title, matchIndex: result.matchIndex, location: result.location }
}
