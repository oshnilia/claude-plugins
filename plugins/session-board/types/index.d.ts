export type Txt = { en: string; ru: string }

export type Kind =
  | 'goal' | 'constraint' | 'question' | 'hypothesis' | 'task' | 'action'
  | 'finding' | 'decision' | 'open' | 'assumption' | 'risk'

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

export type Ledger = {
  v: 1
  sid: string
  updated: string
  brief: Brief | null
  nodes: LedgerNode[]
  turns: TurnCard[]
}

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
    }
  }
}
