export type Txt = { en: string; ru: string }

export type Kind =
  | 'goal' | 'constraint' | 'question' | 'hypothesis' | 'task' | 'action'
  | 'finding' | 'decision' | 'open' | 'assumption' | 'risk' | 'criterion'

export type Evidence = { ref: string; type: 'test' | 'code' | 'doc' | 'tool' | 'user' | 'inference' }

export type LedgerNode = {
  id: string
  kind: Kind
  parent?: string
  title: Txt
  statement?: Txt
  status: string
  evidence: Evidence[]
  turn: number
  author: 'claude' | 'user' | 'cartographer'
  // decision (Y-statement)
  context?: Txt
  chosen?: Txt
  rejected?: Txt[]
  accepting?: Txt
  by?: 'user' | 'claude'
  // finding
  likelihood?: 'almost-certain' | 'likely' | 'even' | 'unlikely'
  confidence?: 'low' | 'moderate' | 'high'
  // open question
  blocking?: boolean
  ask?: 'user' | 'agent' | 'external'
  // quick answers the board shows as buttons
  options?: string[]
}

export type Brief = {
  question: Txt
  answer: Txt
  scqa: { s: Txt; c: Txt }
  keyLine: string[]
  now?: string
  next?: string
  blockedBy: string[]
}

export type TurnCard = {
  n: number
  at: string
  ask: Txt
  did: Txt
  tools: Record<string, number>
  files: string[]
  paths?: string[]
  errors: number
  nodes: string[]
  mapped: boolean
}

/** How much Claude may do without the person. */
export type Authority = 'careful' | 'normal' | 'bold'

/** Where the task stands: no brief, brief drafted, Claude works, work handed in, accepted. */
export type Phase = 'none' | 'intake' | 'work' | 'review' | 'accepted'

/** What Claude handed in with mcp__session-board__submit. */
export type Submission = {
  at: string
  round: number
  summary: Txt
  verify: string[]
  notDone: string[]
  next: string[]
}

/** The task brief: the contract between the person and Claude. Criteria are K nodes, rules are C nodes. */
export type TaskSpec = {
  title: Txt
  goal: Txt
  result: Txt
  outOfScope: string[]
  materials: string[]
  authority: Authority
  /** absolute path of the task folder; empty until the task has a title */
  dir: string
  created: string
  started?: string
  /** git commit at Start, for the report's diff */
  base?: string
  phase: Phase
  round: number
  /** "accept with fixes": the next hand-in closes the task without another review */
  acceptOnSubmit?: boolean
  submitted?: Submission
  /** false when the task grew out of work without an intake: the board offers to write the brief */
  formal: boolean
}

export type Ledger = {
  v: 1
  sid: string
  updated: string
  brief: Brief | null
  nodes: LedgerNode[]
  turns: TurnCard[]
  task?: TaskSpec | null
}

/** The person's draft verdict on the Acceptance screen, before they send it. */
export type Verdict = {
  marks: Record<string, 'ok' | 'no'>
  comments: Record<string, string>
  general: string[]
  rules: string[]
}

/** An unfinished task in this project, offered on the Task screen of a new session. */
export type OpenTask = { dir: string; title: string; phase: Phase; updated: string }

export type LiveEvent = { tool: string; target: string; ok: boolean | null; at: number }

export type BoardStatus = {
  phase: 'idle' | 'mapping' | 'error'
  note: string
  cacheRead: number
  output: number
  ms: number
}

export type QA = { q: string; a: string; at: string; status: 'running' | 'done' | 'error' }

export type Explain = { title: string; markdown: string; svg: string; at: string }

export type DiffView = { path: string; text: string; note: string }

declare module 'claude-code' {
  interface PluginState {
    'session-board': {
      ledger: Ledger
      view: string
      expanded: string[]
      selectedTurn: number
      status: BoardStatus
      live: LiveEvent[]
      qa: QA[]
      answering: string
      explain: Explain | null
      diff: DiffView | null
      verdict: Verdict
      notes: string[]
      editing: string
      greeted: string
      openTasks: OpenTask[]
      policy: Authority
    }
  }
}
