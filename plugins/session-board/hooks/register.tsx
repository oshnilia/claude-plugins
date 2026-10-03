import { atom, read, update } from 'claude-code'
import type { ElementTable, EngineInterface, Register } from 'claude-code'

import type { BoardStatus, DiffView, Explain, Kind, Ledger, LedgerNode, LiveEvent, QA, TurnCard } from '../types'
import { askPrompt, cartographerPrompt, COMPACT_RULES, parseReply, type TurnDigest } from './cartographer'
import { deterministicOps, FILE_TOOLS, liveEvent, targetOf, toolLabel } from './extract'
import { applyOps, cleanBrief, emptyLedger, parseOp, renderBrief, renderMarkdown, upsertTurn, type Op } from './ledger'

const PANE = 'board'
const EXPLAIN_PANE = 'board-explain'

const ledger = atom({ plugin: 'session-board', key: 'ledger' } as const, emptyLedger(''))
const view = atom({ plugin: 'session-board', key: 'view' } as const, 'gist')
const expanded = atom({ plugin: 'session-board', key: 'expanded' } as const, [] as string[])
const status = atom({ plugin: 'session-board', key: 'status' } as const, { phase: 'idle', note: '', cacheRead: 0, output: 0, ms: 0 } as BoardStatus)
const live = atom({ plugin: 'session-board', key: 'live' } as const, [] as LiveEvent[])
const qa = atom({ plugin: 'session-board', key: 'qa' } as const, [] as QA[])
const answering = atom({ plugin: 'session-board', key: 'answering' } as const, '')
const explain = atom({ plugin: 'session-board', key: 'explain' } as const, null as Explain | null)
const diff = atom({ plugin: 'session-board', key: 'diff' } as const, null as DiffView | null)

type Current = { n: number; ask: string; tools: Record<string, number>; files: Set<string>; paths: Set<string>; errors: string[]; ops: Op[]; touched: string[] }

const cfg = { updateMode: 'every-turn' as 'every-turn' | 'manual', minTools: 2, autoOpen: true, injectAfterCompact: true }
let current: Current | null = null
let busy = false
let pending: TurnDigest | 'bootstrap' | null = null
let dir = ''

async function iso($: EngineInterface) {
  return new Date(await $.clock.now()).toISOString()
}

async function persist($: EngineInterface, L: Ledger, newOps: Op[]) {
  if (!dir) return
  await $.fs.write(`${dir}/ledger.json`, JSON.stringify(L, null, 2))
  await $.fs.write(`${dir}/brief.md`, renderBrief(L))
  await $.fs.write(`${dir}/ledger.md`, renderMarkdown(L, 'en'))
  await $.fs.write(`${dir}/board.ru.md`, renderMarkdown(L, 'ru'))
  if (newOps.length) {
    const prev = (await $.fs.exists(`${dir}/ledger.jsonl`)) ? await $.fs.read(`${dir}/ledger.jsonl`) : ''
    const at = await iso($)
    const lines = newOps.map(o => JSON.stringify({ at, ...o })).join('\n')
    await $.fs.write(`${dir}/ledger.jsonl`, `${prev}${prev && !prev.endsWith('\n') ? '\n' : ''}${lines}\n`)
  }
}

async function commit($: EngineInterface, ops: Op[], turn: number, author: 'claude' | 'user' | 'cartographer') {
  let touched: string[] = []
  const L = await update($, ledger, prev => {
    const r = applyOps(prev, ops, turn, author)
    touched = r.touched
    return r.ledger
  })
  await persist($, L, ops)
  return touched
}

// ---------- cartographer worker (runs on a timer, never inside a hook) ----------

function schedule($: EngineInterface, job: TurnDigest | 'bootstrap') {
  pending = job
  if (!busy) $.clock.after(30, () => void work($))
}

async function work($: EngineInterface) {
  if (busy || !pending) return
  busy = true
  const job = pending
  pending = null
  const started = await $.clock.now()
  const coverNote = job === 'bootstrap' ? 'вся сессия' : (job.covers?.map(c => c.n) ?? [job.n]).join(', ')
  await update($, status, s => ({ ...s, phase: 'mapping' as const, note: coverNote }))
  $.ui.status('доска: обновляю карту…')
  try {
    const L0 = await read($, ledger)
    const lastN = L0.turns.at(-1)?.n ?? 0
    const digest: TurnDigest = job === 'bootstrap'
      ? { n: lastN, ask: '(first map: cover the WHOLE conversation so far, up to 14 ops, and return a brief)', answer: '', tools: {}, files: [], errors: [] }
      : job
    let prompt = cartographerPrompt(L0, digest)
    let reply = await $.model.fork({ prompt })
    let cacheRead = 0
    let output = 0
    let parsed: ReturnType<typeof parseReply> | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!reply.isAnswered) break
      cacheRead += reply.usage.cache_read_input_tokens ?? 0
      output += reply.usage.output_tokens
      parsed = parseReply(reply.text)
      if (!('error' in parsed)) break
      prompt = `${prompt}\n\nYour previous reply failed: ${parsed.error}. Reply with the JSON object only.`
      reply = await $.model.fork({ prompt })
    }
    if (!reply.isAnswered) throw new Error(`fork: ${reply.reason}`)
    if (!parsed || 'error' in parsed) throw new Error(parsed && 'error' in parsed ? parsed.error : 'no reply')
    const touched = await commit($, parsed.ops, digest.n || 1, 'cartographer')
    const brief = parsed.brief
    const ask = parsed.ask
    const did = parsed.did
    const turnNotes = parsed.turns
    const at = await iso($)
    const L = await update($, ledger, prev => {
      let next: Ledger = { ...prev, updated: at, ...(brief ? { brief } : {}) }
      const covered = digest.covers?.map(c => c.n) ?? [digest.n]
      for (const n of covered) {
        const card = next.turns.find(t => t.n === n)
        if (!card) continue
        const note = turnNotes.find(t => t.n === n)
        const isLatest = n === digest.n
        next = upsertTurn(next, {
          ...card,
          ...(note?.ask ? { ask: note.ask } : isLatest && ask ? { ask } : {}),
          ...(note?.did ? { did: note.did } : isLatest && did ? { did } : {}),
          nodes: isLatest ? [...new Set([...card.nodes, ...touched])] : card.nodes,
          mapped: true,
        })
      }
      return next
    })
    await persist($, L, [])
    const ms = (await $.clock.now()) - started
    await update($, status, () => ({ phase: 'idle' as const, note: parsed && parsed.dropped ? `пропущено операций: ${parsed.dropped}` : '', cacheRead, output, ms }))
    $.ui.status(undefined)
  } catch (err) {
    await update($, status, s => ({ ...s, phase: 'error' as const, note: (err as Error).message.slice(0, 120) }))
    $.ui.status(undefined)
  } finally {
    busy = false
    if (pending) $.clock.after(30, () => void work($))
  }
}

