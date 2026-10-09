import type { Authority, Ledger, LedgerNode, Phase, TaskSpec, Txt, Verdict } from '../types'
import { codeLine, LEAN_LEVEL, LEAN_TAGS, TAG } from './lean'
import { nextId, txt, type Op } from './ledger'

// ---------- authority: what Claude may do alone, and what waits for the person ----------

export const AUTHORITY: Record<Authority, { label: string; alone: Txt; withYou: Txt }> = {
  careful: {
    label: 'осторожно',
    alone: { en: 'read and search; edit the files of the task; run tests', ru: 'читает и ищет; правит файлы задачи; гоняет тесты' },
    withYou: { en: 'new dependencies; commits; push; deletes; publishing; money; a change of goal', ru: 'новые зависимости; коммиты; push; удаление; публикация; деньги; смена цели' },
  },
  normal: {
    label: 'обычно',
    alone: { en: 'all of careful; new dev dependencies; commits to the work branch', ru: 'всё из «осторожно»; dev-зависимости; коммиты в рабочую ветку' },
    withYou: { en: 'push; publishing; deleting what is not yours; money; a change of goal or result', ru: 'push; публикация; удаление чужого; деньги; смена цели или результата' },
  },
  bold: {
    label: 'смело',
    alone: { en: 'all of normal; push to the work branch; open a pull request', ru: 'всё из «обычно»; push в рабочую ветку; pull request' },
    withYou: { en: 'merge to main; publishing outside; deletes; money; a change of goal', ru: 'merge в main; публикация наружу; удаление; деньги; смена цели' },
  },
}

export const AUTHORITIES: readonly Authority[] = ['careful', 'normal', 'bold']

export const isAuthority = (x: unknown): x is Authority => x === 'careful' || x === 'normal' || x === 'bold'

/** The screen the board opens on for each phase. */
export function phaseView(phase: Phase | undefined): string {
  if (phase === 'work') return 'work'
  if (phase === 'review' || phase === 'accepted') return 'review'
  return 'task'
}

// ---------- the protocol Claude reads beside the first prompt and after compaction ----------

export function protocol(dir: string, rules: string, free = false): string {
  if (free) return freeProtocol(dir, rules)
  return [
    'This session uses the session-board two-touch flow. The person runs many sessions at once: they give all input at the start and all feedback at the end.',
    '1. Intake. When the person gives a new task (or asks to write up the current work as a task), fill the task brief with the mcp__session-board__task tool: title, goal, result, done_when (2 to 5 checkable criteria), rules, out_of_scope, authority, materials. Before that call, ask ALL missing questions at once, in ONE AskUserQuestion call. After the call, stop: the person reviews the brief on the board and presses Start. From a phone or a browser (Remote Control) the board draws nothing: the person types «Старт», «Принять» or «Вернуть: …» in the chat, or answers the question /board asks; the board turns that word into the message its button sends, so treat it as the press.',
    '2. Work. After Start, work on your own. Ask the person only for a blocker: an action outside your authority, a fork that is costly to undo and that the brief does not decide, or no way to continue. For any other choice, take the sensible default, record it with mcp__session-board__note (kind decision with status accepted, or kind assumption), and go on. Mark plan steps done when you finish them.',
    '3. Hand-in. When the work is done, check every criterion yourself and collect evidence: a test, a command and its output, file:line, a URL. Then call mcp__session-board__submit and stop. Do not ask the person to check what you can check yourself.',
    '4. Feedback. The person answers with one verdict message: accept, accept with fixes, or return. Apply all of it in one pass, then hand in again unless the task is accepted. If, instead of a verdict, the person writes in their own words what to redo or add, read it as step 5 does: the task goes back to work without «Принять».',
    '5. What is next. The board has no buttons for it: the person just writes, and you decide from the message which of three it is: a redo of the task, an extension of it (one more done-when item), or the next, separate task. For a redo or an extension, call mcp__session-board__reopen (kind redo or extend, text in Russian): the same task goes back to work for a new round, without a verdict and without Start; do the work and hand in with submit. For a separate task, do the intake as usual; when it builds on the accepted task, put that task\'s folder into materials. When the message fits none of the three, answer it and leave the task as it is. The chat words «Переделать: …», «Дополнить: …» reopen the task themselves and send you the message.',
    dir ? `The task folder is the source of truth: ${dir} (task.md, ledger.md). Read task.md there when you need the brief.` : 'The task folder appears when the brief is written.',
    rules ? `Project rules from earlier feedback (follow them):\n${rules}` : '',
  ].filter(Boolean).join('\n')
}

