import type { Brief, Evidence, Kind, Ledger, LedgerNode, Txt, TurnCard } from '../types'

export const KINDS: readonly Kind[] = [
  'goal', 'constraint', 'question', 'hypothesis', 'task', 'action',
  'finding', 'decision', 'open', 'assumption', 'risk', 'criterion',
]

export const PREFIX: Record<Kind, string> = {
  goal: 'G', constraint: 'C', question: 'Q', hypothesis: 'H', task: 'T', action: 'A',
  finding: 'F', decision: 'D', open: 'O', assumption: 'S', risk: 'R', criterion: 'K',
}

const EVIDENCE_TYPES = ['test', 'code', 'doc', 'tool', 'user', 'inference'] as const

export type Op =
  | ({ op: 'add'; kind: Kind } & Partial<LedgerNode>)
  | ({ op: 'update'; id: string } & Partial<LedgerNode>)
  | { op: 'supersede'; id: string; by?: string }

export const emptyLedger = (sid: string): Ledger => ({ v: 1, sid, updated: '', brief: null, nodes: [], turns: [] })

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

export function txt(x: unknown, max = 220): Txt | undefined {
  if (typeof x === 'string' && x.trim()) return { en: x.trim().slice(0, max), ru: x.trim().slice(0, max) }
  if (!isObj(x)) return undefined
  const en = typeof x.en === 'string' ? x.en.trim() : ''
  const ru = typeof x.ru === 'string' ? x.ru.trim() : ''
  if (!en && !ru) return undefined
  return { en: (en || ru).slice(0, max), ru: (ru || en).slice(0, max) }
}

function evidence(x: unknown): Evidence[] {
  if (!Array.isArray(x)) return []
  return x
    .map(e => {
      if (typeof e === 'string') return { ref: e.slice(0, 200), type: 'inference' as const }
      if (!isObj(e) || typeof e.ref !== 'string') return null
      const t = EVIDENCE_TYPES.includes(e.type as never) ? (e.type as Evidence['type']) : 'inference'
      return { ref: e.ref.slice(0, 200), type: t }
    })
    .filter((e): e is Evidence => e !== null)
    .slice(0, 6)
}

/** Copy only the known optional fields of a node from untrusted model output. */
function fields(raw: Record<string, unknown>): Partial<LedgerNode> {
  const out: Partial<LedgerNode> = {}
  const title = txt(raw.title, 90)
  if (title) out.title = title
  const statement = txt(raw.statement)
  if (statement) out.statement = statement
  if (typeof raw.status === 'string' && raw.status) out.status = raw.status.slice(0, 24)
  if (typeof raw.parent === 'string' && raw.parent) out.parent = raw.parent.slice(0, 12)
  if (raw.evidence !== undefined) out.evidence = evidence(raw.evidence)
  const context = txt(raw.context)
  if (context) out.context = context
  const chosen = txt(raw.chosen)
  if (chosen) out.chosen = chosen
  if (Array.isArray(raw.rejected)) out.rejected = raw.rejected.map(r => txt(r)).filter((r): r is Txt => !!r).slice(0, 4)
  const accepting = txt(raw.accepting)
  if (accepting) out.accepting = accepting
  if (raw.by === 'user' || raw.by === 'claude') out.by = raw.by
  if (['almost-certain', 'likely', 'even', 'unlikely'].includes(raw.likelihood as string)) out.likelihood = raw.likelihood as LedgerNode['likelihood']
  if (['low', 'moderate', 'high'].includes(raw.confidence as string)) out.confidence = raw.confidence as LedgerNode['confidence']
  if (typeof raw.blocking === 'boolean') out.blocking = raw.blocking
  if (raw.ask === 'user' || raw.ask === 'agent' || raw.ask === 'external') out.ask = raw.ask
  if (Array.isArray(raw.options)) out.options = raw.options.filter((o): o is string => typeof o === 'string' && !!o.trim()).map(o => o.trim().slice(0, 40)).slice(0, 3)
  return out
}

