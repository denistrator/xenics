export const repositoryCapabilities = ['Readable', 'PartiallyReadable', 'FilesOnly', 'WebsiteOnly'] as const
export type RepositoryCapability = (typeof repositoryCapabilities)[number]

export const taskStates = [
  'Queued', 'Running', 'WaitingToRetry', 'NeedsAction', 'Canceling', 'Canceled',
  'Succeeded', 'SucceededWithWarnings', 'Failed', 'Interrupted',
] as const
export type TaskState = (typeof taskStates)[number]

export type BrandedId<Brand extends string> = string & { readonly __brand: Brand }
export type SourceId = BrandedId<'SourceId'>
export type TechnologyId = BrandedId<'TechnologyId'>
export type TaskId = BrandedId<'TaskId'>
export type DocumentId = BrandedId<'DocumentId'>

export type RetryClass = 'Automatic' | 'NeedsAction' | 'Permanent'
export type ErrorCode = 'GitAuthentication' | 'InvalidTaskEvent' | 'Unknown'

export interface XenicsError {
  code: ErrorCode
  sourceId?: SourceId
  documentId?: DocumentId
  taskId?: TaskId
  phase?: string
  retryClass: RetryClass
  message: string
  actions: string[]
  diagnosticId: string
}

export interface TaskEvent {
  taskId: TaskId
  sequence: number
  phase: string
  progress?: number
  state: TaskState
  error?: XenicsError
}

const terminalStates = new Set<TaskState>(['Succeeded', 'SucceededWithWarnings', 'Failed', 'Canceled', 'Interrupted'])

export function isTaskState(value: unknown): value is TaskState {
  return typeof value === 'string' && (taskStates as readonly string[]).includes(value)
}

export function parseTaskEvent(input: unknown, previousState: TaskState, previousSequence = 0): TaskEvent {
  if (!input || typeof input !== 'object') throw new Error('Task event must be an object')
  const value = input as Record<string, unknown>
  if (typeof value.taskId !== 'string' || value.taskId.length === 0) throw new Error('Task event requires taskId')
  if (typeof value.sequence !== 'number' || !Number.isSafeInteger(value.sequence) || value.sequence <= previousSequence) {
    throw new Error('Task event sequence must be newer than the previous sequence')
  }
  if (!isTaskState(value.state)) throw new Error('Task event has an invalid state')
  if (terminalStates.has(previousState)) throw new Error('Terminal task cannot transition to another state')
  if (value.progress !== undefined && (typeof value.progress !== 'number' || value.progress < 0 || value.progress > 1)) {
    throw new Error('Task event progress must be between 0 and 1')
  }
  return {
    taskId: value.taskId as TaskId,
    sequence: value.sequence,
    phase: typeof value.phase === 'string' ? value.phase : 'unknown',
    progress: value.progress as number | undefined,
    state: value.state,
    error: value.error as XenicsError | undefined,
  }
}