async function runAsk($: EngineInterface, q: string) {
  const at = await iso($)
  await update($, qa, list => [...list, { q, a: '', at, status: 'running' as const }].slice(-20))
  const L = await read($, ledger)
  const r = await $.model.fork({ prompt: askPrompt(q, renderBrief(L)) })
  const answer = r.isAnswered ? r.text : `Не получилось ответить: ${r.reason}`
  await update($, qa, list => list.map(x => (x.at === at && x.q === q ? { ...x, a: answer, status: r.isAnswered ? ('done' as const) : ('error' as const) } : x)))
}

async function reportRenderError($: EngineInterface, viewName: string, msg: string) {
  if (!dir) return
  await $.fs.write(`${dir}/render-error.txt`, `${await iso($)} view=${viewName}\n${msg}\n`)
}

async function openPath($: EngineInterface, path: string) {
  const r = await $.process.run(['open', path])
  if (r.exitCode !== 0) $.ui.toast(`Не удалось открыть ${path}`)
}

async function toggleDiff($: EngineInterface, path: string) {
  const cur = await read($, diff)
  if (cur?.path === path) {
    await update($, diff, () => null)
    return
  }
  const cwd = await $.session.cwd()
  const tracked = await $.process.run(['git', '-C', cwd, 'ls-files', '--error-unmatch', path])
  if (tracked.exitCode === 0) {
    const r = await $.process.run(['git', '-C', cwd, 'diff', '--no-color', '--', path])
    const body = r.stdout.split('\n').filter(l => !/^(diff --git|index |--- |\+\+\+ )/.test(l)).join('\n').trim()
    await update($, diff, () => ({ path, text: body, note: body ? '' : 'Изменений относительно последнего коммита нет.' }))
    return
  }
  const text = (await $.fs.exists(path)) ? (await $.fs.read(path)).split('\n').slice(0, 80).join('\n') : ''
  await update($, diff, () => ({ path, text, note: 'новый файл, ещё не в git: первые строки' }))
}

/** One digest for every turn that never reached the map, ending with `latest` when given. */
function catchUpDigest(L: Ledger, latest?: TurnDigest): TurnDigest | null {
  const pending = L.turns.filter(t => !t.mapped && t.n !== latest?.n)
  if (!pending.length) return latest ?? null
  const tools: Record<string, number> = { ...(latest?.tools ?? {}) }
  for (const t of pending) for (const [k, v] of Object.entries(t.tools)) tools[k] = (tools[k] ?? 0) + v
  const files = [...new Set([...pending.flatMap(t => t.files), ...(latest?.files ?? [])])]
  const covers = [...pending.map(t => ({ n: t.n, ask: t.ask.en })), ...(latest ? [{ n: latest.n, ask: latest.ask }] : [])]
  const last = covers[covers.length - 1]!
  return { n: last.n, ask: last.ask, answer: latest?.answer ?? '', tools, files, errors: latest?.errors ?? [], covers }
}

function lastDigest(L: Ledger): TurnDigest {
  const t = L.turns.at(-1)
  return { n: t?.n ?? 1, ask: t?.ask.en ?? '', answer: '', tools: t?.tools ?? {}, files: t?.files ?? [], errors: [] }
}

// ---------- views (kept in this file: the engine gives JSX its h only here) ----------
// Layout rules: docs/mod-design.md. Width comes from e.props.bodyColumns. Rows are a fixed gutter
// (flexShrink 0) plus a growing, wrapping body (flexGrow 1, minWidth 0). Sections start with a dim rule.

type Els = Pick<ElementTable<'desktop'>, 'Box' | 'Text' | 'Button' | 'Markdown' | 'Input' | 'Code'>

type Actions = {
  setView: (v: string) => void
  toggle: (id: string) => void
  refresh: () => void
  startAnswer: (id: string) => void
  submitAnswer: (id: string, text: string) => void
  ask: (q: string) => void
  askAbout: (q: string) => void
  undoDecision: (id: string) => void
  openFile: (path: string) => void
  showDiff: (path: string) => void
  tellClaude: (text: string) => void
}