/** Turn one untrusted op into a typed one, or null. */
export function parseOp(raw: unknown): Op | null {
  if (!isObj(raw) || typeof raw.op !== 'string') return null
  if (raw.op === 'add') {
    if (!KINDS.includes(raw.kind as Kind)) return null
    const f = fields(raw)
    if (!f.title) return null
    return { op: 'add', kind: raw.kind as Kind, ...(typeof raw.id === 'string' ? { id: raw.id } : {}), ...f }
  }
  if (raw.op === 'update' && typeof raw.id === 'string') return { op: 'update', id: raw.id, ...fields(raw) }
  if (raw.op === 'supersede' && typeof raw.id === 'string') {
    return { op: 'supersede', id: raw.id, ...(typeof raw.by === 'string' ? { by: raw.by } : {}) }
  }
  return null
}

export function parseBrief(raw: unknown): Brief | null {
  if (!isObj(raw)) return null
  const question = txt(raw.question)
  const answer = txt(raw.answer)
  if (!question || !answer) return null
  const scqa = isObj(raw.scqa) ? raw.scqa : {}
  const ids = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string').slice(0, 5) : [])
  return {
    question,
    answer,
    scqa: { s: txt(scqa.s) ?? { en: '', ru: '' }, c: txt(scqa.c) ?? { en: '', ru: '' } },
    keyLine: ids(raw.keyLine),
    ...(typeof raw.now === 'string' ? { now: raw.now } : {}),
    ...(typeof raw.next === 'string' ? { next: raw.next } : {}),
    blockedBy: ids(raw.blockedBy),
  }
}

export function nextId(nodes: readonly LedgerNode[], kind: Kind): string {
  const p = PREFIX[kind]
  let max = 0
  for (const n of nodes) {
    if (n.id.startsWith(p)) {
      const k = Number(n.id.slice(p.length).split('.')[0])
      if (Number.isFinite(k)) max = Math.max(max, k)
    }
  }
  return `${p}${max + 1}`
}

const DEFAULT_STATUS: Record<Kind, string> = {
  goal: 'active', constraint: 'active', question: 'open', hypothesis: 'untested', task: 'todo', action: 'ok',
  finding: 'stated', decision: 'accepted', open: 'open', assumption: 'open', risk: 'open', criterion: 'todo',
}

/** Apply ops in order. Returns the new ledger and the ids it touched. IDs are never reused. */
export function applyOps(ledger: Ledger, ops: readonly Op[], turn: number, author: LedgerNode['author']): { ledger: Ledger; touched: string[] } {
  const nodes = ledger.nodes.map(n => ({ ...n }))
  const touched: string[] = []
  const byId = new Map(nodes.map(n => [n.id, n]))
  for (const op of ops) {
    if (op.op === 'add') {
      const existing = op.id ? byId.get(op.id) : undefined
      const id = !op.id || (existing && existing.kind !== op.kind) || !op.id.startsWith(PREFIX[op.kind])
        ? nextId(nodes, op.kind)
        : op.id
      if (byId.has(id)) {
        Object.assign(byId.get(id)!, stripOp(op))
      } else {
        const { op: _o, kind, id: _i, ...rest } = op
        const node: LedgerNode = {
          id, kind, title: rest.title ?? { en: id, ru: id }, status: rest.status ?? DEFAULT_STATUS[kind],
          evidence: rest.evidence ?? [], turn, author, ...rest,
        }
        if (node.parent && !byId.has(node.parent)) delete node.parent
        nodes.push(node)
        byId.set(id, node)
      }
      touched.push(id)
    } else if (op.op === 'update') {
      const n = byId.get(op.id)
      if (!n) continue
      Object.assign(n, stripOp(op))
      touched.push(op.id)
    } else {
      const n = byId.get(op.id)
      if (!n) continue
      n.status = 'superseded'
      touched.push(op.id)
    }
  }
  return { ledger: { ...ledger, nodes }, touched }
}

function stripOp(op: Op): Partial<LedgerNode> {
  const { op: _o, id: _i, kind: _k, ...rest } = op as Record<string, unknown>
  return rest as Partial<LedgerNode>
}

