import type { ElementTable } from 'claude-code'

import type { Authority, BoardStatus, DiffView, Kind, Ledger, LedgerNode, LiveEvent, OpenTask, Phase, QA, Verdict } from '../types'
import { AUTHORITIES, AUTHORITY, criteriaOf, phaseView, ruleCandidates, type VerdictKind } from './task'

// Layout rules: docs/mod-design.md. Width comes from e.props.bodyColumns. Rows are a fixed gutter
// (flexShrink 0) plus a growing, wrapping body (flexGrow 1, minWidth 0). Every gap is an explicit margin.
// Screens follow docs/board-logic.md: each one answers one question of the person who runs the session.

export type Els = Pick<ElementTable<'desktop'>, 'Box' | 'Text' | 'Button' | 'Markdown' | 'Input' | 'Code'>
export type SvgCtor = ElementTable<'desktop'>['Svg']

export type AddKind = 'rule' | 'ban' | 'fact' | 'criterion'

export type Actions = {
  setView: (v: string) => void
  toggle: (id: string) => void
  refresh: () => void
  edit: (id: string) => void
  startAnswer: (id: string) => void
  submitAnswer: (id: string, text: string) => void
  ask: (q: string) => void
  askAbout: (q: string) => void
  undoDecision: (id: string) => void
  openFile: (path: string) => void
  showDiff: (path: string) => void
  tellClaude: (text: string) => void
  newTask: (text: string) => void
  formalize: () => void
  fixTask: (text: string) => void
  setAuthority: (a: Authority) => void
  start: () => void
  addItem: (kind: AddKind, text: string) => void
  stale: (id: string) => void
  sendNotes: () => void
  mark: (id: string, m: 'ok' | 'no') => void
  comment: (id: string, text: string) => void
  addGeneral: (text: string) => void
  toggleRule: (text: string) => void
  sendVerdict: (kind: VerdictKind) => void
  openReport: () => void
  continueTask: (dir: string) => void
}

export type Data = {
  svg?: SvgCtor
  ledger: Ledger
  view: string
  expanded: string[]
  status: BoardStatus
  live: LiveEvent[]
  qa: QA[]
  answering: string
  diff: DiffView | null
  verdict: Verdict
  notes: string[]
  editing: string
  openTasks: OpenTask[]
  policy: Authority
  width: number
}

export const VIEWS = [
  { id: 'task', label: 'Задание', key: '1' },
  { id: 'work', label: 'Ход', key: '2' },
  { id: 'review', label: 'Приёмка', key: '3' },
  { id: 'log', label: 'Журнал', key: '4' },
  { id: 'ask', label: 'Спросить', key: '5' },
] as const

const LOG_TABS = [
  { id: 'log', label: 'Почему' },
  { id: 'log-turns', label: 'Ходы' },
  { id: 'log-files', label: 'Файлы' },
  { id: 'log-memory', label: 'Память Claude' },
] as const

/** A stored view name, or the screen of the current phase when the person did not pick one. */
export function resolveView(stored: string, phase: Phase | undefined): string {
  if (VIEWS.some(v => v.id === stored) || LOG_TABS.some(v => v.id === stored)) return stored
  return phaseView(phase)
}

export const COLOR: Record<Kind, string> = {
  goal: '#5b8cff', constraint: '#b57bff', question: '#8f7bff', hypothesis: '#8b93a1', task: '#34b27b', action: '#8b93a1',
  finding: '#e0a526', decision: '#ef6b55', open: '#ff9330', assumption: '#8b93a1', risk: '#ff6b6b', criterion: '#2bb3a3',
}
export const RED = '#ff6b6b'
export const ORANGE = '#ff9330'
export const GREEN = '#34b27b'
export const BLUE = '#5b8cff'

export const LABEL: Record<Kind, string> = {
  goal: 'цель', constraint: 'правило', question: 'вопрос', hypothesis: 'гипотеза', task: 'шаг', action: 'действие',
  finding: 'находка', decision: 'решение', open: 'вопрос', assumption: 'допущение', risk: 'риск', criterion: 'критерий',
}

export const PHASE_LABEL: Record<Phase, string> = {
  none: 'задания нет', intake: 'задание ждёт старта', work: 'Claude работает', review: 'работа сдана', accepted: 'принято',
}

const gone = (n: LedgerNode) => ['superseded', 'dropped'].includes(n.status)
const isClosed = (n: LedgerNode) => ['done', 'dropped', 'superseded', 'refuted', 'answered', 'lifted', 'rejected'].includes(n.status)
const kidsOf = (L: Ledger, id: string) => L.nodes.filter(n => n.parent === id)
export const waitingQuestions = (L: Ledger) => L.nodes.filter(n => n.kind === 'open' && n.status === 'open' && (n.ask ?? 'user') === 'user')
export const myDecisions = (L: Ledger) => L.nodes.filter(n => n.kind === 'decision' && n.by !== 'user' && !gone(n))

/** Vertical rhythm, in rows. Desktop needs explicit room: nothing adds it for us. */
const SPACE = { section: 2, item: 1 } as const

/** A section heading. No box-drawing lines: desktop draws text in a proportional font. */
function Rule(els: Els, key: string, title: string, count?: number) {
  const { Box, Text } = els
  return (
    <Box key={key} marginTop={SPACE.section}>
      <Text wrap="truncate-end"><Text bold>{title}</Text>{count !== undefined ? <Text dimColor>{`  ${count}`}</Text> : null}</Text>
    </Box>
  )
}

/** Fixed gutter on the left, growing wrapping body on the right; the mark aligns with the FIRST line. */
function Row(els: Els, key: string, gutterWidth: number, gutter: unknown, body: unknown, indent = 0) {
  const { Box } = els
  return (
    <Box key={key} flexDirection="row" alignItems="flex-start" paddingLeft={indent}>
      <Box width={gutterWidth} flexShrink={0}>{gutter as never}</Box>
      <Box flexGrow={1} flexShrink={1} minWidth={0}>{body as never}</Box>
    </Box>
  )
}

/** Truncating text on the left, a pinned tail on the right. */
function Split(els: Els, key: string, left: unknown, right: unknown) {
  const { Box } = els
  return (
    <Box key={key} flexDirection="row" justifyContent="space-between" alignItems="flex-start" columnGap={2}>
      <Box flexShrink={1} minWidth={0}>{left as never}</Box>
      <Box flexShrink={0}>{right as never}</Box>
    </Box>
  )
}

/** A row of action buttons that wraps on narrow panes. */
function ActionBar(els: Els, key: string, buttons: unknown[], indent = 0, top: number = SPACE.item) {
  const { Box } = els
  return (
    <Box key={key} flexDirection="row" flexWrap="wrap" columnGap={2} rowGap={SPACE.item} paddingLeft={indent} marginTop={top}>
      {buttons.filter(Boolean) as never}
    </Box>
  )
}