// ---------- free mode: talk and try, no brief, a summary of the ideas at the end ----------

function freeProtocol(dir: string, rules: string): string {
  return [
    'Free mode («Свободный режим») is on. The person wants to think, discuss and try things with you, not to hand over one task. This replaces the two-touch flow until the person gives a new task or continues a paused one.',
    '1. Work as a partner. Talk, offer 2 or 3 options with their trade-offs, ask a question whenever the answer changes what you do, build small quick prototypes and show them, change course when the person reacts. Several topics in one session are normal.',
    '2. No brief, no criteria, no Start, no acceptance: do not call the task or submit tools until the person asks for the summary or for a strict task. Your authority stays as the board shows it.',
    '3. Keep the ideas on the board with mcp__session-board__note: kind idea for each idea worth keeping (title, statement: what it is). Update it by id: status trying while you prototype it, kept when the person wants to keep it, dropped when it is rejected (statement says why). Record decisions and findings as usual.',
    '4. Summary. When the person asks for it («Подвести итог»), give every idea its final status (kept, dropped with the reason, or open when you did not get to it), then call mcp__session-board__submit with summary_ru (what the session gave, 2 or 3 sentences), next, for_you and an empty criteria list. The board writes the summary and closes the free session.',
    dir ? `The session folder: ${dir} (summary.md after the summary, ledger.md).` : '',
    rules ? `Project rules from earlier feedback (follow them):\n${rules}` : '',
  ].filter(Boolean).join('\n')
}

/** How the board shows an idea's status, in the order the screens list them. */
export const IDEA: Record<string, { label: string; glyph: string }> = {
  trying: { label: 'пробуем', glyph: '●' },
  open: { label: 'идея', glyph: '○' },
  kept: { label: 'оставили', glyph: '✓' },
  dropped: { label: 'отбросили', glyph: '✗' },
}

export const ideasOf = (L: Ledger) => L.nodes.filter(n => n.kind === 'idea' && n.status !== 'superseded')

/** The message the «Свободный режим» button sends. */
export function freeMessage(t: TaskSpec, paused?: TaskSpec | null): string {
  const a = AUTHORITY[t.authority]
  return `Свободный режим. Задания, критериев и приёмки нет: обсуждаем, пробуем, переделываем. Работай как партнёр: предлагай 2–3 варианта, спрашивай, когда ответ что-то меняет, быстро пробуй и показывай. ` +
    `Идеи веди на доске через note: kind idea; статус trying — пробуем, kept — оставили, dropped — отбросили (в statement_ru — почему). Тулы task и submit не вызывай, пока я не попрошу итог или строгую задачу. ` +
    `Полномочия: ${a.label} — сам: ${a.alone.ru}; только со мной: ${a.withYou.ru}.${paused ? ` Задача «${paused.title.ru}» на паузе: не продолжай её, пока я к ней не вернусь.` : ''} Итог подведёшь, когда я скажу «Подвести итог».`
}

/** The message the «Подвести итог» button sends. */
export const WRAP_ASK = 'Подведи итог свободной сессии: доведи каждую идею до статуса — оставили, отбросили (с причиной) или не дошли, — и сдай итог через submit с пустым списком criteria: summary_ru, next, for_you.'