/** Drop brief references to ids that do not exist. Returns the ids it dropped. */
export function cleanBrief(ledger: Ledger): { ledger: Ledger; dropped: string[] } {
  const b = ledger.brief
  if (!b) return { ledger, dropped: [] }
  const ids = new Set(ledger.nodes.map(n => n.id))
  const dropped = [...b.keyLine, ...b.blockedBy, b.now ?? '', b.next ?? ''].filter(id => id && !ids.has(id))
  if (!dropped.length) return { ledger, dropped }
  const brief: Brief = {
    ...b,
    keyLine: b.keyLine.filter(id => ids.has(id)),
    blockedBy: b.blockedBy.filter(id => ids.has(id)),
    ...(b.now && ids.has(b.now) ? { now: b.now } : { now: undefined }),
    ...(b.next && ids.has(b.next) ? { next: b.next } : { next: undefined }),
  }
  return { ledger: { ...ledger, brief }, dropped }
}

export function upsertTurn(ledger: Ledger, card: TurnCard): Ledger {
  const turns = ledger.turns.filter(t => t.n !== card.n)
  turns.push(card)
  turns.sort((a, b) => a.n - b.n)
  return { ...ledger, turns: turns.slice(-200) }
}

// ---------- rendering ----------

const open = (n: LedgerNode) => !['done', 'dropped', 'superseded', 'refuted', 'answered', 'lifted', 'verified', 'invalid'].includes(n.status)

export function childrenOf(ledger: Ledger, id: string | undefined): LedgerNode[] {
  return ledger.nodes.filter(n => (id === undefined ? !n.parent : n.parent === id))
}

/** The brief Claude reads back after compaction: fixed order, STE English, about 400 tokens. */
export function renderBrief(ledger: Ledger): string {
  const L: string[] = [`<session-ledger v1 sid=${ledger.sid} updated=${ledger.updated}>`]
  const b = ledger.brief
  const get = (id?: string) => (id ? ledger.nodes.find(n => n.id === id) : undefined)
  const t = ledger.task
  if (t) {
    L.push(`TASK: ${t.title.en} [${t.phase}${t.round > 1 ? `, round ${t.round}` : ''}]${t.dir ? ` folder=${t.dir}` : ''}`)
    if (t.goal.en) L.push(`TASK GOAL: ${t.goal.en}`)
    if (t.result.en) L.push(`HAND IN: ${t.result.en}`)
    L.push(`AUTHORITY: ${t.authority}`)
    if (t.outOfScope.length) L.push(`OUT OF SCOPE: ${t.outOfScope.join(' | ')}`)
  }
  const crit = ledger.nodes.filter(n => n.kind === 'criterion' && n.status !== 'superseded')
  if (crit.length) L.push(`DONE WHEN: ${crit.map(k => `${k.id} ${k.title.en} [${k.status}]`).join(' | ')}`)
  for (const g of ledger.nodes.filter(n => n.kind === 'goal' && open(n)).slice(0, 3)) L.push(`GOAL ${g.id}: ${g.statement?.en ?? g.title.en} [${g.status}]`)
  if (b) {
    L.push(`QUESTION: ${b.question.en}`)
    L.push(`ANSWER: ${b.answer.en}`)
  }
  const cons = ledger.nodes.filter(n => n.kind === 'constraint' && open(n))
  // the cartographer reads tool output too: a rule it found is a claim to check, not the user's word
  const said = cons.filter(c => c.author !== 'cartographer')
  const inferred = cons.filter(c => c.author === 'cartographer')
  if (said.length) L.push(`CONSTRAINTS: ${said.map(c => `${c.id} ${c.statement?.en ?? c.title.en}`).join(' | ')}`)
  if (inferred.length) L.push(`INFERRED RULES (from the session, not confirmed by the user; check before you rely on one): ${inferred.map(c => `${c.id} ${c.statement?.en ?? c.title.en}`).join(' | ')}`)
  for (const d of ledger.nodes.filter(n => n.kind === 'decision' && n.status !== 'superseded').slice(-6)) {
    const y = d.chosen
      ? `${d.context ? `In the context of ${d.context.en}, ` : ''}we chose ${d.chosen.en}${d.rejected?.length ? ` over ${d.rejected.map(r => r.en).join(', ')}` : ''}${d.accepting ? `, accepting ${d.accepting.en}` : ''}.`
      : d.statement?.en ?? d.title.en
    L.push(`DECIDED: ${d.id} ${y}${d.by ? ` (by ${d.by})` : ''}`)
  }
  for (const f of ledger.nodes.filter(n => n.kind === 'finding' && n.status !== 'superseded').slice(-6)) {
    L.push(`FOUND: ${f.id} ${f.statement?.en ?? f.title.en}${f.evidence.length ? ` [${f.evidence.map(e => `${e.type}: ${e.ref}`).join('; ')}]` : ''}`)
  }
  const dead = ledger.nodes.filter(n => n.kind === 'hypothesis' && n.status === 'refuted')
  if (dead.length) L.push(`DEAD ENDS - do not retry: ${dead.map(h => `${h.id} ${h.title.en}`).join(' | ')}`)
  for (const o of ledger.nodes.filter(n => n.kind === 'open' && open(n)).slice(-5)) {
    L.push(`OPEN: ${o.id} ${o.statement?.en ?? o.title.en} (ask ${o.ask ?? 'user'}; blocking=${o.blocking ? 'yes' : 'no'})`)
  }
  if (b && (b.now || b.next)) L.push(`NOW -> NEXT: ${[get(b.now), get(b.next)].map(n => (n ? `${n.id} ${n.title.en}` : '-')).join(' -> ')}`)
  L.push(`DETAIL: call ledger_read with an id, or read ${t?.dir ? `${t.dir}/ledger.md` : 'the ledger with ledger_read section=all'}`)
  L.push('</session-ledger>')
  return L.join('\n')
}