function Tag(els: Els, label: string, color: string) {
  const { Text } = els
  return <Text color={color} bold>{label}</Text>
}

function Para(els: Els, key: string, text: string, dim = false, top: number = SPACE.item) {
  const { Box, Text } = els
  return <Box key={key} marginTop={top}><Text wrap="wrap" dimColor={dim}>{text}</Text></Box>
}

/** An input in its own row: a focused Input takes the whole width. */
function Field(els: Els, key: string, label: string, placeholder: string, submitLabel: string, onSubmit: (v: string) => void, onCancel: () => void) {
  const { Box, Input, Button } = els
  return (
    <Box key={key} flexDirection="column" marginTop={SPACE.item}>
      <Input key={`${key}-in`} label={label} placeholder={placeholder} submitLabel={submitLabel} autoFocus onSubmit={v => onSubmit(v)} />
      {ActionBar(els, `${key}-x`, [<Button key={`${key}-cancel`} plain label="отмена" dimColor onPress={() => onCancel()} />])}
    </Box>
  )
}

export function Bar(els: Els, key: string, done: number, total: number, width: number, svg?: SvgCtor) {
  const { Text } = els
  const frac = total ? done / total : 0
  if (svg) {
    // 1000 x 40 with the bar in the middle: the empty bands above and below are the bar's own breathing room
    const fill = Math.round(1000 * frac)
    const source = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="40" viewBox="0 0 1000 40">` +
      `<rect y="15" width="1000" height="10" rx="5" fill="#8b93a1" fill-opacity=".28"/>` +
      (fill ? `<rect y="15" width="${Math.max(10, fill)}" height="10" rx="5" fill="${GREEN}"/>` : '') + `</svg>`
    return svg({ source, alt: `готово ${done} из ${total}` })
  }
  const w = Math.max(8, width)
  const n = Math.round(frac * w)
  return (
    <Text key={key} wrap="truncate-end">
      <Text color={GREEN}>{'━'.repeat(n)}</Text>
      <Text dimColor>{'━'.repeat(w - n)}</Text>
    </Text>
  )
}

function critMark(els: Els, status: string) {
  const { Text } = els
  if (status === 'proven') return <Text color={GREEN} bold>✓</Text>
  if (status === 'failed') return <Text color={RED} bold>✗</Text>
  return <Text dimColor>○</Text>
}

const evidenceText = (n: LedgerNode) => n.evidence.filter(e => e.ref !== 'task brief').map(e => e.ref).slice(0, 3).join(' · ')

// ---------- header ----------

export function Header(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button } = els
  const s = d.status
  const tab = d.view.startsWith('log') ? 'log' : d.view
  const note =
    s.phase === 'mapping' ? `⟳ ставлю на карту: ${s.note.includes(',') ? 'ходы' : s.note === 'вся сессия' ? '' : 'ход'} ${s.note}`
      : s.phase === 'error' ? '⚠ карта не обновилась'
        : `${PHASE_LABEL[d.ledger.task?.phase ?? 'none']}${d.ledger.turns.length ? ` · ход ${d.ledger.turns.at(-1)?.n ?? 0}` : ''}`
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" flexWrap="wrap" columnGap={2} rowGap={SPACE.item}>
        {VIEWS.map(v => (
          <Button key={`view-${v.id}`} plain label={v.label} hotkey={v.key} dimColor={tab !== v.id} onPress={() => a.setView(v.id)} />
        ))}
      </Box>
      <Box marginTop={SPACE.item}>
        {Split(els, 'status', <Text dimColor wrap="truncate-end">{note}</Text>,
          <Button key="refresh" plain label="↻ обновить" dimColor onPress={() => a.refresh()} />)}
      </Box>
      {d.notes.length ? (
        <Box flexDirection="column" marginTop={SPACE.item} borderStyle="round" borderColor={BLUE} paddingX={1}>
          <Text wrap="wrap">{Tag(els, 'для Claude  ', BLUE)}заметок: {d.notes.length}. Уйдут с твоим следующим сообщением.</Text>
          {d.notes.slice(-3).map((n, i) => <Text key={`note-${i}`} dimColor wrap="wrap">• {n}</Text>)}
          {ActionBar(els, 'notes-a', [<Button key="notes-send" label="Отправить сейчас" onPress={() => a.sendNotes()} />])}
        </Box>
      ) : null}
    </Box>
  )
}

// ---------- 1. task: the contract ----------

const TEMPLATE: [string, string][] = [
  ['Цель', 'что должно измениться и зачем'],
  ['Результат', 'что сдать: файлы, PR, отчёт, демо'],
  ['Готово, когда', '2–5 проверяемых критериев: команда, тест, скриншот'],
  ['Рамки', 'правила, запреты, что вне задачи'],
  ['Полномочия', 'что Claude решает сам, что только с тобой'],
  ['Материалы', 'файлы, ссылки, примеры'],
]

function AuthorityPicker(els: Els, key: string, current: Authority, a: Actions) {
  const { Box, Text, Button } = els
  const x = AUTHORITY[current]
  return (
    <Box key={key} flexDirection="column">
      {ActionBar(els, `${key}-b`, AUTHORITIES.map(level => (
        <Button key={`auth-${level}`} label={AUTHORITY[level].label} variant={level === current ? 'primary' : 'secondary'} onPress={() => a.setAuthority(level)} />
      )))}
      <Box flexDirection="column" marginTop={SPACE.item}>
        {Row(els, `${key}-alone`, 15, <Text dimColor>сам</Text>, <Text wrap="wrap">{x.alone.ru}</Text>)}
        {Row(els, `${key}-you`, 15, <Text dimColor>с тобой</Text>, <Text wrap="wrap">{x.withYou.ru}</Text>)}
      </Box>
    </Box>
  )
}

const ADD_LABEL: Record<AddKind, { button: string; field: string; hint: string }> = {
  rule: { button: '+ правило', field: 'Правило', hint: 'как Claude должен работать' },
  ban: { button: '+ запрет', field: 'Запрет', hint: 'чего Claude делать нельзя' },
  fact: { button: '+ факт', field: 'Факт', hint: 'что ты знаешь, а Claude нет' },
  criterion: { button: '+ критерий', field: 'Критерий', hint: 'готово, когда…' },
}

function AddBar(els: Els, d: Data, a: Actions, kinds: AddKind[]) {
  const { Box, Text, Button } = els
  const open = kinds.find(k => d.editing === `add:${k}`)
  if (open) {
    return Field(els, `add-${open}`, ADD_LABEL[open].field, ADD_LABEL[open].hint, 'добавить', v => a.addItem(open, v), () => a.edit(''))
  }
  return (
    <Box flexDirection="column">
      {ActionBar(els, 'add', kinds.map(k => <Button key={`add-${k}`} label={ADD_LABEL[k].button} onPress={() => a.edit(`add:${k}`)} />))}
      <Box marginTop={SPACE.item}><Text dimColor wrap="wrap">Добавленное ляжет в журнал и уйдёт Claude с твоим следующим сообщением, не прерывая его.</Text></Box>
    </Box>
  )
}

function NoTask(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button } = els
  return (
    <Box flexDirection="column">
      {Rule(els, 'r-task', 'Задания нет')}
      {Para(els, 'nt-1', 'Опиши задачу как есть. Claude разложит её по шаблону, задаст все вопросы одним окном и будет ждать «Старт».')}
      {d.editing === 'intake'
        ? Field(els, 'intake', 'Задача', 'что сделать, зачем, что сдать, что нельзя', 'поставить', v => a.newTask(v), () => a.edit(''))
        : ActionBar(els, 'nt-a', [
          <Button key="task-new" label="Поставить задачу" variant="primary" onPress={() => a.edit('intake')} />,
          d.ledger.turns.length || d.ledger.nodes.length ? <Button key="task-formal" label="Оформить текущую работу" onPress={() => a.formalize()} /> : null,
        ])}
      {Rule(els, 'r-tpl', 'Шаблон задания')}
      <Box flexDirection="column" marginTop={SPACE.item}>
        {TEMPLATE.map(([k, v]) => Row(els, `tpl-${k}`, 16, <Text bold>{k}</Text>, <Text dimColor wrap="wrap">{v}</Text>))}
      </Box>
      {Rule(els, 'r-policy', 'Полномочия по умолчанию в проекте')}
      {AuthorityPicker(els, 'policy', d.policy, a)}
      {d.openTasks.length ? Rule(els, 'r-open', 'Начатые задачи в проекте', d.openTasks.length) : null}
      {d.openTasks.map((t, i) => (
        <Box key={`ot-${t.dir}`} flexDirection="column" marginTop={i === 0 ? SPACE.item : SPACE.section}>
          <Text bold wrap="wrap">{t.title}</Text>
          <Text dimColor wrap="truncate-end">{PHASE_LABEL[t.phase]} · {t.updated.slice(0, 16).replace('T', ' ')}</Text>
          {ActionBar(els, `ot-a-${i}`, [<Button key={`ot-go-${i}`} label="Продолжить здесь" onPress={() => a.continueTask(t.dir)} />])}
        </Box>
      ))}
    </Box>
  )
}

export function TaskView(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button } = els
  const L = d.ledger
  const t = L.task
  if (!t) return NoTask(els, d, a)
  const crit = criteriaOf(L)
  const rules = L.nodes.filter(n => n.kind === 'constraint' && !gone(n) && n.status !== 'lifted')
  const section = (key: string, title: string, body: unknown) => (
    <Box key={key} flexDirection="column">
      {Rule(els, `r-${key}`, title)}
      <Box flexDirection="column" marginTop={SPACE.item}>{body as never}</Box>
    </Box>
  )
  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginTop={SPACE.item}>
        <Text bold wrap="wrap">{t.title.ru}</Text>
        <Text dimColor wrap="wrap">{PHASE_LABEL[t.phase]}{t.round > 1 ? ` · раунд ${t.round}` : ''} · полномочия: {AUTHORITY[t.authority].label}</Text>
      </Box>
      {!t.formal ? (
        <Box flexDirection="column" borderStyle="round" borderColor={ORANGE} paddingX={1} marginTop={SPACE.item}>
          <Text wrap="wrap">{Tag(els, 'не оформлено  ', ORANGE)}Задание выросло из работы: в нём нет критериев «готово, когда». Без них приёмка будет на глаз.</Text>
          {ActionBar(els, 'tf-a', [<Button key="task-formal" label="Оформить задание" variant="primary" onPress={() => a.formalize()} />])}
        </Box>
      ) : null}
      {t.phase === 'intake' ? (
        <Box flexDirection="column" borderStyle="round" borderColor={BLUE} paddingX={1} marginTop={SPACE.item}>
          <Text wrap="wrap">{Tag(els, 'проверь  ', BLUE)}Если всё верно — жми «Старт». Дальше Claude работает сам и зовёт тебя только при блокере.</Text>
          {d.editing === 'fix'
            ? Field(els, 'fix', 'Что поправить', 'что не так в задании', 'отправить', v => a.fixTask(v), () => a.edit(''))
            : ActionBar(els, 'ti-a', [
              <Button key="task-start" label="Старт" variant="primary" onPress={() => a.start()} />,
              <Button key="task-fix" label="Поправить" onPress={() => a.edit('fix')} />,
            ])}
        </Box>
      ) : null}
      {section('goal', 'Цель', <Text wrap="wrap">{t.goal.ru || '—'}</Text>)}
      {section('result', 'Результат', <Text wrap="wrap">{t.result.ru || '—'}</Text>)}
      {section('crit', `Готово, когда · ${crit.filter(k => k.status === 'proven').length} из ${crit.length}`, crit.length
        ? crit.map(k => Row(els, `tk-${k.id}`, 3, critMark(els, k.status), <Text wrap="wrap">{k.title.ru}</Text>))
        : <Text dimColor wrap="wrap">Критериев нет.</Text>)}
      {section('rules', 'Правила', rules.length
        ? rules.map(c => Row(els, `rule-${c.id}`, 3, <Text color={COLOR.constraint}>⚑</Text>, <Text wrap="wrap">{c.statement?.ru ?? c.title.ru}</Text>))
        : <Text dimColor>Правил нет.</Text>)}
      {t.outOfScope.length ? section('out', 'Вне рамок', t.outOfScope.map((s, i) => Row(els, `out-${i}`, 3, <Text dimColor>–</Text>, <Text wrap="wrap">{s}</Text>))) : null}
      {section('auth', 'Полномочия', AuthorityPicker(els, 'task-auth', t.authority, a))}
      {t.materials.length ? section('mat', 'Материалы', t.materials.map((s, i) => Row(els, `mat-${i}`, 3, <Text dimColor>·</Text>, <Text wrap="wrap">{s}</Text>))) : null}
      {t.phase === 'work' || t.phase === 'review' ? (
        <Box flexDirection="column">
          {Rule(els, 'r-add', 'Добавить в задание')}
          {AddBar(els, d, a, ['rule', 'ban', 'fact', 'criterion'])}
        </Box>
      ) : null}
      {t.phase === 'accepted' ? (
        d.editing === 'intake'
          ? Field(els, 'intake', 'Новая задача', 'что сделать, зачем, что сдать, что нельзя', 'поставить', v => a.newTask(v), () => a.edit(''))
          : ActionBar(els, 'ta-a', [<Button key="task-new" label="Новая задача" variant="primary" onPress={() => a.edit('intake')} />], 0, SPACE.section)
      ) : null}
      {t.dir ? Para(els, 'tdir', `Папка задачи: ${t.dir}`, true, SPACE.section) : null}
    </Box>
  )
}

// ---------- 2. work: what needs you, the main point, progress ----------

type Problem = { key: string; text: string; action?: { label: string; run: () => void } }

function problemsOf(d: Data, a: Actions): Problem[] {
  const out: Problem[] = []
  const L = d.ledger
  if (d.status.phase === 'error') out.push({ key: 'carto', text: `Карта не обновилась: ${d.status.note}`, action: { label: 'Пересобрать', run: a.refresh } })
  const last = L.turns.at(-1)
  if (last && last.errors > 0) {
    out.push({ key: 'errors', text: `В ходе ${last.n} было ошибок тулов: ${last.errors}`, action: { label: 'Что сломалось?', run: () => a.askAbout(`Что сломалось в ходе ${last.n} и чем это грозит?`) } })
  }
  const unmapped = L.turns.filter(t => !t.mapped)
  // while the cartographer runs, unmapped turns are being handled: not a problem to show
  if (unmapped.length >= 2 && d.status.phase !== 'mapping') out.push({ key: 'unmapped', text: `Ходы ${unmapped.map(t => t.n).join(', ')} не попали на карту`, action: { label: 'Пересобрать', run: a.refresh } })
  return out
}

function NeedsYou(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button, Input } = els
  const qs = waitingQuestions(d.ledger)
  const problems = problemsOf(d, a)
  if (!qs.length && !problems.length) return null
  return (
    <Box flexDirection="column">
      {Rule(els, 'r-needs', 'Нужен ты', qs.length + problems.length)}
      {qs.map(n => (
        <Box key={`q-${n.id}`} flexDirection="column" borderStyle="round" borderColor={ORANGE} paddingX={1} marginTop={1}>
          <Text wrap="wrap">{Tag(els, 'вопрос  ', ORANGE)}<Text bold>{n.title.ru}</Text></Text>
          {n.statement ? <Text dimColor wrap="wrap">{n.statement.ru}</Text> : null}
          {d.answering === n.id ? (
            <Input key={`ans-${n.id}`} label="Ответ" placeholder="уйдёт в сессию как твоё сообщение" submitLabel="отправить" autoFocus
              onSubmit={v => a.submitAnswer(n.id, v)} />
          ) : (
            ActionBar(els, `qa-${n.id}`, [
              ...(n.options ?? []).map((o, i) => (
                <Button key={`opt-${n.id}-${i}`} label={o} variant={i === 0 ? 'primary' : 'secondary'} onPress={() => a.submitAnswer(n.id, o)} />
              )),
              <Button key={`ansb-${n.id}`} label="Ответить текстом" variant={n.options?.length ? 'secondary' : 'primary'} onPress={() => a.startAnswer(n.id)} />,
              <Button key={`qwhy-${n.id}`} plain label="зачем это?" onPress={() => a.askAbout(`Зачем ты спрашиваешь: «${n.title.ru}»? Что изменится от ответа?`)} />,
            ])
          )}
        </Box>
      ))}
      {problems.map(p => (
        <Box key={`p-${p.key}`} flexDirection="column" borderStyle="round" borderColor={RED} paddingX={1} marginTop={1}>
          <Text wrap="wrap">{Tag(els, 'проблема  ', RED)}{p.text}</Text>
          {ActionBar(els, `pa-${p.key}`, [
            p.action ? <Button key={`pact-${p.key}`} label={p.action.label} variant="primary" onPress={() => p.action!.run()} /> : null,
            <Button key={`pfix-${p.key}`} label="Попросить Claude" onPress={() => a.tellClaude(`Посмотри и исправь: ${p.text}`)} />,
          ])}
        </Box>
      ))}
    </Box>
  )
}

function Progress(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button } = els
  const L = d.ledger
  const goals = L.nodes.filter(n => n.kind === 'goal' && !gone(n))
  if (!goals.length) return null
  return (
    <Box flexDirection="column">
      {Rule(els, 'r-progress', 'Прогресс')}
      {goals.map((g, gi) => {
        const steps = kidsOf(L, g.id).filter(n => n.kind === 'task' && !gone(n))
        const done = steps.filter(s => s.status === 'done').length
        const finished = g.status === 'done' || (steps.length > 0 && done === steps.length)
        const open = d.expanded.includes(g.id) || steps.some(s => s.status === 'doing')
        return (
          <Box key={`g-${g.id}`} flexDirection="column" marginTop={gi === 0 ? SPACE.item : SPACE.section}>
            {Split(els, `gh-${g.id}`, <Text bold wrap="wrap" dimColor={finished}>{finished ? '✓ ' : ''}{g.title.ru}</Text>,
              <Text dimColor>{steps.length ? `${done} из ${steps.length}` : finished ? 'готово' : 'без шагов'}</Text>)}
            {steps.length && !finished ? Bar(els, `gb-${g.id}`, done, steps.length, d.width - 2, d.svg) : null}
            {open && steps.length ? (
              <Box flexDirection="column" marginTop={SPACE.item}>
                {steps.map(s => Row(els, `st-${s.id}`, 3,
                  <Text color={s.status === 'done' ? GREEN : s.status === 'doing' ? BLUE : undefined} dimColor={s.status === 'todo'}>
                    {s.status === 'done' ? '✓' : s.status === 'doing' ? '●' : '○'}
                  </Text>,
                  <Text wrap="wrap" dimColor={s.status === 'done'} bold={s.status === 'doing'}>{s.title.ru}{s.status === 'doing' ? <Text dimColor>  — сейчас</Text> : null}</Text>))}
              </Box>
            ) : null}
            {ActionBar(els, `ga-${g.id}`, [
              steps.length ? <Button key={`gx-${g.id}`} plain label={open ? 'свернуть шаги' : `шаги (${steps.length})`} onPress={() => a.toggle(g.id)} /> : null,
              !finished ? <Button key={`gq-${g.id}`} plain label="что осталось?" onPress={() => a.askAbout(`Что осталось сделать по цели «${g.title.ru}» и что может помешать?`)} /> : null,
            ])}
          </Box>
        )
      })}
    </Box>
  )
}

export function WorkView(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button } = els
  const L = d.ledger
  const crit = criteriaOf(L)
  const mine = myDecisions(L).length
  const assumptions = L.nodes.filter(n => n.kind === 'assumption' && !isClosed(n)).length
  return (
    <Box flexDirection="column">
      {NeedsYou(els, d, a)}
      {L.brief ? (
        <Box flexDirection="column">
          {Rule(els, 'r-main', 'Главное')}
          <Box marginTop={SPACE.item}><Text bold wrap="wrap">{L.brief.answer.ru}</Text></Box>
        </Box>
      ) : (
        <Box flexDirection="column">
          {Rule(els, 'r-main', 'Главное')}
          {Para(els, 'nomap', 'Карты пока нет. Она соберётся после первого хода с работой.')}
          {!L.task ? ActionBar(els, 'nomap-a', [<Button key="go-task" label="К заданию" onPress={() => a.setView('task')} />]) : null}
        </Box>
      )}
      {Progress(els, d, a)}
      {L.task && L.task.phase !== 'accepted' ? (
        <Box flexDirection="column">
          {Rule(els, 'r-pile', 'Копится на приёмку')}
          <Box marginTop={SPACE.item}>
            <Text wrap="wrap" dimColor>
              {crit.length ? `критериев доказано ${crit.filter(k => k.status === 'proven').length} из ${crit.length} · ` : ''}решений Claude {mine} · допущений {assumptions}
            </Text>
          </Box>
          {ActionBar(els, 'pile-a', [<Button key="pile-open" plain label="посмотреть" onPress={() => a.setView('review')} />])}
        </Box>
      ) : null}
    </Box>
  )
}

// ---------- 3. review: the verdict in one pass ----------

function MarkButtons(els: Els, d: Data, a: Actions, id: string, ok: string, no: string) {
  const { Button } = els
  const m = d.verdict.marks[id]
  const c = d.verdict.comments[id]
  return [
    <Button key={`v-ok-${id}`} label={m === 'ok' ? `✓ ${ok}` : ok} variant={m === 'ok' ? 'primary' : 'secondary'} onPress={() => a.mark(id, 'ok')} />,
    <Button key={`v-no-${id}`} label={m === 'no' ? `✗ ${no}` : no} variant={m === 'no' ? 'primary' : 'secondary'} onPress={() => a.mark(id, 'no')} />,
    <Button key={`v-c-${id}`} plain label={c ? 'изменить комментарий' : 'комментарий'} onPress={() => a.edit(`c:${id}`)} />,
  ]
}

function ReviewItem(els: Els, d: Data, a: Actions, n: LedgerNode, mark: unknown, detail: string, ok: string, no: string, first: boolean) {
  const { Box, Text } = els
  const c = d.verdict.comments[n.id]
  return (
    <Box key={`rv-${n.id}`} flexDirection="column" marginTop={first ? SPACE.item : SPACE.section}>
      {Row(els, `rvr-${n.id}`, 3, mark, <Text wrap="wrap">{n.title.ru}</Text>)}
      {detail ? Row(els, `rvd-${n.id}`, 3, <Text> </Text>, <Text dimColor wrap="wrap">{detail}</Text>) : null}
      {c ? Row(els, `rvc-${n.id}`, 3, <Text> </Text>, <Text color={BLUE} wrap="wrap">твой комментарий: {c}</Text>) : null}
      {d.editing === `c:${n.id}`
        ? Field(els, `cf-${n.id}`, 'Комментарий', 'что не так или что поправить', 'сохранить', v => a.comment(n.id, v), () => a.edit(''))
        : ActionBar(els, `rva-${n.id}`, MarkButtons(els, d, a, n.id, ok, no), 3)}
    </Box>
  )
}

export function ReviewView(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button } = els
  const L = d.ledger
  const t = L.task
  const crit = criteriaOf(L)
  const proven = crit.filter(k => k.status === 'proven').length
  if (!t || (t.phase !== 'review' && t.phase !== 'accepted')) {
    return (
      <Box flexDirection="column">
        {Rule(els, 'r-rev', 'Приёмка')}
        {Para(els, 'rv-wait', 'Работа ещё не сдана. Claude сдаст её сам, когда проверит все критерии.')}
        {crit.length ? Rule(els, 'r-rv-crit', 'Готово, когда', crit.length) : null}
        <Box flexDirection="column" marginTop={SPACE.item}>
          {crit.map(k => Row(els, `rp-${k.id}`, 3, critMark(els, k.status), <Text wrap="wrap">{k.title.ru}</Text>))}
        </Box>
      </Box>
    )
  }
  const sub = t.submitted
  const head = (
    <Box flexDirection="column">
      {Rule(els, 'r-rev', t.phase === 'accepted' ? `Принято · раунд ${t.round}` : `Сдано · раунд ${t.round}`)}
      <Box marginTop={SPACE.item}><Text bold wrap="wrap">{crit.length ? `Доказано ${proven} из ${crit.length} критериев` : 'В задании нет критериев'}</Text></Box>
      {crit.length ? Bar(els, 'rv-bar', proven, crit.length, d.width - 2, d.svg) : null}
      {sub ? Para(els, 'rv-sum', sub.summary.ru) : null}
      {ActionBar(els, 'rv-rep', [<Button key="report-open" label="Открыть отчёт" onPress={() => a.openReport()} />])}
    </Box>
  )
  if (t.phase === 'accepted') {
    return (
      <Box flexDirection="column">
        {head}
        {ActionBar(els, 'acc-a', [<Button key="task-new" label="Новая задача" variant="primary" onPress={() => { a.setView('task'); a.edit('intake') }} />], 0, SPACE.section)}
      </Box>
    )
  }
  const mine = myDecisions(L)
  const assumptions = L.nodes.filter(n => n.kind === 'assumption' && !isClosed(n))
  const risks = L.nodes.filter(n => n.kind === 'risk' && !['lifted', 'done'].includes(n.status) && !gone(n))
  const remarks = ruleCandidates(d.verdict)
  return (
    <Box flexDirection="column">
      {head}
      {Rule(els, 'r-rv-crit', 'Готово, когда', crit.length)}
      {crit.map((k, i) => ReviewItem(els, d, a, k, critMark(els, k.status), evidenceText(k), 'верно', 'не так', i === 0))}
      {mine.length ? Rule(els, 'r-rv-dec', 'Claude решил сам', mine.length) : null}
      {mine.map((n, i) => ReviewItem(els, d, a, n, <Text color={COLOR.decision} bold>◆</Text>,
        [n.rejected?.length ? `отверг: ${n.rejected.map(r => r.ru).join('; ')}` : '', n.accepting ? `цена: ${n.accepting.ru}` : ''].filter(Boolean).join(' · '),
        'согласен', 'отменить', i === 0))}
      {assumptions.length ? Rule(els, 'r-rv-as', 'Допущения', assumptions.length) : null}
      {assumptions.map((n, i) => ReviewItem(els, d, a, n, <Text dimColor>≈</Text>, n.statement?.ru ?? '', 'верно', 'неверно', i === 0))}
      {sub?.notDone.length || risks.length ? Rule(els, 'r-rv-nd', 'Не сделано и риски') : null}
      <Box flexDirection="column" marginTop={SPACE.item}>
        {(sub?.notDone ?? []).map((s, i) => Row(els, `nd-${i}`, 3, <Text color={ORANGE}>–</Text>, <Text wrap="wrap">{s}</Text>))}
        {risks.map(r => Row(els, `rk-${r.id}`, 3, <Text color={RED}>!</Text>, <Text wrap="wrap">{r.title.ru}</Text>))}
      </Box>
      {Rule(els, 'r-rv-rem', 'Твои замечания', remarks.length)}
      {remarks.map((r, i) => (
        <Box key={`rem-${i}`} flexDirection="column" marginTop={SPACE.item}>
          {Row(els, `remr-${i}`, 3, <Text color={BLUE}>›</Text>, <Text wrap="wrap">{r}</Text>)}
          {ActionBar(els, `rema-${i}`, [
            <Button key={`rule-${i}`} plain label={d.verdict.rules.includes(r) ? '✓ станет правилом проекта' : 'сделать правилом'} onPress={() => a.toggleRule(r)} />,
          ], 3)}
        </Box>
      ))}
      {d.editing === 'general'
        ? Field(els, 'general', 'Замечание', 'общее замечание по работе', 'добавить', v => a.addGeneral(v), () => a.edit(''))
        : ActionBar(els, 'rem-a', [<Button key="rem-add" plain label="+ общее замечание" onPress={() => a.edit('general')} />])}
      {Rule(els, 'r-rv-final', 'Вердикт')}
      {Para(els, 'rv-hint', 'Всё выше уйдёт Claude одним сообщением.', true)}
      {ActionBar(els, 'rv-final', [
        <Button key="v-accept" label="Принять" variant="primary" onPress={() => a.sendVerdict('accept')} />,
        <Button key="v-fixes" label="Принять с правками" onPress={() => a.sendVerdict('fixes')} />,
        <Button key="v-return" label="Вернуть" onPress={() => a.sendVerdict('return')} />,
      ])}
    </Box>
  )
}

// ---------- 4. log: why, turns, files, Claude's memory ----------

function chainMark(n: LedgerNode): { mark: string; color: string; label: string } {
  if (n.kind === 'hypothesis' && n.status === 'refuted') return { mark: '✗', color: COLOR.hypothesis, label: 'тупик' }
  if (n.kind === 'hypothesis' && n.status === 'supported') return { mark: '✓', color: GREEN, label: 'подтвердилось' }
  if (n.kind === 'hypothesis') return { mark: '?', color: COLOR.finding, label: 'проверяем' }
  if (n.kind === 'decision') return { mark: '◆', color: COLOR.decision, label: 'решение' }
  if (n.kind === 'finding') return { mark: '★', color: COLOR.finding, label: 'находка' }
  return { mark: '•', color: COLOR[n.kind], label: LABEL[n.kind] }
}

function Why(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button } = els
  const L = d.ledger
  const questions = L.nodes.filter(n => n.kind === 'question' && !gone(n))
  const decisions = L.nodes.filter(n => n.kind === 'decision')
  return (
    <Box flexDirection="column">
      {questions.length ? Rule(els, 'r-chains', 'Что пробовали', questions.length) : null}
      {[...questions].reverse().map((q, qi) => (
        <Box key={`ch-${q.id}`} flexDirection="column" marginTop={qi === 0 ? SPACE.item : SPACE.section}>
          <Text wrap="wrap">{Tag(els, 'вопрос  ', COLOR.question)}<Text bold>{q.title.ru}</Text>{q.status === 'answered' ? <Text dimColor>  · закрыт</Text> : null}</Text>
          {kidsOf(L, q.id).filter(k => !gone(k)).map(k => {
            const m = chainMark(k)
            return (
              <Box key={`chk-${k.id}`} flexDirection="column" paddingLeft={2} marginTop={SPACE.item}>
                {Row(els, `chr-${k.id}`, 2, <Text color={m.color} bold>{m.mark}</Text>, (
                  <Text wrap="wrap" dimColor={k.status === 'refuted'}>
                    <Text color={m.color} bold>{m.label}  </Text>
                    <Text strikethrough={k.status === 'refuted'}>{k.title.ru}</Text>
                  </Text>
                ))}
                {k.statement ? Row(els, `chs-${k.id}`, 2, <Text> </Text>, <Text dimColor wrap="wrap">{k.statement.ru}</Text>) : null}
              </Box>
            )
          })}
          {ActionBar(els, `cha-${q.id}`, [
            <Button key={`chq-${q.id}`} label="Почему так?" onPress={() => a.askAbout(`Объясни цепочку по вопросу «${q.title.ru}»: что пробовали, почему отказались, на чём остановились.`)} />,
          ], 2)}
        </Box>
      ))}
      {Rule(els, 'r-dec', 'Решения', decisions.length)}
      {!decisions.length ? Para(els, 'nodec', 'Решений пока нет.', true) : null}
      {[...decisions].reverse().map((n, di) => {
        const old = n.status === 'superseded'
        const byUser = n.by === 'user'
        return (
          <Box key={`dec-${n.id}`} flexDirection="column" marginTop={di === 0 ? SPACE.item : SPACE.section}>
            <Text wrap="wrap" dimColor={old}>
              {Tag(els, byUser ? 'решил ты  ' : 'решил Claude  ', byUser ? COLOR.decision : BLUE)}
              <Text bold strikethrough={old}>{n.title.ru}</Text>
            </Text>
            {n.rejected?.length ? <Text dimColor wrap="wrap">отвергли: {n.rejected.map(r => r.ru).join('; ')}</Text> : null}
            {n.accepting ? <Text dimColor wrap="wrap">цена: {n.accepting.ru}</Text> : null}
            {ActionBar(els, `deca-${n.id}`, [
              <Button key={`decw-${n.id}`} label="Почему?" onPress={() => a.askAbout(`Почему принято решение «${n.title.ru}»? Какие были варианты и чем они хуже?`)} />,
              !byUser && !old ? <Button key={`decu-${n.id}`} label="Отменить" onPress={() => a.undoDecision(n.id)} /> : null,
              !old ? <Button key={`stale-${n.id}`} plain label="устарело" onPress={() => a.stale(n.id)} /> : null,
            ])}
          </Box>
        )
      })}
      {Rule(els, 'r-add-log', 'Добавить')}
      {AddBar(els, d, a, ['fact', 'ban'])}
    </Box>
  )
}

function Live(els: Els, d: Data) {
  const { Box, Text } = els
  if (!d.live.length) return null
  return (
    <Box flexDirection="column">
      {Rule(els, 'r-live', 'Сейчас в ходе')}
      {d.live.slice(-6).map((ev, i) => Row(els, `live-${i}`, 3,
        <Text color={ev.ok === false ? RED : ev.ok ? GREEN : BLUE}>{ev.ok === null ? '⟳' : ev.ok ? '✓' : '✗'}</Text>,
        <Text wrap="truncate-end" dimColor={ev.ok !== null}>{ev.tool}  <Text dimColor>{ev.target}</Text></Text>))}
    </Box>
  )
}

function Turns(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button } = els
  const L = d.ledger
  const turns = [...L.turns].reverse().slice(0, 12)
  return (
    <Box flexDirection="column">
      {Live(els, d)}
      {Rule(els, 'r-turns', 'Ходы', L.turns.length)}
      {!turns.length ? Para(els, 'noturns', 'Ходов пока нет.', true) : null}
      {turns.map((t, ti) => {
        const made = t.nodes.map(id => L.nodes.find(n => n.id === id)).filter((n): n is LedgerNode => !!n)
        const tools = Object.values(t.tools).reduce((s, v) => s + v, 0)
        const meta = [t.at.slice(11, 16), tools ? `${tools} тул.` : '', t.files.length ? `${t.files.length} файл.` : '', t.errors ? `ошибок ${t.errors}` : ''].filter(Boolean).join(' · ')
        return (
          <Box key={`turn-${t.n}`} flexDirection="column" marginTop={ti === 0 ? SPACE.item : SPACE.section}>
            {Split(els, `th-${t.n}`, <Text bold wrap="truncate-end">Ход {t.n}</Text>, <Text dimColor color={t.errors ? RED : undefined}>{meta}</Text>)}
            <Text wrap="wrap">{t.ask.ru || '—'}</Text>
            {t.did.ru ? <Text dimColor wrap="wrap">→ {t.did.ru}</Text> : t.mapped ? null : <Text dimColor>→ ещё не на карте</Text>}
            {made.length ? (
              <Text wrap="wrap">{made.slice(0, 5).map((n, i) => <Text key={`tm-${t.n}-${i}`} color={COLOR[n.kind]}>{`+ ${LABEL[n.kind]}  `}</Text>)}</Text>
            ) : null}
            {ActionBar(els, `ta-${t.n}`, [
              <Button key={`tq-${t.n}`} plain label="что изменилось?" onPress={() => a.askAbout(`Что изменилось в ходе ${t.n} («${t.ask.ru.slice(0, 80)}») и зачем?`)} />,
            ])}
          </Box>
        )
      })}
    </Box>
  )
}

function Files(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button, Code } = els
  const L = d.ledger
  const files = new Map<string, { label: string; turns: number[] }>()
  for (const t of L.turns) {
    const paths = t.paths ?? t.files
    paths.forEach((p, i) => {
      const f = files.get(p) ?? { label: t.files[i] ?? p, turns: [] }
      f.turns.push(t.n)
      files.set(p, f)
    })
  }
  const lastN = L.turns.at(-1)?.n ?? 0
  const window = Array.from({ length: Math.min(8, lastN) }, (_, i) => lastN - Math.min(8, lastN) + 1 + i)
  const rows = [...files.entries()].sort((x, y) => Math.max(...y[1].turns) - Math.max(...x[1].turns)).slice(0, 15)
  return (
    <Box flexDirection="column">
      {Rule(els, 'r-files', 'Файлы', files.size)}
      {!rows.length ? Para(els, 'nofiles', 'Файлы пока не менялись.', true) : (
        <Box marginTop={SPACE.item}><Text dimColor wrap="truncate-end">клетки — последние ходы {window[0] ?? ''}–{lastN}, ■ — файл менялся</Text></Box>
      )}
      {rows.map(([path, f], fi) => {
        const cells = window.map(n => (f.turns.includes(n) ? '■' : '·')).join('')
        const isOpen = d.diff?.path === path
        return (
          <Box key={`f-${path}`} flexDirection="column" marginTop={fi === 0 ? SPACE.item : SPACE.section}>
            {Split(els, `fh-${path}`, <Text wrap="truncate-start">{f.label}</Text>, <Text color={BLUE}>{cells}</Text>)}
            {ActionBar(els, `fa-${path}`, [
              <Button key={`fo-${path}`} label="Открыть" onPress={() => a.openFile(path)} />,
              <Button key={`fd-${path}`} label={isOpen ? 'Скрыть diff' : 'Diff'} onPress={() => a.showDiff(path)} />,
              <Button key={`fq-${path}`} plain label="зачем менялся?" onPress={() => a.askAbout(`Зачем менялся файл ${f.label} и что в нём сейчас главное?`)} />,
            ])}
            {isOpen && d.diff ? (
              <Box flexDirection="column" marginTop={SPACE.item}>
                {d.diff.note ? <Text dimColor wrap="wrap">{d.diff.note}</Text> : null}
                {d.diff.text ? <Code key={`fdiff-${path}`} source={d.diff.text.slice(0, 9500)} format={d.diff.note.startsWith('новый') ? 'source' : 'diff'} path={path} /> : null}
              </Box>
            ) : null}
          </Box>
        )
      })}
    </Box>
  )
}

/** What Claude gets back after compaction, in Russian, line by line, each with "outdated". */
function Memory(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button } = els
  const L = d.ledger
  const live = (n: LedgerNode) => !gone(n)
  const groups: [string, LedgerNode[]][] = [
    ['Цели', L.nodes.filter(n => n.kind === 'goal' && live(n) && n.status !== 'done')],
    ['Готово, когда', criteriaOf(L)],
    ['Правила', L.nodes.filter(n => n.kind === 'constraint' && live(n) && n.status !== 'lifted')],
    ['Решения', L.nodes.filter(n => n.kind === 'decision' && live(n)).slice(-6)],
    ['Находки', L.nodes.filter(n => n.kind === 'finding' && live(n)).slice(-6)],
    ['Тупики — не повторять', L.nodes.filter(n => n.kind === 'hypothesis' && n.status === 'refuted')],
    ['Открытые вопросы', L.nodes.filter(n => n.kind === 'open' && !isClosed(n)).slice(-5)],
  ]
  return (
    <Box flexDirection="column">
      {Para(els, 'mem-hint', 'Это Claude получит после сжатия контекста, вместе с путём к папке задачи. Неверная строка — жми «устарело»: Claude исправит её.', true)}
      {L.brief ? (
        <Box flexDirection="column">
          {Rule(els, 'r-mem-a', 'Ответ')}
          {Split(els, 'mem-ans', <Text wrap="wrap">{L.brief.answer.ru}</Text>, <Button key="stale-brief" plain label="устарело" onPress={() => a.stale('brief')} />)}
        </Box>
      ) : null}
      {groups.filter(([, list]) => list.length).map(([title, list]) => (
        <Box key={`mem-${title}`} flexDirection="column">
          {Rule(els, `r-mem-${title}`, title, list.length)}
          {list.map((n, i) => (
            <Box key={`mem-${n.id}`} marginTop={i === 0 ? SPACE.item : 0}>
              {Split(els, `memr-${n.id}`,
                <Text wrap="wrap" dimColor={n.status === 'stale'}><Text dimColor>{n.id}  </Text>{n.statement?.ru && n.kind !== 'criterion' ? n.statement.ru : n.title.ru}{n.status === 'stale' ? <Text color={ORANGE}>  · устарело</Text> : null}</Text>,
                n.status === 'stale' ? <Text> </Text> : <Button key={`stale-${n.id}`} plain label="устарело" onPress={() => a.stale(n.id)} />)}
            </Box>
          ))}
        </Box>
      ))}
      {L.task?.dir ? Para(els, 'mem-dir', `Папка задачи: ${L.task.dir}`, true, SPACE.section) : null}
    </Box>
  )
}

export function LogView(els: Els, d: Data, a: Actions) {
  const { Box, Button } = els
  const body = d.view === 'log-turns' ? Turns(els, d, a) : d.view === 'log-files' ? Files(els, d, a) : d.view === 'log-memory' ? Memory(els, d, a) : Why(els, d, a)
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" flexWrap="wrap" columnGap={2} rowGap={SPACE.item} marginTop={SPACE.item}>
        {LOG_TABS.map(x => <Button key={`log-${x.id}`} label={x.label} variant={d.view === x.id ? 'primary' : 'secondary'} onPress={() => a.setView(x.id)} />)}
      </Box>
      {body}
    </Box>
  )
}

// ---------- 5. ask ----------

const QUICK = [
  { label: 'Что сделано за час?', q: 'Что сделано за последний час? Кратко, по пунктам, с файлами.' },
  { label: 'Что ты решил сам?', q: 'Какие решения ты принял сам, без меня? Какие из них стоит проверить?' },
  { label: 'Что может сломаться?', q: 'Что в текущей работе может сломаться или уже сломано? Самое рискованное первым.' },
  { label: 'Объясни схемой', q: 'Объясни, как сейчас устроено то, над чем мы работаем, ASCII-схемой в блоке кода и 3 предложениями.' },
]

export function AskView(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button, Input, Markdown } = els
  return (
    <Box flexDirection="column">
      <Box marginTop={SPACE.item}>
        <Input key="ask-input" label="Вопрос" placeholder="спроси о сессии" submitLabel="спросить" onSubmit={v => a.ask(v)} />
      </Box>
      {Para(els, 'ask-hint', 'Ответ строится поверх всей сессии, но в саму сессию ничего не добавляет.', true)}
      {Rule(els, 'r-quick', 'Быстрые вопросы')}
      {ActionBar(els, 'quick', QUICK.map((x, i) => <Button key={`quick-${i}`} label={x.label} onPress={() => a.ask(x.q)} />))}
      {d.qa.length ? Rule(els, 'r-answers', 'Ответы', d.qa.length) : null}
      {[...d.qa].reverse().slice(0, 6).map((x, i) => (
        <Box key={`qa-${i}`} flexDirection="column" marginTop={i === 0 ? SPACE.item : SPACE.section}>
          <Text bold wrap="wrap">› {x.q}</Text>
          {x.status === 'running' ? <Text dimColor>⟳ думаю…</Text> : <Markdown key={`qa-md-${i}`} text={x.a.slice(0, 9000)} />}
          {x.status === 'done' ? ActionBar(els, `qaa-${i}`, [
            <Button key={`qs-${i}`} plain label="проще" onPress={() => a.ask(`Объясни проще, в 3 коротких предложениях: ${x.q}`)} />,
            <Button key={`qd-${i}`} plain label="схемой" onPress={() => a.ask(`Покажи ASCII-схемой в блоке кода: ${x.q}`)} />,
            <Button key={`qc-${i}`} plain label="проверь меня" onPress={() => a.ask(`Задай мне 3 коротких вопроса, чтобы проверить, понял ли я ответ на: ${x.q}. Ответы не пиши.`)} />,
          ]) : null}
        </Box>
      ))}
    </Box>
  )
}

export function Board(els: Els, d: Data, a: Actions) {
  const { Box } = els
  const body = d.view === 'task' ? TaskView(els, d, a)
    : d.view === 'work' ? WorkView(els, d, a)
      : d.view === 'review' ? ReviewView(els, d, a)
        : d.view === 'ask' ? AskView(els, d, a)
          : LogView(els, d, a)
  return (
    <Box flexDirection="column" paddingRight={1}>
      {Header(els, d, a)}
      {body}
    </Box>
  )
}

// ---------- the band above the prompt: one state, one action ----------

export type BandData = { ledger: Ledger; mapping: boolean; mappingNote: string; cols: number }
export type BandActions = { open: (view: string) => void }

export function Band(els: Pick<Els, 'Box' | 'Text' | 'Button'>, b: BandData, act: BandActions) {
  const { Box, Text, Button } = els
  const L = b.ledger
  const t = L.task
  const phase: Phase = t?.phase ?? 'none'
  const tasks = L.nodes.filter(n => n.kind === 'task' && !gone(n))
  const done = tasks.filter(n => n.status === 'done').length
  const doing = tasks.find(n => n.status === 'doing')
  const waiting = waitingQuestions(L).length
  const crit = criteriaOf(L)
  const proven = crit.filter(k => k.status === 'proven').length
  // the step text is cut by hand: a proportional font makes truncation by cells unreliable on desktop
  const room = Math.max(18, Math.min(64, b.cols - 56))
  const clip = (s: string) => (s.length > room ? `${s.slice(0, room - 1).trimEnd()}…` : s)
  const state = b.mapping ? { mark: '⟳', color: '#9aa0a6', text: `ставлю на карту: ${b.mappingNote}` }
    : phase === 'none' ? { mark: '○', color: '#9aa0a6', text: 'задания нет' }
      : phase === 'intake' ? { mark: '●', color: BLUE, text: `задание готово: ${t!.title.ru}` }
        : phase === 'review' ? { mark: '✓', color: GREEN, text: `работа сдана · доказано ${proven} из ${crit.length}` }
          : phase === 'accepted' ? { mark: '✓', color: GREEN, text: `принято: ${t!.title.ru}` }
            : { mark: '●', color: BLUE, text: doing ? doing.title.ru : L.brief?.answer.ru ?? `ход ${L.turns.length}` }
  const main = waiting ? { key: 'band-main', label: `нужен ты · ${waiting}`, view: 'work' }
    : phase === 'none' ? { key: 'band-main', label: 'Поставить задачу', view: 'task' }
      : phase === 'intake' ? { key: 'band-main', label: 'Проверить и начать', view: 'task' }
        : phase === 'review' ? { key: 'band-main', label: 'Принять работу', view: 'review' }
          : null
  // the band draws its own collapse mark at the right edge: leave it room
  return (
    <Box flexDirection="row" justifyContent="space-between" columnGap={2} paddingRight={4}>
      <Box flexDirection="row" columnGap={1} flexShrink={1} minWidth={0}>
        <Box flexShrink={0}><Text color={state.color}>{state.mark}</Text></Box>
        <Box flexShrink={1} minWidth={0}><Text wrap="truncate-end" bold={!b.mapping} dimColor={b.mapping}>{clip(state.text)}</Text></Box>
      </Box>
      <Box flexDirection="row" columnGap={2} flexShrink={0} alignItems="center">
        {phase === 'work' && tasks.length ? <Text dimColor>{`${done}/${tasks.length} шагов`}</Text> : null}
        {main ? <Button key={main.key} label={main.label} variant="primary" onPress={() => act.open(main.view)} /> : null}
        <Button key="band-open" plain label="доска" onPress={() => act.open('')} />
      </Box>
    </Box>
  )
}