type SvgCtor = ElementTable<'desktop'>['Svg']

type Data = {
  svg?: SvgCtor
  ledger: Ledger
  view: string
  expanded: string[]
  status: BoardStatus
  live: LiveEvent[]
  qa: QA[]
  answering: string
  diff: DiffView | null
  width: number
}

const VIEWS = [
  { id: 'now', label: 'Сейчас', key: '1' },
  { id: 'why', label: 'Почему', key: '2' },
  { id: 'history', label: 'История', key: '3' },
  { id: 'ask', label: 'Спросить', key: '4' },
] as const

const COLOR: Record<Kind, string> = {
  goal: '#5b8cff', constraint: '#b57bff', question: '#8f7bff', hypothesis: '#8b93a1', task: '#34b27b', action: '#8b93a1',
  finding: '#e0a526', decision: '#ef6b55', open: '#ff9330', assumption: '#8b93a1', risk: '#ff6b6b',
}
const RED = '#ff6b6b'
const ORANGE = '#ff9330'
const GREEN = '#34b27b'
const BLUE = '#5b8cff'

const LABEL: Record<Kind, string> = {
  goal: 'цель', constraint: 'правило', question: 'вопрос', hypothesis: 'гипотеза', task: 'шаг', action: 'действие',
  finding: 'находка', decision: 'решение', open: 'вопрос', assumption: 'допущение', risk: 'риск',
}

const isClosed = (n: LedgerNode) => ['done', 'dropped', 'superseded', 'refuted', 'answered', 'lifted', 'rejected'].includes(n.status)
const kidsOf = (L: Ledger, id: string) => L.nodes.filter(n => n.parent === id)

/** Vertical rhythm, in rows. Desktop needs explicit room: nothing adds it for us. */
const SPACE = { section: 2, item: 1 } as const

/** A section heading. No box-drawing lines: desktop draws text in a proportional font, so lines of
 *  repeated glyphs never fit the width and wrap. */
function Rule(els: Els, key: string, title: string, _width: number, count?: number) {
  const { Box, Text } = els
  return (
    <Box key={key} marginTop={SPACE.section}>
      <Text wrap="truncate-end"><Text bold>{title}</Text>{count !== undefined ? <Text dimColor>{`  ${count}`}</Text> : null}</Text>
    </Box>
  )
}

/** Fixed gutter on the left, growing wrapping body on the right. The mark aligns with the FIRST line of the
 *  body: desktop centers row items vertically by default, which floats a mark between the lines of long text. */
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
    <Box key={key} flexDirection="row" justifyContent="space-between" columnGap={2}>
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

// ---------- header ----------

function Header(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button } = els
  const s = d.status
  const note =
    s.phase === 'mapping' ? `⟳ ставлю на карту: ${s.note.includes(',') ? 'ходы' : s.note === 'вся сессия' ? '' : 'ход'} ${s.note}`
      : s.phase === 'error' ? `⚠ карта не обновилась`
        : s.ms ? `карта обновлена · ход ${d.ledger.turns.at(-1)?.n ?? 0}`
          : d.ledger.turns.length ? `ходов: ${d.ledger.turns.length}` : 'ждёт первого хода'
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        {VIEWS.map(v => (
          <Button key={`view-${v.id}`} plain label={v.label} hotkey={v.key} dimColor={d.view !== v.id} onPress={() => a.setView(v.id)} />
        ))}
      </Box>
      <Box marginTop={SPACE.item}>
        {Split(els, 'status', <Text dimColor wrap="truncate-end">{note}</Text>,
          <Button key="refresh" plain label="↻ обновить" dimColor onPress={() => a.refresh()} />)}
      </Box>
    </Box>
  )
}

// ---------- 1. now: what needs you, the main point, progress ----------

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
  const qs = d.ledger.nodes.filter(n => n.kind === 'open' && !isClosed(n) && (n.ask ?? 'user') === 'user')
  const problems = problemsOf(d, a)
  if (!qs.length && !problems.length) return null
  return (
    <Box flexDirection="column">
      {Rule(els, 'r-needs', 'Нужен ты', d.width, qs.length + problems.length)}
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

function Bar(els: Els, key: string, done: number, total: number, width: number, svg?: SvgCtor) {
  const { Text } = els
  const frac = total ? done / total : 0
  if (svg) {
    // drawn as an image at the pane's width: 1000 x 14 scales to a thin rounded bar
    const fill = Math.round(1000 * frac)
    // 1000 x 40 with the bar in the middle: the empty bands above and below are the bar's own breathing room
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

function Progress(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button } = els
  const L = d.ledger
  const goals = L.nodes.filter(n => n.kind === 'goal' && n.status !== 'dropped')
  if (!goals.length) return null
  return (
    <Box flexDirection="column">
      {Rule(els, 'r-progress', 'Прогресс', d.width)}
      {goals.map((g, gi) => {
        const steps = kidsOf(L, g.id).filter(n => n.kind === 'task')
        const done = steps.filter(s => s.status === 'done').length
        const open = d.expanded.includes(g.id) || steps.some(s => s.status === 'doing')
        return (
          <Box key={`g-${g.id}`} flexDirection="column" marginTop={gi === 0 ? SPACE.item : SPACE.section}>
            {Split(els, `gh-${g.id}`, <Text bold wrap="truncate-end">{g.title.ru}</Text>,
              <Text dimColor>{steps.length ? `${done} из ${steps.length}` : g.status === 'done' ? 'готово' : 'без шагов'}</Text>)}
            {steps.length ? Bar(els, `gb-${g.id}`, done, steps.length, d.width - 2, d.svg) : null}
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
              <Button key={`gq-${g.id}`} plain label="что осталось?" onPress={() => a.askAbout(`Что осталось сделать по цели «${g.title.ru}» и что может помешать?`)} />,
            ])}
          </Box>
        )
      })}
    </Box>
  )
}