/** The summary of a free session: summary.md and the «Итог» screen. Before the summary, the ideas so far. */
export function renderSummary(L: Ledger): string {
  const t = L.task
  const sub = t?.submitted
  const ideas = ideasOf(L)
  const line = (n: LedgerNode) => {
    const url = n.evidence.find(e => /^https?:\/\//.test(e.ref))?.ref
    return `- ${n.title.ru}${n.statement ? ` — ${n.statement.ru}` : ''}${url ? ` (${url})` : ''}`
  }
  const part = (title: string, lines: string[]) => (lines.length ? [`## ${title}`, '', ...lines, ''] : [])
  const of = (...st: string[]) => ideas.filter(n => st.includes(n.status)).map(line)
  return [
    `# Итог: ${t?.title.ru ?? 'свободная сессия'}`, '',
    sub ? `${sub.summary.ru}\n\n_${sub.at.slice(0, 16).replace('T', ' ')}_` : 'Итог ещё не подведён. Ниже — идеи на сейчас.', '',
    ...part('Оставили', of('kept')),
    ...part('Отбросили', of('dropped')),
    ...part('Не решили', of('open', 'trying')),
    ...part('Решения', L.nodes.filter(n => n.kind === 'decision' && live(n) && !n.tag).map(line)),
    ...part('Дальше', (sub?.next ?? []).map(x => `- ${x}`)),
    ...part('Нужно от тебя', (sub?.forYou ?? []).map(x => `- ${x}`)),
    ideas.length ? '' : 'Идей на доске пока нет.',
  ].join('\n').trim() + '\n'
}

// ---------- the task brief ----------

export type TaskInput = {
  title: Txt
  goal: Txt
  result: Txt
  criteria: Txt[]
  rules: Txt[]
  outOfScope: string[]
  materials: string[]
  authority?: Authority
}

const strs = (x: unknown, max = 12): string[] =>
  Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string' && !!s.trim()).map(s => s.trim().slice(0, 240)).slice(0, max) : []

const txts = (x: unknown, max = 8): Txt[] => (Array.isArray(x) ? x.map(v => txt(v)).filter((v): v is Txt => !!v).slice(0, max) : [])

/** Read the task tool's untrusted input. Null when the brief has no title or goal. */
export function parseTaskInput(raw: Record<string, unknown>): TaskInput | { error: string } {
  const pair = (k: string) => txt(typeof raw[k] === 'string' && typeof raw[`${k}_ru`] === 'string' ? { en: raw[k], ru: raw[`${k}_ru`] } : raw[k] ?? raw[`${k}_ru`], 400)
  const title = pair('title')
  const goal = pair('goal')
  if (!title || !goal) return { error: 'title and goal are required' }
  const criteria = txts(raw.done_when, 6)
  if (!criteria.length) return { error: 'done_when needs 2 to 5 checkable criteria' }
  return {
    title: { en: title.en.slice(0, 90), ru: title.ru.slice(0, 90) },
    goal,
    result: pair('result') ?? { en: '', ru: '' },
    criteria,
    rules: txts(raw.rules),
    outOfScope: strs(raw.out_of_scope),
    materials: strs(raw.materials),
    ...(isAuthority(raw.authority) ? { authority: raw.authority } : {}),
  }
}

/** A folder name: date plus a slug of the English title. */
export function slugify(s: string): string {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  if (base.length <= 40) return base
  const cut = base.slice(0, 41)
  const i = cut.lastIndexOf('-')
  return (i > 15 ? cut.slice(0, i) : base.slice(0, 40)).replace(/-+$/, '')
}

const gone = (n: LedgerNode) => ['superseded', 'dropped'].includes(n.status)
const live = (n: LedgerNode) => !gone(n)

/** Ops that put the brief into the ledger: one goal, its criteria, the rules. Old brief items are superseded. */
export function briefOps(L: Ledger, input: TaskInput): Op[] {
  const ops: Op[] = []
  for (const n of L.nodes) {
    const fromBrief = n.evidence.some(e => e.ref === 'task brief')
    if ((n.kind === 'criterion' || n.kind === 'constraint') && fromBrief && n.status !== 'superseded') ops.push({ op: 'supersede', id: n.id })
  }
  // The brief's own goal, or the only goal of the work. With several goals the task gets a goal of its own:
  // rewriting one of them would lose what it meant.
  const active = L.nodes.filter(n => n.kind === 'goal' && !['done', 'dropped', 'superseded'].includes(n.status))
  const goal = L.nodes.find(n => n.kind === 'goal' && !gone(n) && n.evidence.some(e => e.ref === 'task brief'))
    ?? (active.length === 1 && L.nodes.filter(n => n.kind === 'goal').length === 1 ? active[0] : undefined)
  const goalId = goal?.id ?? nextId(L.nodes, 'goal')
  if (goal) ops.push({ op: 'update', id: goal.id, title: input.title, statement: input.goal, evidence: [...goal.evidence.filter(e => e.ref !== 'task brief'), { ref: 'task brief', type: 'user' }] })
  else ops.push({ op: 'add', kind: 'goal', id: goalId, title: input.title, statement: input.goal, evidence: [{ ref: 'task brief', type: 'user' }] })
  for (const k of input.criteria) ops.push({ op: 'add', kind: 'criterion', parent: goalId, title: k, status: 'todo', evidence: [{ ref: 'task brief', type: 'user' }] })
  for (const c of input.rules) ops.push({ op: 'add', kind: 'constraint', title: c, statement: c, evidence: [{ ref: 'task brief', type: 'user' }] })
  return ops
}



export const criteriaOf = (L: Ledger) => L.nodes.filter(n => n.kind === 'criterion' && live(n))

/** The first line of the Acceptance screen and the report: can the person accept, in plain words. */
export function verdictLine(crit: LedgerNode[]): string {
  if (!crit.length) return 'В задании не было пунктов для проверки'
  const failed = crit.filter(k => k.status === 'failed').length
  const open = crit.filter(k => k.status !== 'proven' && k.status !== 'failed').length
  if (!failed && !open) return 'Всё готово, можно принимать'
  const proven = crit.length - failed - open
  return `Готово ${proven} из ${crit.length}${failed ? ` · не вышло: ${failed}` : ''}${open ? ` · не проверено: ${open}` : ''}`
}

/** The technical proof of a node, one line per item, without the brief's own marker. */
export const proofOf = (n: LedgerNode) => n.evidence.filter(e => e.ref !== 'task brief').map(e => e.ref)

export function renderTaskMd(L: Ledger): string {
  const t = L.task
  if (!t) return ''
  const a = AUTHORITY[t.authority]
  if (t.mode === 'free') {
    return [
      `# ${t.title.ru}`, '',
      `_Свободный режим_ · фаза: ${t.phase} · создано ${t.created.slice(0, 16).replace('T', ' ')}`, '',
      'Задания, критериев и приёмки нет. Итог — сводка идей в summary.md.', '',
      `## Полномочия: ${a.label}`, '', `- Сам: ${a.alone.ru}`, `- Только с тобой: ${a.withYou.ru}`, '',
    ].join('\n')
  }
  const out: string[] = [
    `# ${t.title.ru}`,
    '',
    `_${t.title.en}_ · фаза: ${t.phase} · раунд ${t.round} · создано ${t.created.slice(0, 16).replace('T', ' ')}${t.started ? ` · старт ${t.started.slice(0, 16).replace('T', ' ')}` : ''}`,
    '',
    '## Цель', '', t.goal.ru || '—', '',
    '## Результат', '', t.result.ru || '—', '',
    '## Готово, когда', '',
    ...criteriaOf(L).map(k => `- [${k.status === 'proven' ? 'x' : ' '}] **${k.id}** ${k.title.ru}${k.status === 'failed' ? ' — не выполнен' : ''}${k.evidence.filter(e => e.ref !== 'task brief').length ? ` _(${k.evidence.filter(e => e.ref !== 'task brief').map(e => e.ref).join('; ')})_` : ''}`),
    '',
    '## Правила', '',
    ...(L.nodes.filter(n => n.kind === 'constraint' && live(n) && n.status !== 'lifted').map(c => `- **${c.id}** ${c.statement?.ru ?? c.title.ru}`)),
    '',
    '## Вне рамок', '', ...(t.outOfScope.length ? t.outOfScope.map(s => `- ${s}`) : ['—']), '',
    `## Полномочия: ${a.label}`, '', `- Сам: ${a.alone.ru}`, `- Только с тобой: ${a.withYou.ru}`, '',
    ...(t.code ? [`## Код: lean ${LEAN_LEVEL[t.code].label}`, '', LEAN_LEVEL[t.code].ru, ''] : []),
    '## Материалы', '', ...(t.materials.length ? t.materials.map(s => `- ${s}`) : ['—']), '',
  ]
  return out.join('\n')
}

/** The message the Start button sends. */
export function startMessage(t: TaskSpec): string {
  const a = AUTHORITY[t.authority]
  return `Старт по заданию «${t.title.ru}». Работай сам. Полномочия: ${a.label} — сам: ${a.alone.ru}; только со мной: ${a.withYou.ru}.${t.code ? ` ${codeLine(t.code)}` : ''} Зови меня только при блокере. Когда закончишь — проверь каждый критерий и сдай работу через submit.`
}

// ---------- the verdict ----------

export type VerdictKind = 'accept' | 'fixes' | 'return'

export const VERDICT_LABEL: Record<VerdictKind, string> = { accept: 'принято', fixes: 'принято с правками', return: 'вернуть на доработку' }

/** One message with the whole verdict: what is wrong, what to undo, new rules. */
export function verdictMessage(kind: VerdictKind, L: Ledger, v: Verdict): string {
  const byId = new Map(L.nodes.map(n => [n.id, n]))
  const line = (id: string) => {
    const n = byId.get(id)
    const c = v.comments[id]
    return `- ${id} ${n ? n.title.ru : ''}${c ? `: ${c}` : ''}`
  }
  const no = Object.entries(v.marks).filter(([, m]) => m === 'no').map(([id]) => id)
  const commentedOk = Object.keys(v.comments).filter(id => v.marks[id] !== 'no')
  // lean's items: a mark asks for the thing Claude left out, not for a different path
  const lean = no.filter(id => byId.get(id)?.tag)
  const plain = no.filter(id => !lean.includes(id))
  const crit = plain.filter(id => byId.get(id)?.kind === 'criterion')
  const undo = plain.filter(id => byId.get(id)?.kind === 'decision')
  const wrong = plain.filter(id => byId.get(id)?.kind === 'assumption')
  const other = plain.filter(id => !crit.includes(id) && !undo.includes(id) && !wrong.includes(id))
  const round = L.task?.round ?? 1
  const head = kind === 'accept'
    ? `Приёмка, раунд ${round}: принято.`
    : kind === 'fixes'
      ? `Приёмка, раунд ${round}: принято с правками. Внеси правки ниже одним заходом и сдай через submit — задача закроется без новой приёмки.`
      : `Приёмка, раунд ${round}: вернуть на доработку. Исправь всё ниже одним заходом, проверь критерии и сдай снова через submit.`
  const parts: string[] = [head]
  if (crit.length) parts.push('Критерии не выполнены:', ...crit.map(line))
  if (undo.length) parts.push('Отмени эти решения и выбери другой путь:', ...undo.map(line))
  if (wrong.length) parts.push('Эти допущения неверны:', ...wrong.map(line))
  if (other.length) parts.push('Не так:', ...other.map(line))
  for (const tag of LEAN_TAGS) {
    const ids = lean.filter(id => byId.get(id)?.tag === tag)
    if (ids.length) parts.push(TAG[tag].ask, ...ids.map(line))
  }
  if (commentedOk.length) parts.push('Замечания:', ...commentedOk.map(line))
  if (v.general.length) parts.push('Общие замечания:', ...v.general.map(g => `- ${g}`))
  if (v.rules.length) parts.push('Новые правила проекта (уже записаны в .claude/tasks/RULES.md, соблюдай их дальше):', ...v.rules.map(r => `- ${r}`))
  if (kind === 'accept') parts.push('Закрой цели задачи. Новых действий не нужно.')
  return parts.join('\n')
}

export const emptyVerdict = (): Verdict => ({ marks: {}, comments: {}, general: [], rules: [] })

// ---------- after acceptance: the same task back to work, without Start ----------

export type ReopenKind = 'redo' | 'extend'

export const REOPEN_LABEL: Record<ReopenKind, string> = { redo: 'переделать', extend: 'дополнить' }

/** The message «Переделать» and «Дополнить» send; `t` is the reopened task, `crit` the new criterion's id. */
export function reopenMessage(t: TaskSpec, kind: ReopenKind, text: string, crit?: string): string {
  return kind === 'redo'
    ? `Переделай задачу «${t.title.ru}», раунд ${t.round}: ${text}. Задача снова в работе, «Старт» не нужен. Исправь одним заходом, проверь все критерии и сдай через submit.`
    : `Дополни задачу «${t.title.ru}», раунд ${t.round}: ${text}. Это новый пункт ${crit} «готово, когда». Задача снова в работе, «Старт» не нужен. Сделай, проверь все критерии и сдай через submit.`
}

/** Texts the person can turn into project rules: their comments and general remarks. */
export function ruleCandidates(v: Verdict): string[] {
  return [...Object.values(v.comments), ...v.general].map(s => s.trim()).filter(Boolean)
}