function nodeLine(n: LedgerNode, lang: 'en' | 'ru'): string {
  const s = n.statement ? ` - ${n.statement[lang]}` : ''
  const ev = n.evidence.length ? ` _(${n.evidence.map(e => e.ref).join('; ')})_` : ''
  return `**${n.id}** [${n.kind}, ${n.status}] ${n.title[lang]}${s}${ev}`
}

export function renderMarkdown(ledger: Ledger, lang: 'en' | 'ru'): string {
  const L: string[] = []
  const h = lang === 'ru'
    ? { title: 'Доска сессии', q: 'Вопрос', a: 'Ответ', s: 'Ситуация', c: 'Осложнение', tree: 'Карта', turns: 'Ходы' }
    : { title: 'Session ledger', q: 'Question', a: 'Answer', s: 'Situation', c: 'Complication', tree: 'Map', turns: 'Turns' }
  L.push(`# ${h.title} · ${ledger.sid}`, '', `_${ledger.updated}_`, '')
  if (ledger.brief) {
    const b = ledger.brief
    L.push(`**${h.a}:** ${b.answer[lang]}`, '', `**${h.q}:** ${b.question[lang]}`, '')
    if (b.scqa.s[lang]) L.push(`- ${h.s}: ${b.scqa.s[lang]}`)
    if (b.scqa.c[lang]) L.push(`- ${h.c}: ${b.scqa.c[lang]}`)
    L.push('')
  }
  L.push(`## ${h.tree}`, '')
  const walk = (parent: string | undefined, depth: number) => {
    for (const n of childrenOf(ledger, parent)) {
      L.push(`${'  '.repeat(depth)}- ${nodeLine(n, lang)}`)
      walk(n.id, depth + 1)
    }
  }
  walk(undefined, 0)
  L.push('', `## ${h.turns}`, '')
  for (const t of ledger.turns) {
    const tools = Object.entries(t.tools).map(([k, v]) => `${k}×${v}`).join(', ')
    L.push(`- **${t.n}** ${t.ask[lang]} → ${t.did[lang]}${tools ? ` _(${tools})_` : ''}`)
  }
  return L.join('\n')
}
