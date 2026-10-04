export type Txt = { en: string; ru: string }

export type Kind =
  | 'goal' | 'constraint' | 'question' | 'hypothesis' | 'task' | 'action'
  | 'finding' | 'decision' | 'open' | 'assumption' | 'risk' | 'criterion' | 'idea'

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
  /** an item of the lean plugin: a thing Claude did not build, a `lean:` shortcut, an over-engineering finding */
  tag?: LeanTag
}

export type LeanTag = 'skipped' | 'shortcut' | 'cut'

/** The lean plugin's level: how hard Claude cuts code. */
export type LeanLevel = 'lite' | 'full' | 'ultra' | 'off'

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
  /** one plain Russian sentence per criterion id: what is true now; the evidence stays on the node */
  results?: Record<string, string>
  /** what only the person can do now, in plain Russian */
  forYou?: string[]
  /** with lean: the result of Claude's over-engineering self-check of the task's diff, one plain Russian line */
  leanCheck?: string
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
  /** the lean level the person picked for this task; unset: lean's own setting */
  code?: LeanLevel
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
  /** free mode: no brief, no criteria and no acceptance; the work ends with a summary of the ideas */
  mode?: 'free'
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

/** A board message on its way: its button stays hidden until Claude finished the turn that answers it. */
export type SentAction = { key: string; text: string; started: boolean }

/** An unfinished task in this project, offered on the Task screen of a new session. */
export type OpenTask = { dir: string; title: string; phase: Phase; updated: string; free?: boolean }

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
      sent: SentAction[]
      home: { sid: string; dir: string }
      ladder: boolean
      /** the lean plugin in this session, from its session-start line; null: not installed or off */
      lean: { level: LeanLevel } | null
      /** `lean:` shortcut comments in the project, from git grep; null: not counted */
      debt: { markers: number; files: number } | null
    }
  }
}