function Now(els: Els, d: Data, a: Actions) {
  const { Box, Text } = els
  const L = d.ledger
  const b = L.brief
  const get = (id?: string) => (id ? L.nodes.find(n => n.id === id) : undefined)
  const now = get(b?.now) ?? L.nodes.find(n => n.kind === 'task' && n.status === 'doing')
  const next = get(b?.next) ?? L.nodes.find(n => n.kind === 'task' && n.status === 'todo')
  return (
    <Box flexDirection="column">
      {NeedsYou(els, d, a)}
      {Rule(els, 'r-main', 'Главное', d.width)}
      {b ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold wrap="wrap">{b.answer.ru}</Text>
          <Box marginTop={SPACE.item}><Text dimColor wrap="wrap">Вопрос сессии: {b.question.ru}</Text></Box>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          <Text wrap="wrap">Карты пока нет. Она соберётся после первого хода с работой.</Text>
          <Text dimColor wrap="wrap">Не хочешь ждать — нажми «↻ обновить».</Text>
        </Box>
      )}
      {Progress(els, d, a)}
      {(now || next) && !L.nodes.some(n => n.kind === 'task') ? (
        <Box flexDirection="column">
          {Rule(els, 'r-next', 'Сейчас → дальше', d.width)}
          {now ? Row(els, 'now-row', 3, <Text color={BLUE}>●</Text>, <Text wrap="wrap" bold>{now.title.ru}</Text>) : null}
          {next ? Row(els, 'next-row', 3, <Text dimColor>○</Text>, <Text wrap="wrap" dimColor>дальше: {next.title.ru}</Text>) : null}
        </Box>
      ) : null}
    </Box>
  )
}

// ---------- 2. why: question -> what we tried -> decision; decisions; rules ----------

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
  const questions = L.nodes.filter(n => n.kind === 'question')
  const decisions = L.nodes.filter(n => n.kind === 'decision')
  const rules = L.nodes.filter(n => n.kind === 'constraint' && !isClosed(n))
  return (
    <Box flexDirection="column">
      {questions.length ? Rule(els, 'r-chains', 'Что пробовали', d.width, questions.length) : null}
      {[...questions].reverse().map((q, qi) => {
        const kids = kidsOf(L, q.id)
        return (
          <Box key={`ch-${q.id}`} flexDirection="column" marginTop={qi === 0 ? SPACE.item : SPACE.section}>
            <Text wrap="wrap">{Tag(els, 'вопрос  ', COLOR.question)}<Text bold>{q.title.ru}</Text>{q.status === 'answered' ? <Text dimColor>  · закрыт</Text> : null}</Text>
            {kids.map((k, i) => {
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
        )
      })}
      {Rule(els, 'r-dec', 'Решения', d.width, decisions.length)}
      {!decisions.length ? <Text dimColor>Решений пока нет.</Text> : null}
      {[...decisions].reverse().map((n, di) => {
        const gone = n.status === 'superseded'
        const byUser = n.by === 'user'
        return (
          <Box key={`dec-${n.id}`} flexDirection="column" marginTop={di === 0 ? SPACE.item : SPACE.section}>
            <Text wrap="wrap" dimColor={gone}>
              {Tag(els, byUser ? 'решил ты  ' : n.by === 'claude' ? 'решил Claude  ' : 'решение  ', byUser ? COLOR.decision : BLUE)}
              <Text bold strikethrough={gone}>{n.title.ru}</Text>
            </Text>
            {n.rejected?.length ? <Text dimColor wrap="wrap">отвергли: {n.rejected.map(r => r.ru).join('; ')}</Text> : null}
            {n.accepting ? <Text dimColor wrap="wrap">цена: {n.accepting.ru}</Text> : null}
            {ActionBar(els, `deca-${n.id}`, [
              <Button key={`decw-${n.id}`} label="Почему?" onPress={() => a.askAbout(`Почему принято решение «${n.title.ru}»? Какие были варианты и чем они хуже?`)} />,
              !byUser && !gone ? <Button key={`decu-${n.id}`} label="Отменить" onPress={() => a.undoDecision(n.id)} /> : null,
              <Button key={`decr-${n.id}`} plain label="чем рискуем?" onPress={() => a.askAbout(`Чем рискуем из-за решения «${n.title.ru}»?`)} />,
            ])}
          </Box>
        )
      })}
      {rules.length ? Rule(els, 'r-rules', 'Твои правила', d.width, rules.length) : null}
      {rules.map(c => Row(els, `rule-${c.id}`, 3, <Text color={COLOR.constraint}>⚑</Text>, <Text wrap="wrap">{c.statement?.ru ?? c.title.ru}</Text>))}
    </Box>
  )
}

// ---------- 3. history: turns and files ----------

function Live(els: Els, d: Data) {
  const { Box, Text } = els
  if (!d.live.length) return null
  return (
    <Box flexDirection="column">
      {Rule(els, 'r-live', 'Сейчас в ходе', d.width)}
      {d.live.slice(-6).map((ev, i) => Row(els, `live-${i}`, 3,
        <Text color={ev.ok === false ? RED : ev.ok ? GREEN : BLUE}>{ev.ok === null ? '⟳' : ev.ok ? '✓' : '✗'}</Text>,
        <Text wrap="truncate-end" dimColor={ev.ok !== null}>{ev.tool}  <Text dimColor>{ev.target}</Text></Text>))}
    </Box>
  )
}

function History(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button, Code } = els
  const L = d.ledger
  const turns = [...L.turns].reverse().slice(0, 12)
  // files: path -> turns that touched it
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
  const fileRows = [...files.entries()].sort((x, y) => Math.max(...y[1].turns) - Math.max(...x[1].turns)).slice(0, 15)
  return (
    <Box flexDirection="column">
      {Live(els, d)}
      {Rule(els, 'r-turns', 'Ходы', d.width, L.turns.length)}
      {!turns.length ? <Text dimColor>Ходов пока нет.</Text> : null}
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
      {fileRows.length ? Rule(els, 'r-files', 'Файлы', d.width, files.size) : null}
      {fileRows.length ? <Text dimColor wrap="truncate-end">клетки — последние ходы {window[0] ?? ''}–{lastN}, ■ — файл менялся</Text> : null}
      {fileRows.map(([path, f], fi) => {
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
              <Box flexDirection="column" marginTop={1}>
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

// ---------- 4. ask ----------

const QUICK = [
  { label: 'Что сделано за час?', q: 'Что сделано за последний час? Кратко, по пунктам, с файлами.' },
  { label: 'Что ты решил сам?', q: 'Какие решения ты принял сам, без меня? Какие из них стоит проверить?' },
  { label: 'Что может сломаться?', q: 'Что в текущей работе может сломаться или уже сломано? Самое рискованное первым.' },
  { label: 'Объясни схемой', q: 'Объясни, как сейчас устроено то, над чем мы работаем, ASCII-схемой в блоке кода и 3 предложениями.' },
]

function Ask(els: Els, d: Data, a: Actions) {
  const { Box, Text, Button, Input, Markdown } = els
  return (
    <Box flexDirection="column">
      <Box marginTop={1}>
        <Input key="ask-input" label="Вопрос" placeholder="спроси о сессии" submitLabel="спросить" onSubmit={v => a.ask(v)} />
      </Box>
      <Box marginTop={SPACE.item}><Text dimColor wrap="wrap">Ответ строится поверх всей сессии, но в саму сессию ничего не добавляет.</Text></Box>
      {Rule(els, 'r-quick', 'Быстрые вопросы', d.width)}
      {ActionBar(els, 'quick', QUICK.map((x, i) => <Button key={`quick-${i}`} label={x.label} onPress={() => a.ask(x.q)} />))}
      {d.qa.length ? Rule(els, 'r-answers', 'Ответы', d.width, d.qa.length) : null}
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

export const register: Register = (on, options) => {
  cfg.updateMode = options.update === 'manual' ? 'manual' : 'every-turn'
  cfg.minTools = typeof options.minTools === 'number' ? options.minTools : 2
  cfg.autoOpen = options.autoOpen !== false
  cfg.injectAfterCompact = options.injectAfterCompact !== false
  current = null
  busy = false
  pending = null

  // ---------- session ----------

  on('session.start', async ($, e, next) => {
    const sid = await $.session.id()
    dir = `${e.cwd}/.claude/session-board/${sid}`
    if (await $.fs.exists(`${dir}/ledger.json`)) {
      try {
        const saved = JSON.parse(await $.fs.read(`${dir}/ledger.json`)) as Ledger
        if (saved && saved.v === 1 && Array.isArray(saved.nodes)) await update($, ledger, () => cleanBrief(saved).ledger)
      } catch {
        // a broken file: start a fresh ledger, keep the old file untouched
      }
    } else {
      await update($, ledger, prev => (prev.sid === sid ? prev : emptyLedger(sid)))
    }
    await update($, ledger, prev => ({ ...prev, sid }))
    // a reload drops pending timers: catch up the last turn if it never reached the map
    const L0 = await read($, ledger)
    const lastTurn = L0.turns.at(-1)
    const behind = catchUpDigest(L0)
    if (cfg.updateMode === 'every-turn' && lastTurn && behind) schedule($, behind)

    await $.command.register({ name: 'board', description: 'Open the session board' })
    await $.command.register({ name: 'board-update', description: 'Rebuild the session map now (one model call over the session)' })
    await $.command.register({ name: 'board-ask', description: 'Ask a question about this session without adding to it', argumentHint: '<question>' })

    await $.tool.register({
      name: 'ledger_read',
      description:
        'Read the session ledger: the structured history of THIS session (goals, user constraints, decisions, findings, dead ends, open questions). Call it after compaction, before you repeat an approach, or when the user asks what was decided. With no input it returns the brief; give an id (like D2) for one node with its children, or a section.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'A node id such as G1, D2, F3' },
          section: { type: 'string', enum: ['brief', 'decisions', 'constraints', 'dead-ends', 'open', 'all'] },
        },
      },
    })
    await $.tool.register({
      name: 'note',
      description:
        'Record one item in the session ledger at once: a decision, a finding with evidence, an open question for the user, a constraint the user stated, or a dead end. Use it when something important is decided or proven; the board shows it to the user.',
      inputSchema: {
        type: 'object',
        required: ['kind', 'title'],
        properties: {
          kind: { type: 'string', enum: ['goal', 'constraint', 'question', 'hypothesis', 'task', 'finding', 'decision', 'open', 'assumption', 'risk'] },
          title: { type: 'string', description: '10 words or fewer, plain English' },
          title_ru: { type: 'string', description: 'The same title in plain Russian' },
          statement: { type: 'string', description: 'One sentence, 25 words or fewer' },
          statement_ru: { type: 'string' },
          parent: { type: 'string', description: 'Parent node id, if any' },
          status: { type: 'string', description: 'For example done, refuted, accepted' },
          evidence: { type: 'array', items: { type: 'string' }, description: 'file:line, command, test or URL' },
        },
      },
    })
    await $.tool.register({
      name: 'show',
      description:
        'Show a visual explanation to the user in the session board side pane: a short markdown takeaway and an optional SVG diagram (static or with CSS :hover, SMIL and <title> tooltips; no scripts; max 131072 chars). Use it instead of a long text answer when structure, flow or comparison is easier to see than to read.',
      inputSchema: {
        type: 'object',
        required: ['title', 'markdown'],
        properties: {
          title: { type: 'string' },
          markdown: { type: 'string', description: 'Takeaway in plain style, max 10000 chars' },
          svg: { type: 'string', description: 'A complete <svg ...>...</svg> document' },
        },
      },
    })

    if (cfg.autoOpen && e.isInteractive) void $.ui.open({ id: PANE, title: 'Доска сессии' })
    return next(e)
  })

  on('command.run', { command: 'board' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Доска сессии' })
    return { text: 'Session board opened.' }
  })

  on('command.run', { command: 'board-update' }, async $ => {
    const L = await read($, ledger)
    schedule($, L.nodes.length ? catchUpDigest(L) ?? lastDigest(L) : 'bootstrap')
    await $.ui.open({ id: PANE, title: 'Доска сессии' })
    return { text: 'Session board: map update started.' }
  })

  on('command.run', { command: 'board-ask' }, async ($, e) => {
    const q = (e.args ?? '').trim()
    if (!q) return { text: 'Usage: /board-ask <question>' }
    await update($, view, () => 'ask')
    await $.ui.open({ id: PANE, title: 'Доска сессии' })
    $.clock.after(0, () => void runAsk($, q))
    return { text: 'Session board: the answer appears in the Ask view.' }
  })

  // ---------- turn pipeline ----------

  on('prompt.submit', async ($, e, next) => {
    const L = await read($, ledger)
    current = { n: (L.turns.at(-1)?.n ?? 0) + 1, ask: e.text.trim() || (e.attachments?.length ? '(вложение без текста)' : ''), tools: {}, files: new Set(), paths: new Set(), errors: [], ops: [], touched: [] }
    await update($, live, () => [])
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId || e.tool.startsWith('mcp__session-board__')) return next(e)
    const input = e as unknown as Record<string, unknown>
    const at = await $.clock.now()
    const ev = liveEvent(e.tool, input, at)
    await update($, live, list => [...list, ev].slice(-30))
    const ran = await next(e)
    const isError = ran.deny !== undefined || ran.isError === true
    await update($, live, list => list.map(x => (x.at === at && x.tool === ev.tool ? { ...x, ok: !isError } : x)))
    if (current) {
      const label = toolLabel(e.tool)
      current.tools[label] = (current.tools[label] ?? 0) + 1
      if (FILE_TOOLS.has(e.tool) && !isError) {
        const abs = typeof input.file_path === 'string' ? input.file_path : typeof input.notebook_path === 'string' ? input.notebook_path : ''
        if (abs && !current.paths.has(abs)) {
          current.paths.add(abs)
          current.files.add(targetOf(e.tool, input))
        }
      }
      if (isError) current.errors.push(`${label} ${targetOf(e.tool, input)}`.slice(0, 120))
      const ops = deterministicOps(e.tool, input, ran.result, isError)
      if (ops.length) {
        const touched = await commit($, ops, current.n, 'user')
        current.touched.push(...touched)
      }
    }
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId || !current) return r
    const c = current
    current = null
    const toolCount = Object.values(c.tools).reduce((s, v) => s + v, 0)
    const ask = c.ask.replace(/\s+/g, ' ').slice(0, 240)
    const card: TurnCard = {
      n: c.n,
      at: await iso($),
      ask: { en: ask, ru: ask },
      did: { en: '', ru: '' },
      tools: c.tools,
      files: [...c.files],
      paths: [...c.paths],
      errors: c.errors.length,
      nodes: c.touched,
      mapped: false,
    }
    const L = await update($, ledger, prev => upsertTurn({ ...prev, updated: card.at }, card))
    await persist($, L, [])
    if (cfg.updateMode === 'every-turn' && !e.isAborted && (toolCount >= cfg.minTools || !L.brief)) {
      const latest: TurnDigest = { n: c.n, ask: c.ask, answer: e.answer, tools: c.tools, files: [...c.files], errors: c.errors }
      schedule($, L.nodes.length ? catchUpDigest(L, latest) ?? latest : 'bootstrap')
    }
    return r
  })

  // ---------- compaction: keep the ledger shape, then hand Claude the brief ----------

  on('session.compact', async ($, e, next) => {
    if (e.agentId) return next(e)
    const result = await next({ ...e, instructions: e.instructions ? `${e.instructions}\n\n${COMPACT_RULES}` : COMPACT_RULES })
    if (cfg.injectAfterCompact && !('skip' in result)) {
      const L = await read($, ledger)
      if (L.nodes.length || L.brief) {
        $.clock.after(0, () => {
          void $.session.append({ message: { type: 'user', content: [{ type: 'text', text: renderBrief(L) }] } })
        })
      }
    }
    return result
  })

  // ---------- tools Claude can call ----------

  on('tool.call', { tool: 'mcp__session-board__ledger_read' }, async ($, e) => {
    const input = e as unknown as { id?: string; section?: string }
    const L = await read($, ledger)
    let text: string
    if (input.id) {
      const n = L.nodes.find(x => x.id === input.id)
      text = n ? JSON.stringify({ node: n, children: L.nodes.filter(x => x.parent === n.id).map(x => ({ id: x.id, kind: x.kind, status: x.status, title: x.title.en })) }, null, 1) : `No node ${input.id}.`
    } else if (input.section && input.section !== 'brief') {
      const pick: Record<string, (k: Ledger['nodes'][number]) => boolean> = {
        decisions: n => n.kind === 'decision',
        constraints: n => n.kind === 'constraint',
        'dead-ends': n => n.kind === 'hypothesis' && n.status === 'refuted',
        open: n => n.kind === 'open' && n.status === 'open',
        all: () => true,
      }
      const f = pick[input.section] ?? (() => true)
      text = input.section === 'all' ? renderMarkdown(L, 'en') : JSON.stringify(L.nodes.filter(f), null, 1)
    } else {
      text = renderBrief(L)
    }
    return { result: text, text }
  })

  on('tool.call', { tool: 'mcp__session-board__note' }, async ($, e) => {
    const i = e as unknown as Record<string, unknown>
    const s = (k: string) => (typeof i[k] === 'string' ? (i[k] as string) : undefined)
    const op = parseOp({
      op: 'add', kind: i.kind, parent: s('parent'), status: s('status'),
      title: { en: s('title') ?? '', ru: s('title_ru') ?? s('title') ?? '' },
      ...(s('statement') ? { statement: { en: s('statement'), ru: s('statement_ru') ?? s('statement') } } : {}),
      evidence: Array.isArray(i.evidence) ? i.evidence.map(x => ({ ref: String(x), type: 'tool' })) : [],
    })
    if (!op) return { result: 'Not recorded: kind and title are required.', text: 'Not recorded: kind and title are required.' }
    const turn = current?.n ?? (await read($, ledger)).turns.at(-1)?.n ?? 1
    const [id] = await commit($, [op], turn, 'claude')
    if (current && id) current.touched.push(id)
    return { result: `Recorded ${id}.`, text: `Recorded ${id}.` }
  })

  on('tool.call', { tool: 'mcp__session-board__show' }, async ($, e) => {
    const i = e as unknown as { title?: string; markdown?: string; svg?: string }
    const svg = typeof i.svg === 'string' && i.svg.trim().startsWith('<svg') ? i.svg.slice(0, 131072) : ''
    const at = await iso($)
    await update($, explain, () => ({ title: (i.title ?? 'Объяснение').slice(0, 80), markdown: (i.markdown ?? '').slice(0, 10000), svg, at }))
    await $.ui.open({ id: EXPLAIN_PANE, title: (i.title ?? 'Объяснение').slice(0, 40) })
    return { result: 'Shown in the session board.', text: 'Shown in the session board.' }
  })

  // ---------- drawing ----------

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    if (e.surface !== 'desktop' && e.surface !== 'terminal') {
      const { Markdown } = $.ui.resolve(e)
      return <Markdown text={renderMarkdown(await read($, ledger), 'ru').slice(0, 9000)} />
    }
    const els = $.ui.resolve(e)
    const { Box } = els
    const v = await read($, view)
    const d: Data = {
      ledger: await read($, ledger),
      view: VIEWS.some(x => x.id === v) ? v : 'now',
      expanded: await read($, expanded),
      status: await read($, status),
      // live events redraw the pane on every tool call: read them only where they show
      live: v === 'history' ? await read($, live) : [],
      qa: v === 'ask' ? await read($, qa) : [],
      answering: await read($, answering),
      diff: v === 'history' ? await read($, diff) : null,
      width: Math.max(24, e.props.bodyColumns - 1),
      ...(e.surface === 'desktop' ? { svg: $.ui.resolve(e).Svg } : {}),
    }
    const a: Actions = {
      setView: x => void update($, view, () => x),
      toggle: id => void update($, expanded, list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id])),
      refresh: () => {
        void read($, ledger).then(L => schedule($, L.nodes.length ? catchUpDigest(L) ?? lastDigest(L) : 'bootstrap'))
      },
      startAnswer: id => void update($, answering, () => id),
      submitAnswer: (id, text) => {
        const t = text.trim()
        void update($, answering, () => '')
        if (!t) return
        void read($, ledger).then(L => {
          const n = L.nodes.find(x => x.id === id)
          void $.prompt.submit({ text: `Ответ на твой вопрос${n ? ` «${n.title.ru}»` : ''}: ${t}`, asUser: true })
          void commit($, [{ op: 'update', id, status: 'answered' }], current?.n ?? L.turns.at(-1)?.n ?? 1, 'user')
        })
      },
      ask: q => {
        const t = q.trim()
        if (t) $.clock.after(0, () => void runAsk($, t))
      },
      askAbout: q => {
        void update($, view, () => 'ask')
        $.clock.after(0, () => void runAsk($, q))
      },
      undoDecision: id => {
        void read($, ledger).then(L => {
          const n = L.nodes.find(x => x.id === id)
          if (!n) return
          const alt = n.rejected?.length ? ` Альтернативы были: ${n.rejected.map(r => r.ru).join('; ')}.` : ''
          void $.prompt.submit({ text: `Отмени своё решение «${n.title.ru}» (${id}). Предложи, что сделать вместо него, и спроси меня перед изменениями.${alt}`, asUser: true })
        })
      },
      openFile: path => {
        $.clock.after(0, () => void openPath($, path))
      },
      showDiff: path => {
        $.clock.after(0, () => void toggleDiff($, path))
      },
      tellClaude: text => void $.prompt.submit({ text, asUser: true }),
    }
    try {
      const body = d.view === 'why' ? Why(els, d, a) : d.view === 'history' ? History(els, d, a) : d.view === 'ask' ? Ask(els, d, a) : Now(els, d, a)
      return (
        <Box flexDirection="column" paddingRight={1}>
          {Header(els, d, a)}
          {body}
        </Box>
      )
    } catch (err) {
      const msg = `${(err as Error).name}: ${(err as Error).message}\n${((err as Error).stack ?? '').split('\n').slice(0, 6).join('\n')}`
      $.clock.after(0, () => void reportRenderError($, d.view, msg))
      const { Text } = els
      return <Text color="#ff6b6b" wrap="wrap">Доска не смогла нарисовать вид «{d.view}»: {msg}</Text>
    }
  })

  on('ui.render', { component: 'Pane', requestId: EXPLAIN_PANE }, async ($, e) => {
    const x = await read($, explain)
    if (e.surface === 'desktop') {
      const { Box, Text, Markdown, Svg } = $.ui.resolve(e)
      if (!x) return <Text dimColor>Здесь появятся схемы, которые Claude покажет через тул show.</Text>
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>{x.title}</Text>
          {x.svg ? <Svg source={x.svg} alt={x.title} isInteractive /> : null}
          {x.markdown ? <Markdown text={x.markdown} /> : null}
        </Box>
      )
    }
    const { Box, Text, Markdown } = $.ui.resolve(e)
    if (!x) return <Text dimColor>No explanation yet.</Text>
    return (
      <Box flexDirection="column">
        <Text bold>{x.title}</Text>
        {x.markdown ? <Markdown text={x.markdown} /> : null}
        {x.svg ? <Text dimColor>(the diagram shows on the desktop app)</Text> : null}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const L = await read($, ledger)
    if (!L.brief && !L.turns.length && !L.nodes.length) return next(e)
    const st = await read($, status)
    const { Box, Text, Button } = $.ui.resolve(e)
    const tasks = L.nodes.filter(n => n.kind === 'task')
    const done = tasks.filter(n => n.status === 'done').length
    const doing = tasks.find(n => n.status === 'doing')
    const waiting = L.nodes.filter(n => n.kind === 'open' && n.status === 'open' && (n.ask ?? 'user') === 'user').length
    const decisions = L.nodes.filter(n => n.kind === 'decision' && n.status !== 'superseded').length
    const cols = e.props.bodyColumns
    // the step text is cut by hand: a proportional font makes truncation by cells unreliable on desktop
    const room = Math.max(18, Math.min(64, cols - (waiting ? 70 : 52)))
    const clip = (t: string) => (t.length > room ? `${t.slice(0, room - 1).trimEnd()}…` : t)
    const step = st.phase === 'mapping' ? `ставлю на карту: ${st.note}` : doing ? doing.title.ru : L.brief?.answer.ru ?? `ход ${L.turns.length}`
    const openBoard = (v?: string) => {
      void $.ui.open({ id: PANE, title: 'Доска сессии' })
      if (v) void update($, view, () => v)
    }
    // the band draws its own collapse mark at the right edge: leave it room
    return (
      <Box flexDirection="row" justifyContent="space-between" columnGap={2} paddingRight={4}>
        <Box flexDirection="row" columnGap={1} flexShrink={1} minWidth={0}>
          <Box flexShrink={0}><Text color={st.phase === 'mapping' ? '#9aa0a6' : '#5b8cff'}>{st.phase === 'mapping' ? '⟳' : '●'}</Text></Box>
          <Box flexShrink={1} minWidth={0}><Text wrap="truncate-end" bold={st.phase !== 'mapping'} dimColor={st.phase === 'mapping'}>{clip(step)}</Text></Box>
        </Box>
        <Box flexDirection="row" columnGap={2} flexShrink={0} alignItems="center">
          {tasks.length ? <Text dimColor>{`${done}/${tasks.length} шагов`}</Text> : null}
          {cols >= 96 ? <Text dimColor>{`ход ${L.turns.length}`}</Text> : null}
          {cols >= 110 && decisions ? <Text dimColor>{`решений ${decisions}`}</Text> : null}
          {waiting ? <Button key="band-wait" label={`нужен ты · ${waiting}`} variant="primary" onPress={() => openBoard('now')} /> : null}
          <Button key="band-ask" plain label="спросить" onPress={() => openBoard('ask')} />
          <Button key="band-open" plain label="доска" onPress={() => openBoard()} />
        </Box>
      </Box>
    )
  })
}
