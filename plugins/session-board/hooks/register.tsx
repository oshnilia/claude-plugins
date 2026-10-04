import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Authority, BoardStatus, DiffView, Explain, LeanLevel, Ledger, LedgerNode, LiveEvent, OpenTask, QA, SentAction, Submission, TaskSpec, TurnCard } from '../types'
import { askPrompt, cartographerPrompt, compactRules, parseReply, type TurnDigest } from './cartographer'
import { deterministicOps, FILE_TOOLS, liveEvent, targetOf, toolLabel } from './extract'
import { applyOps, cleanBrief, emptyLedger, parseOp, renderBrief, renderMarkdown, txt, upsertTurn, type Op } from './ledger'
import { renderReport, type ReportDiff } from './report'
import {
  AUTHORITY, briefOps, criteriaOf, emptyVerdict, freeMessage, ideasOf, isAuthority, parseTaskInput, protocol, renderSummary, renderTaskMd, ruleCandidates,
  slugify, startMessage, VERDICT_LABEL, verdictLine, verdictMessage, WRAP_ASK, type VerdictKind,
} from './task'
import { LADDER_MIN_WORDS, proseWords, RUNGS } from './ladder'
import { DEBT_GREP, LEAN_LEVEL, leanLineLevel, parseDebt } from './lean'
import { boardText, parseChatCommand } from './remote'
import { Band, Board, resolveView, waitingQuestions, type Actions, type AddKind, type Data } from './views'

const PANE = 'board'
const EXPLAIN_PANE = 'board-explain'
const TITLE = 'Доска сессии'

const ledger = atom({ plugin: 'session-board', key: 'ledger' } as const, emptyLedger(''))
// '' follows the phase: the board opens on the screen the task needs now
const view = atom({ plugin: 'session-board', key: 'view' } as const, '')
const expanded = atom({ plugin: 'session-board', key: 'expanded' } as const, [] as string[])
const status = atom({ plugin: 'session-board', key: 'status' } as const, { phase: 'idle', note: '', cacheRead: 0, output: 0, ms: 0 } as BoardStatus)
const live = atom({ plugin: 'session-board', key: 'live' } as const, [] as LiveEvent[])
const qa = atom({ plugin: 'session-board', key: 'qa' } as const, [] as QA[])
const answering = atom({ plugin: 'session-board', key: 'answering' } as const, '')
const explain = atom({ plugin: 'session-board', key: 'explain' } as const, null as Explain | null)
const diff = atom({ plugin: 'session-board', key: 'diff' } as const, null as DiffView | null)
const verdict = atom({ plugin: 'session-board', key: 'verdict' } as const, emptyVerdict())
const notes = atom({ plugin: 'session-board', key: 'notes' } as const, [] as string[])
const editing = atom({ plugin: 'session-board', key: 'editing' } as const, '')
const greeted = atom({ plugin: 'session-board', key: 'greeted' } as const, '')
const openTasks = atom({ plugin: 'session-board', key: 'openTasks' } as const, [] as OpenTask[])
const policy = atom({ plugin: 'session-board', key: 'policy' } as const, 'normal' as Authority)
const sent = atom({ plugin: 'session-board', key: 'sent' } as const, [] as SentAction[])
// the project folder, fixed once per session: the shell's cwd moves with every cd
const home = atom({ plugin: 'session-board', key: 'home' } as const, { sid: '', dir: '' })
// the format ladder shows under the last answer when it was long; any new message takes it down
const ladder = atom({ plugin: 'session-board', key: 'ladder' } as const, false)
// the lean plugin, seen in the line its hook prints at session start; and the project's `lean:` shortcuts
const lean = atom({ plugin: 'session-board', key: 'lean' } as const, null as { level: LeanLevel } | null)
const debt = atom({ plugin: 'session-board', key: 'debt' } as const, null as { markers: number; files: number } | null)

type Current = { n: number; ask: string; tools: Record<string, number>; files: Set<string>; paths: Set<string>; errors: string[]; ops: Op[]; touched: string[] }

const cfg = { updateMode: 'every-turn' as 'every-turn' | 'manual', minTools: 2, autoOpen: true, injectAfterCompact: true, push: true }
let current: Current | null = null
let busy = false
let pending: TurnDigest | 'bootstrap' | null = null
// the project folder and this session: set by session.start (never in tests, so tests write no files)
let root = ''
let sessionId = ''
let projectRules = ''
let pointerFor = ''
// looking for lean's line in the conversation: at session start and with the first message, never on every prompt
let leanLooks = 0

// prompts the person sent: the composer, the phone bridge, the desktop app (an SDK host); never a plugin or a peer
const USER_ORIGINS = new Set<string | undefined>(['composer', 'bridge', 'sdk', 'unclassified'])
const GITIGNORE = '# session-board task folders stay out of git.\n# To keep a report: git add -f .claude/tasks/<task>/report.html\n*\n!.gitignore\n'

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const strs = (x: unknown, max = 12): string[] =>
  Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string' && !!s.trim()).map(s => s.trim().slice(0, 400)).slice(0, max) : []
const gone = (n: LedgerNode) => n.status === 'superseded' || n.status === 'dropped'
const reply = (text: string) => ({ result: text, text })
const tasksRoot = () => (root ? `${root}/.claude/tasks` : '')

/**
 * True when git tracks the path: then it came with the repository, not from the person at this machine.
 * Board policy, rules and task folders from a repository are never trusted: a cloned project could raise
 * Claude's authority or plant "rules" that way. Without git nothing can be tracked.
 */
async function isTracked($: EngineInterface, path: string): Promise<boolean> {
  if (!root) return false
  try {
    const r = await $.process.run(['git', '-C', root, 'ls-files', '--', path])
    return r.exitCode === 0 && r.stdout.trim().length > 0
  } catch {
    return false
  }
}

const insideTasks = (dir: string) => !!tasksRoot() && dir.startsWith(`${tasksRoot()}/`) && !dir.includes('/../')

async function iso($: EngineInterface) {
  try {
    return new Date(await $.clock.now()).toISOString()
  } catch {
    // the test kit has no clock
    return new Date(0).toISOString()
  }
}

/** The session's project folder: the one fixed at its first start, else the git top level, else the cwd. */
async function projectRoot($: EngineInterface, cwd: string): Promise<string> {
  const saved = await read($, home)
  if (saved.sid === sessionId && saved.dir) return saved.dir
  const top = await $.process.run(['git', '-C', cwd, 'rev-parse', '--show-toplevel'])
  const dir = top.exitCode === 0 && top.stdout.trim() ? top.stdout.trim() : cwd
  await update($, home, () => ({ sid: sessionId, dir }))
  return dir
}

async function ensureTasksRoot($: EngineInterface): Promise<string> {
  const base = tasksRoot()
  if (base && !(await $.fs.exists(`${base}/.gitignore`))) await $.fs.write(`${base}/.gitignore`, GITIGNORE)
  return base
}

async function newTaskDir($: EngineInterface, titleEn: string): Promise<string> {
  const base = await ensureTasksRoot($)
  if (!base) return ''
  const day = (await iso($)).slice(0, 10)
  const slug = slugify(titleEn) || sessionId.slice(0, 8) || 'task'
  let dir = `${base}/${day}-${slug}`
  for (let i = 2; await $.fs.exists(dir); i++) dir = `${base}/${day}-${slug}-${i}`
  return dir
}

/** The task folder is the source of truth: every change of the ledger lands there. */
async function persist($: EngineInterface, L: Ledger, newOps: Op[]) {
  const dir = L.task?.dir
  if (!dir) return
  await $.fs.write(`${dir}/ledger.json`, JSON.stringify(L, null, 2))
  await $.fs.write(`${dir}/brief.md`, renderBrief(L))
  await $.fs.write(`${dir}/ledger.md`, renderMarkdown(L, 'en'))
  await $.fs.write(`${dir}/board.ru.md`, renderMarkdown(L, 'ru'))
  await $.fs.write(`${dir}/task.md`, renderTaskMd(L))
  if (newOps.length) {
    const prev = (await $.fs.exists(`${dir}/ledger.jsonl`)) ? await $.fs.read(`${dir}/ledger.jsonl`) : ''
    const at = await iso($)
    const lines = newOps.map(o => JSON.stringify({ at, ...o })).join('\n')
    await $.fs.write(`${dir}/ledger.jsonl`, `${prev}${prev && !prev.endsWith('\n') ? '\n' : ''}${lines}\n`)
  }
  // a pointer from this session to its task, so a resumed session finds the folder again
  if (root && sessionId && pointerFor !== dir) {
    await $.fs.write(`${root}/.claude/session-board/${sessionId}/task.json`, JSON.stringify({ dir }, null, 2))
    pointerFor = dir
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

/** Change the task; a new phase sends the board to that phase's screen. */
async function setTask($: EngineInterface, fn: (t: TaskSpec) => TaskSpec): Promise<Ledger> {
  let moved = false
  const L = await update($, ledger, prev => {
    if (!prev.task) return prev
    const t = fn(prev.task)
    moved = t.phase !== prev.task.phase
    return { ...prev, task: t }
  })
  await persist($, L, [])
  if (moved) await update($, view, () => '')
  return L
}

/** Work that started without an intake still gets a task folder once it has a goal. */
async function ensureTask($: EngineInterface) {
  const L0 = await read($, ledger)
  if (L0.task || !root) return
  const goal = L0.nodes.find(n => n.kind === 'goal' && !gone(n))
  if (!goal) return
  const dir = await newTaskDir($, goal.title.en)
  if (!dir) return
  const t: TaskSpec = {
    title: goal.title, goal: goal.statement ?? goal.title, result: { en: '', ru: '' }, outOfScope: [], materials: [],
    authority: await read($, policy), dir, created: await iso($), phase: 'work', round: 1, formal: false,
  }
  const L = await update($, ledger, prev => (prev.task ? prev : { ...prev, task: t }))
  await persist($, L, [])
  await refreshOpenTasks($)
}

async function refreshOpenTasks($: EngineInterface) {
  const base = tasksRoot()
  if (!base || !(await $.fs.exists(base))) return
  const cur = (await read($, ledger)).task?.dir
  const out: OpenTask[] = []
  const dirs = (await $.fs.list(base)).filter(x => x.kind === 'dir').map(x => x.name).sort().reverse().slice(0, 30)
  for (const name of dirs) {
    const dir = `${base}/${name}`
    if (dir === cur || !(await $.fs.exists(`${dir}/ledger.json`)) || (await isTracked($, dir))) continue
    try {
      const saved = JSON.parse(await $.fs.read(`${dir}/ledger.json`)) as Ledger
      if (saved.task && saved.task.phase !== 'accepted') out.push({ dir, title: saved.task.title.ru, phase: saved.task.phase, updated: saved.updated, free: saved.task.mode === 'free' })
    } catch {
      // a broken ledger file: skip it
    }
  }
  await update($, openTasks, () => out.slice(0, 8))
}

/** Open the board pane; a surface without panes (or the test kit) just keeps the state. */
/** Open the board. When the person asked for it, a pane that cannot be placed says why instead of doing nothing. */
function openBoard($: EngineInterface, asked = false) {
  $.ui.open({ id: PANE, title: TITLE })
    .then(r => {
      if (asked && !r.isPlaced) $.ui.toast(`Доска ждёт места: ${r.reason}`)
    })
    .catch((err: unknown) => {
      if (asked) $.ui.toast(`Доска не открылась: ${String((err as Error)?.message ?? err).slice(0, 90)}`)
    })
}

/** A message from the board into the session, as the person's own. */
function say($: EngineInterface, text: string) {
  $.prompt.submit({ text, asUser: true }).catch(() => $.ui.toast('Не удалось отправить сообщение в сессию'))
}

/** A push to the phone (Remote Control) or a desktop notification. The tool skips it when the person is at the
 * screen; with no phone or the tool off, the board still shows the same thing. */
async function push($: EngineInterface, text: string) {
  if (!cfg.push) return
  try {
    await $.tool.call({ tool: 'PushNotification', message: text.slice(0, 190), status: 'proactive' } as never)
  } catch {
    // no such tool, or it was refused: nothing to do
  }
}

/**
 * Send once: a second press of the same action waits until Claude has answered the first. The board's own prompt
 * never reaches the board's prompt.submit hook (the engine skips the caller), so it counts as started at once and the
 * end of the next turn clears it.
 */
async function sendOnce($: EngineInterface, key: string, text: string) {
  // lean: a press during a running turn clears when that turn ends, before Claude answers it; keep the turn id if double sends show up
  if ((await read($, sent)).some(x => x.key === key)) return
  await update($, sent, list => [...list, { key, text, started: true }])
  say($, text)
}

async function addNote($: EngineInterface, text: string) {
  await update($, notes, list => [...list, text].slice(-20))
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
    let r = await $.model.fork({ prompt })
    let cacheRead = 0
    let output = 0
    let parsed: ReturnType<typeof parseReply> | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!r.isAnswered) break
      cacheRead += r.usage.cache_read_input_tokens ?? 0
      output += r.usage.output_tokens
      parsed = parseReply(r.text)
      if (!('error' in parsed)) break
      prompt = `${prompt}\n\nYour previous reply failed: ${parsed.error}. Reply with the JSON object only.`
      r = await $.model.fork({ prompt })
    }
    if (!r.isAnswered) throw new Error(`fork: ${r.reason}`)
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
      return cleanBrief(next).ledger
    })
    await persist($, L, [])
    await ensureTask($)
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
  const dir = (await read($, ledger)).task?.dir || (root && sessionId ? `${root}/.claude/session-board/${sessionId}` : '')
  if (dir) await $.fs.write(`${dir}/render-error.txt`, `${await iso($)} view=${viewName}\n${msg}\n`)
}

async function openPath($: EngineInterface, path: string) {
  const r = await $.process.run(['open', path])
  if (r.exitCode !== 0) $.ui.toast(`Не удалось открыть ${path}`)
}

// files that macOS would run or follow instead of showing: reveal them in Finder
const RUNS = /\.(app|command|tool|terminal|sh|zsh|bash|scpt|applescript|workflow|action|pkg|mpkg|dmg|jar|webloc|inetloc|fileloc|url|desktop)$/i

/** "Открыть" on a file from the ledger: only files of this project, and never by running them. */
async function openFile($: EngineInterface, path: string) {
  if (!root || !path.startsWith(`${root}/`) || path.includes('/../') || !(await $.fs.exists(path))) {
    $.ui.toast('Доска открывает только файлы этого проекта')
    return
  }
  const r = await $.process.run(RUNS.test(path) ? ['open', '-R', path] : ['open', path])
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
  const behind = L.turns.filter(t => !t.mapped && t.n !== latest?.n)
  if (!behind.length) return latest ?? null
  const tools: Record<string, number> = { ...(latest?.tools ?? {}) }
  for (const t of behind) for (const [k, v] of Object.entries(t.tools)) tools[k] = (tools[k] ?? 0) + v
  const files = [...new Set([...behind.flatMap(t => t.files), ...(latest?.files ?? [])])]
  const covers = [...behind.map(t => ({ n: t.n, ask: t.ask.en })), ...(latest ? [{ n: latest.n, ask: latest.ask }] : [])]
  const last = covers[covers.length - 1]!
  return { n: last.n, ask: last.ask, answer: latest?.answer ?? '', tools, files, errors: latest?.errors ?? [], covers }
}

function lastDigest(L: Ledger): TurnDigest {
  const t = L.turns.at(-1)
  return { n: t?.n ?? 1, ask: t?.ask.en ?? '', answer: '', tools: t?.tools ?? {}, files: t?.files ?? [], errors: [] }
}

// ---------- the report ----------

async function collectDiff($: EngineInterface, L: Ledger): Promise<ReportDiff> {
  const out: ReportDiff = { stat: '', files: [] }
  if (!root) return out
  const git = (args: string[]) => $.process.run(['git', '-C', root, ...args])
  const paths = [...new Set(L.turns.flatMap(t => t.paths ?? []))].filter(p => !p.includes('/.claude/tasks/'))
  const inside = paths.filter(p => p.startsWith(`${root}/`))
  const outside = paths.filter(p => !p.startsWith(`${root}/`))
  const rel = (p: string) => (p.startsWith(`${root}/`) ? p.slice(root.length + 1) : p.replace(/^\/Users\/[^/]+\//, '~/'))
  if (inside.length && (await git(['rev-parse', '--is-inside-work-tree'])).exitCode === 0) {
    const ref = L.task?.base ?? 'HEAD'
    out.stat = (await git(['diff', '--stat', '--no-color', ref, '--', ...inside])).stdout.trim().slice(0, 4000)
    let budget = 300_000
    for (const p of inside.slice(0, 40)) {
      if (budget <= 0) break
      if ((await git(['ls-files', '--error-unmatch', p])).exitCode === 0) {
        const r = await git(['diff', '--no-color', ref, '--', p])
        const patch = r.stdout.split('\n').filter(l => !/^(diff --git|index |--- |\+\+\+ )/.test(l)).join('\n').trim()
        if (patch) {
          out.files.push({ path: rel(p), patch: patch.slice(0, Math.min(60_000, budget)), isNew: false })
          budget -= patch.length
        }
      } else if (await $.fs.exists(p)) {
        const text = (await $.fs.read(p)).split('\n').slice(0, 200).map(l => `+${l}`).join('\n')
        out.files.push({ path: rel(p), patch: text, isNew: true })
        budget -= text.length
      }
    }
  }
  for (const p of outside.slice(0, 20)) out.files.push({ path: rel(p), patch: '(файл вне репозитория: diff нет)', isNew: false })
  return out
}

async function buildReport($: EngineInterface): Promise<string> {
  const L = await read($, ledger)
  const dir = L.task?.dir
  if (!dir) return ''
  const html = renderReport(L, await collectDiff($, L), await iso($))
  await $.fs.write(`${dir}/report.html`, html)
  return `${dir}/report.html`
}

async function openReport($: EngineInterface) {
  const dir = (await read($, ledger)).task?.dir
  if (!dir) {
    $.ui.toast('У задачи ещё нет папки: отчёт не собрать')
    return
  }
  // always rebuild: an old file would show an old layout and a stale ledger
  const path = await buildReport($)
  if (path) await openPath($, path)
}

// ---------- what the person does on the board ----------

async function startTask($: EngineInterface, send = true): Promise<string> {
  const t0 = (await read($, ledger)).task
  if (!t0) return ''
  let base: string | undefined
  if (root) {
    const r = await $.process.run(['git', '-C', root, 'rev-parse', 'HEAD'])
    if (r.exitCode === 0) base = r.stdout.trim()
  }
  const at = await iso($)
  const L = await setTask($, t => ({ ...t, phase: 'work', started: t.started ?? at, ...(base && !t.base ? { base } : {}) }))
  await update($, editing, () => '')
  if (!L.task) return ''
  const msg = startMessage(L.task)
  if (send) await sendOnce($, 'start', msg)
  return msg
}

/**
 * «Свободный режим»: the session goes on without a brief, criteria or acceptance. A running strict task pauses: it
 * stays in its folder and waits under «Начатые задачи». Work that grew without a brief carries on as the free session.
 */
async function freeMode($: EngineInterface, send = true): Promise<string> {
  const L0 = await read($, ledger)
  const t0 = L0.task
  if (t0?.mode === 'free' && t0.phase !== 'accepted') return ''
  const fresh = !!t0?.formal
  const paused = t0?.formal && t0.phase !== 'accepted' && t0.mode !== 'free' ? t0 : null
  const at = await iso($)
  const title = { en: 'Free session', ru: 'Свободная сессия' }
  const t: TaskSpec = {
    title, goal: { en: '', ru: '' }, result: { en: '', ru: '' }, outOfScope: [], materials: [],
    authority: !fresh && t0 ? t0.authority : await read($, policy),
    dir: !fresh && t0?.dir ? t0.dir : await newTaskDir($, title.en),
    created: at, started: at, phase: 'work', round: 1, formal: true, mode: 'free',
  }
  const L = await update($, ledger, prev => ({ ...(fresh ? emptyLedger(prev.sid) : prev), task: t, updated: at }))
  await persist($, L, [])
  await update($, view, () => '')
  await update($, verdict, () => emptyVerdict())
  await update($, editing, () => '')
  // the next prompt carries the free-mode protocol
  await update($, greeted, () => '')
  await refreshOpenTasks($)
  const msg = freeMessage(t, paused)
  if (send) await sendOnce($, 'free', msg)
  return msg
}

async function setAuthority($: EngineInterface, level: Authority) {
  const t = (await read($, ledger)).task
  if (!t || t.phase === 'accepted') {
    await update($, policy, () => level)
    const base = await ensureTasksRoot($)
    if (base) await $.fs.write(`${base}/policy.json`, JSON.stringify({ authority: level }, null, 2))
    return
  }
  if (t.authority === level) return
  await setTask($, x => ({ ...x, authority: level }))
  const a = AUTHORITY[level]
  if (t.phase === 'work' || t.phase === 'review') await addNote($, `Полномочия теперь «${a.label}»: сам — ${a.alone.ru}; только со мной — ${a.withYou.ru}.`)
}

/** The lean level of the task. During the work the change reaches Claude with the next message. */
async function setCode($: EngineInterface, level: LeanLevel) {
  const t = (await read($, ledger)).task
  if (!t || t.phase === 'accepted' || t.code === level) return
  await setTask($, x => ({ ...x, code: level }))
  if (t.phase === 'work' || t.phase === 'review') await addNote($, `Код теперь lean ${level}: ${LEAN_LEVEL[level].ru}.`)
}

/**
 * A resumed session gets no new line from lean's hook: look for it in the conversation so far. Runs at session start
 * and with the person's first message, while the board has not seen lean yet.
 */
async function findLean($: EngineInterface) {
  if (leanLooks >= 2 || (await read($, lean))) return
  leanLooks++
  const msgs = await $.session.messages({ as: 'api' })
  if (!Array.isArray(msgs)) return
  for (const m of msgs) {
    if (m.role !== 'user') continue
    const level = leanLineLevel(m.content.map(b => (b.type === 'text' && typeof b.text === 'string' ? b.text : '')).join('\n'))
    if (level) {
      await update($, lean, () => ({ level }))
      await countDebt($)
      return
    }
  }
}

/** Count the project's `lean:` shortcut comments with git grep (read only). Nothing without lean. */
async function countDebt($: EngineInterface) {
  if (!(await read($, lean))) return
  const dir = root || (await $.session.cwd())
  const r = await $.process.run(['git', '-C', dir, ...DEBT_GREP])
  // 0: found, 1: none; anything else: not a git work tree, so no count
  await update($, debt, () => (r.exitCode === 0 || r.exitCode === 1 ? parseDebt(r.stdout) : null))
}

const ADD_NOTE: Record<AddKind, string> = { rule: 'Новое правило', ban: 'Новый запрет', fact: 'Факт от меня', criterion: 'Новый критерий готовности' }

async function addItem($: EngineInterface, kind: AddKind, text: string) {
  const s = text.trim()
  await update($, editing, () => '')
  if (!s) return
  const L = await read($, ledger)
  const goal = L.nodes.find(n => n.kind === 'goal' && !gone(n))
  const t = { en: s, ru: s }
  const board = [{ ref: 'board', type: 'user' as const }]
  const op: Op = kind === 'rule' ? { op: 'add', kind: 'constraint', title: t, statement: t, evidence: board }
    : kind === 'ban' ? { op: 'add', kind: 'constraint', title: { en: `Never: ${s}`, ru: `Нельзя: ${s}` }, statement: { en: `Never: ${s}`, ru: `Нельзя: ${s}` }, evidence: board }
      : kind === 'fact' ? { op: 'add', kind: 'finding', title: t, statement: t, evidence: [{ ref: 'the person said so', type: 'user' }], likelihood: 'almost-certain', confidence: 'high' }
        : { op: 'add', kind: 'criterion', ...(goal ? { parent: goal.id } : {}), title: t, status: 'todo', evidence: board }
  const [id] = await commit($, [op], current?.n ?? L.turns.at(-1)?.n ?? 1, 'user')
  await addNote($, `${ADD_NOTE[kind]} (${id}): ${s}`)
}

async function markStale($: EngineInterface, id: string) {
  const L = await read($, ledger)
  if (id === 'brief') {
    await addNote($, `На доске устарел главный вывод: «${L.brief?.answer.ru ?? ''}». Скажи, что верно сейчас.`)
    return
  }
  const n = L.nodes.find(x => x.id === id)
  if (!n) return
  await commit($, [{ op: 'update', id, status: 'stale' }], current?.n ?? L.turns.at(-1)?.n ?? 1, 'user')
  await addNote($, `Устарело на доске: ${id} «${n.title.ru}». Скажи, что верно сейчас: картограф перепишет или закроет пункт.`)
}

async function sendNotes($: EngineInterface) {
  const queued = await read($, notes)
  if (!queued.length) return
  // clear first: the prompt.submit hook would attach them a second time
  await update($, notes, () => [])
  await sendOnce($, 'notes', `Заметки с доски:\n${queued.map(n => `- ${n}`).join('\n')}`)
}

async function sendVerdict($: EngineInterface, kind: VerdictKind, send = true): Promise<string> {
  const L = await read($, ledger)
  const t = L.task
  if (!t) return ''
  const v = await read($, verdict)
  const msg = verdictMessage(kind, L, v)
  const at = await iso($)
  const turn = L.turns.at(-1)?.n ?? 1
  const ops: Op[] = []
  for (const [id, m] of Object.entries(v.marks)) {
    const n = L.nodes.find(x => x.id === id)
    if (!n || m !== 'no') continue
    if (n.kind === 'criterion') ops.push({ op: 'update', id, status: 'failed' })
    else if (n.kind === 'assumption') ops.push({ op: 'update', id, status: 'invalid' })
    else if (n.kind === 'decision') ops.push({ op: 'update', id, status: 'disputed' })
  }
  for (const r of v.rules) ops.push({ op: 'add', kind: 'constraint', title: { en: r, ru: r }, statement: { en: r, ru: r }, evidence: [{ ref: 'feedback', type: 'user' }] })
  if (kind === 'accept') for (const g of L.nodes.filter(n => n.kind === 'goal' && n.status !== 'done' && !gone(n))) ops.push({ op: 'update', id: g.id, status: 'done' })
  if (ops.length) await commit($, ops, turn, 'user')
  const base = await ensureTasksRoot($)
  if (v.rules.length && base) {
    const file = `${base}/RULES.md`
    const prev = (await $.fs.exists(file)) ? await $.fs.read(file) : '# Project rules\n\nRules from task feedback. session-board gives them to Claude at the start of every session.\n'
    const slug = t.dir.split('/').pop() ?? ''
    await $.fs.write(file, `${prev.trimEnd()}\n${v.rules.map(r => `- ${r} _(${slug}, ${at.slice(0, 10)})_`).join('\n')}\n`)
    projectRules = await $.fs.read(file)
  }
  if (t.dir) {
    const file = `${t.dir}/feedback.md`
    const prev = (await $.fs.exists(file)) ? await $.fs.read(file) : `# Приёмка: ${t.title.ru}\n`
    await $.fs.write(file, `${prev.trimEnd()}\n\n## Раунд ${t.round}: ${VERDICT_LABEL[kind]} (${at.slice(0, 16).replace('T', ' ')})\n\n${msg}\n`)
  }
  await setTask($, x => ({ ...x, phase: kind === 'accept' ? 'accepted' : 'work', round: kind === 'return' ? x.round + 1 : x.round, acceptOnSubmit: kind === 'fixes' }))
  await update($, verdict, () => emptyVerdict())
  await update($, editing, () => '')
  if (kind === 'accept') await buildReport($)
  if (send) await sendOnce($, 'verdict', msg)
  return msg
}

async function continueTask($: EngineInterface, dir: string) {
  if (!insideTasks(dir) || (await isTracked($, dir))) {
    $.ui.toast('Эта папка задачи пришла с репозиторием: доска её не загружает')
    return
  }
  if (!(await $.fs.exists(`${dir}/ledger.json`))) return
  try {
    const saved = JSON.parse(await $.fs.read(`${dir}/ledger.json`)) as Ledger
    if (!saved || saved.v !== 1 || !Array.isArray(saved.nodes)) return
    const L = await update($, ledger, () => ({ ...cleanBrief(saved).ledger, sid: sessionId }))
    await persist($, L, [])
  } catch {
    $.ui.toast('Не удалось прочитать журнал задачи')
    return
  }
  await update($, view, () => '')
  // the next prompt carries the protocol again, with this folder
  await update($, greeted, () => '')
  await refreshOpenTasks($)
}

// ---------- tool descriptions: the protocol Claude follows ----------

const TASK_TOOL_DESCRIPTION =
  'Write the task brief to the session board: the contract between the person and you. Use it when the person gives a new task, or asks to write up the current work as a task. ' +
  'Before the call, ask ALL missing questions at once in ONE AskUserQuestion call; do not drip questions later. ' +
  'Fill title (10 words or fewer), goal (what must change and why), result (what to hand in), done_when (2 to 5 checkable criteria: a command, a test, a screenshot), rules, out_of_scope, authority, materials. ' +
  'Give every text in plain English plus a Russian version for the board (title_ru, goal_ru, result_ru; {en, ru} items in done_when and rules; out_of_scope and materials in Russian). ' +
  'After the call, end your turn: the person reviews the brief and presses Start. Call it again to amend the brief.'

const SUBMIT_TOOL_DESCRIPTION =
  'Hand in the work for acceptance. Call it only when the work is done: first check EVERY criterion of the brief (K1, K2...) yourself and collect evidence (test, command and its output, file:line, URL). ' +
  'Give summary and summary_ru (what the person gets now, 2 or 3 short sentences, the result first), criteria [{id, status: proven|failed, result_ru, evidence[]}], for_you (what only the person can do now), verify (how to check it yourself), not_done and next. ' +
  'The person runs many sessions and reads this screen in 30 seconds, without having watched the session. So every Russian field (summary_ru, result_ru, for_you, verify, not_done, next) is plain everyday Russian: ' +
  'the result first, one thought per sentence, up to 15 words, verbs instead of nouns, no ledger ids (K1, D20, F27), no file paths, no run ids, no tool names, no English terms where a Russian word exists. ' +
  'Good result_ru: "Да: проверки на GitHub проходят, оба плагина устанавливаются." Bad: "CI run 37117211238: success on bb241e7". ' +
  'Put ids, commands, paths, run ids and numbers into evidence: the board hides evidence under a toggle. ' +
  'If the session has the lean rules ("lean is on"), first check your own work: review the task\'s diff for over-engineering as lean-review does and record each finding with the note tool (kind finding, tag cut: what to remove, what replaces it, file and line; also for parts the person asked for by name, saying so); make sure each new `lean:` comment in the diff has a note with tag shortcut. Only record: do not change the code for them, the person picks what to cut. Put the result in lean_check, one plain Russian line («Лишнего не нашёл», «Нашёл два места, они в списке»). ' +
  'The board builds an HTML report and shows the person the Acceptance screen. After the call, end your turn and wait for one verdict. ' +
  'In free mode («Свободный режим») submit is the summary: give every idea its final status first, then summary_ru, next, for_you and an empty criteria list; there is no verdict.'

// ---------- board actions: the same for every surface ----------

function boardActions($: EngineInterface): Actions {
  // board actions run outside the drawing; a failed one says so instead of failing silently
  const later = (fn: () => Promise<unknown>) => void fn().catch((err: unknown) => $.ui.toast(`Доска: ${(err as Error).message.slice(0, 80)}`))
  return {
    setView: x => {
      void update($, view, () => x)
      void update($, editing, () => '')
    },
    toggle: id => void update($, expanded, list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id])),
    refresh: () => {
      void read($, ledger).then(x => schedule($, x.nodes.length ? catchUpDigest(x) ?? lastDigest(x) : 'bootstrap'))
    },
    edit: id => void update($, editing, () => id),
    startAnswer: id => void update($, answering, () => id),
    submitAnswer: (id, text) => {
      const t = text.trim()
      void update($, answering, () => '')
      if (!t) return
      void read($, ledger).then(x => {
        const n = x.nodes.find(y => y.id === id)
        say($, `Ответ на твой вопрос${n ? ` «${n.title.ru}»` : ''}: ${t}`)
        void commit($, [{ op: 'update', id, status: 'answered' }], current?.n ?? x.turns.at(-1)?.n ?? 1, 'user')
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
      void read($, ledger).then(x => {
        const n = x.nodes.find(y => y.id === id)
        if (!n) return
        const alt = n.rejected?.length ? ` Альтернативы были: ${n.rejected.map(r => r.ru).join('; ')}.` : ''
        void sendOnce($, `undo:${id}`, `Отмени своё решение «${n.title.ru}» (${id}). Предложи, что сделать вместо него, и спроси меня перед изменениями.${alt}`)
      })
    },
    openFile: path => later(() => openFile($, path)),
    showDiff: path => later(() => toggleDiff($, path)),
    tellClaude: (text, key) => later(() => sendOnce($, key ?? text.slice(0, 60), text)),
    newTask: text => {
      const t = text.trim()
      void update($, editing, () => '')
      if (t) later(() => sendOnce($, 'intake', `Новая задача: ${t}`))
    },
    formalize: () => later(() => sendOnce($, 'formalize', 'Оформи текущую работу как задание через тул task: цель, результат, критерии «готово, когда», правила, вне рамок, полномочия. Все недостающие вопросы задай одним окном. Потом жди «Старт».')),
    fixTask: text => {
      const t = text.trim()
      void update($, editing, () => '')
      if (t) later(() => sendOnce($, 'fix', `Поправь задание: ${t}. Обнови бриф через тул task и жди «Старт».`))
    },
    setAuthority: level => later(() => setAuthority($, level)),
    setCode: level => later(() => setCode($, level)),
    start: () => later(() => startTask($)),
    freeMode: () => later(() => freeMode($)),
    wrap: () => later(() => sendOnce($, 'wrap', WRAP_ASK)),
    addItem: (kind, text) => later(() => addItem($, kind, text)),
    stale: id => later(() => markStale($, id)),
    sendNotes: () => later(() => sendNotes($)),
    mark: (id, m) => void update($, verdict, v => {
      const marks = { ...v.marks }
      if (marks[id] === m) delete marks[id]
      else marks[id] = m
      return { ...v, marks }
    }),
    comment: (id, text) => {
      void update($, editing, () => '')
      void update($, verdict, v => {
        const comments = { ...v.comments }
        const t = text.trim()
        if (t) comments[id] = t
        else delete comments[id]
        return { ...v, comments }
      })
    },
    addGeneral: text => {
      void update($, editing, () => '')
      const t = text.trim()
      if (t) void update($, verdict, v => ({ ...v, general: [...v.general, t] }))
    },
    toggleRule: text => void update($, verdict, v => ({ ...v, rules: v.rules.includes(text) ? v.rules.filter(r => r !== text) : [...v.rules, text] })),
    sendVerdict: kind => later(() => sendVerdict($, kind)),
    openReport: () => later(() => openReport($)),
    continueTask: dir => later(() => continueTask($, dir)),
  }
}

/** The next step as a question dialog, for a phone or a browser: Remote Control forwards these, mods draw there not. */
async function askNext($: EngineInterface) {
  const L = await read($, ledger)
  const t = L.task
  const ask = async (q: string, options: string[]) => {
    try {
      return (await $.ui.ask(q, options)).trim()
    } catch {
      return '' // dismissed
    }
  }
  const IN_CHAT = 'Напишу в чате'
  const LATER = 'Позже'
  const FREE = 'Свободный режим'
  if (!t || t.phase === 'accepted') {
    const x = await ask('Задания нет. Какую задачу поставить? Опишите её в «Other» или выберите свободный режим.', [IN_CHAT, FREE, LATER])
    if (x === FREE) return void (await freeMode($))
    if (x && x !== IN_CHAT && x !== LATER) await sendOnce($, 'intake', `Новая задача: ${x}`)
    return
  }
  if (t.mode === 'free' && !waitingQuestions(L).length) {
    const x = await ask(`Свободный режим, идей на доске: ${ideasOf(L).length}. Подвести итог?`, ['Подвести итог', LATER])
    if (x === 'Подвести итог') await sendOnce($, 'wrap', WRAP_ASK)
    return
  }
  if (t.phase === 'intake') {
    const x = await ask(`Задание «${t.title.ru}» ждёт старта. Что делаем?`, ['Старт', 'Поправить задание', LATER])
    if (x === 'Старт') return startTask($)
    const fix = x === 'Поправить задание' ? await ask('Что поправить в задании? Впишите в «Other».', [IN_CHAT, LATER]) : x
    if (fix && fix !== IN_CHAT && fix !== LATER && fix !== 'Поправить задание') {
      await sendOnce($, 'fix', `Поправь задание: ${fix}. Обнови бриф через тул task и жди «Старт».`)
    }
    return
  }
  if (t.phase === 'review') {
    const x = await ask(`Работа «${t.title.ru}» сдана: ${verdictLine(criteriaOf(L))}. Что делаем?`, ['Принять', 'Вернуть на доработку', 'Принять с правками', LATER])
    if (!x || x === LATER) return
    if (x === 'Принять') return void (await sendVerdict($, 'accept'))
    const kind: VerdictKind = x === 'Принять с правками' ? 'fixes' : 'return'
    // a text typed under "Other" on the first question is itself the remark
    const typed = x !== 'Вернуть на доработку' && x !== 'Принять с правками' ? x : ''
    const remark = typed || (await ask('Что поправить? Впишите в «Other».', [IN_CHAT, 'Без комментария']))
    if (!remark) return
    if (remark !== 'Без комментария') {
      const text = remark === IN_CHAT ? 'Правки напишу следующим сообщением в чате.' : remark
      await update($, verdict, v => ({ ...v, general: [...v.general, text] }))
    }
    await sendVerdict($, typed ? 'return' : kind)
    return
  }
  // work: the first question that waits for the person
  const q = waitingQuestions(L)[0]
  if (!q) return
  const options = [...(q.options ?? []).slice(0, 2), IN_CHAT, LATER]
  const x = await ask(`${q.title.ru.replace(/[?.]$/, '')}? Свой ответ впишите в «Other».`, options)
  if (!x || x === IN_CHAT || x === LATER) return
  await commit($, [{ op: 'update', id: q.id, status: 'answered' }], current?.n ?? L.turns.at(-1)?.n ?? 1, 'user')
  say($, `Ответ на твой вопрос «${q.title.ru}»: ${x}`)
}

export const register: Register = (on, options) => {
  cfg.updateMode = options.update === 'manual' ? 'manual' : 'every-turn'
  cfg.minTools = typeof options.minTools === 'number' ? options.minTools : 2
  cfg.autoOpen = options.autoOpen !== false
  cfg.injectAfterCompact = options.injectAfterCompact !== false
  cfg.push = options.push !== false
  current = null
  busy = false
  pending = null
  pointerFor = ''
  leanLooks = 0

  // ---------- session ----------

  on('session.start', async ($, e, next) => {
    sessionId = await $.session.id()
    root = await projectRoot($, e.cwd)
    const legacy = `${root}/.claude/session-board/${sessionId}`
    const state = await read($, ledger)
    if (state.sid !== sessionId || (!state.nodes.length && !state.task)) {
      // a new or resumed session: its task folder first, then the old per-session ledger
      let saved: Ledger | null = null
      try {
        if (await $.fs.exists(`${legacy}/task.json`)) {
          const ptr = JSON.parse(await $.fs.read(`${legacy}/task.json`)) as { dir?: string }
          if (ptr.dir && insideTasks(ptr.dir) && !(await isTracked($, ptr.dir)) && (await $.fs.exists(`${ptr.dir}/ledger.json`))) {
            saved = JSON.parse(await $.fs.read(`${ptr.dir}/ledger.json`)) as Ledger
          }
        }
        if (!saved && (await $.fs.exists(`${legacy}/ledger.json`))) saved = JSON.parse(await $.fs.read(`${legacy}/ledger.json`)) as Ledger
      } catch {
        saved = null
      }
      if (saved && saved.v === 1 && Array.isArray(saved.nodes)) {
        const ok = saved
        await update($, ledger, () => ({ ...cleanBrief(ok).ledger, sid: sessionId }))
      } else {
        await update($, ledger, prev => (prev.sid === sessionId ? prev : emptyLedger(sessionId)))
      }
    }
    await update($, ledger, prev => ({ ...prev, sid: sessionId }))
    try {
      const base = tasksRoot()
      const foreign: string[] = []
      if (await $.fs.exists(`${base}/policy.json`)) {
        if (await isTracked($, `${base}/policy.json`)) foreign.push('policy.json')
        else {
          const p = JSON.parse(await $.fs.read(`${base}/policy.json`)) as { authority?: unknown }
          if (isAuthority(p.authority)) {
            const level = p.authority
            await update($, policy, () => level)
          }
        }
      }
      projectRules = ''
      if (await $.fs.exists(`${base}/RULES.md`)) {
        if (await isTracked($, `${base}/RULES.md`)) foreign.push('RULES.md')
        else projectRules = await $.fs.read(`${base}/RULES.md`)
      }
      if (foreign.length) $.ui.toast(`Доска не применяет ${foreign.join(' и ')} из репозитория: такие настройки задаёт только человек на этой машине`)
    } catch {
      projectRules = ''
    }
    // an old ledger with goals gets its task folder now
    await ensureTask($)
    await refreshOpenTasks($)
    await findLean($).catch(() => undefined)
    await countDebt($)
    // a reload drops pending timers: catch up the last turn if it never reached the map
    const L0 = await read($, ledger)
    const behind = catchUpDigest(L0)
    if (cfg.updateMode === 'every-turn' && L0.turns.length && behind) schedule($, behind)

    await $.command.register({ name: 'board', description: 'Open the session board' })
    await $.command.register({ name: 'board-update', description: 'Rebuild the session map now (one model call over the session)' })
    await $.command.register({ name: 'board-ask', description: 'Ask a question about this session without adding to it', argumentHint: '<question>' })
    await $.command.register({ name: 'board-report', description: 'Build the HTML report of the task and open it' })

    await $.tool.register({
      name: 'ledger_read',
      description:
        'Read the session ledger: the structured history of THIS task (brief, goals, criteria, user constraints, decisions, findings, dead ends, open questions). Call it after compaction, before you repeat an approach, or when the user asks what was decided. With no input it returns the brief; give an id (like D2) for one node with its children, or a section.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'A node id such as G1, K2, D2, F3' },
          section: { type: 'string', enum: ['brief', 'task', 'decisions', 'constraints', 'dead-ends', 'open', 'all'] },
        },
      },
    })
    await $.tool.register({
      name: 'note',
      description:
        'Record one item in the session ledger at once: a decision you took yourself (it goes to the acceptance list), an assumption, a finding with evidence, an open question for the user, a constraint the user stated, or a dead end. Give an existing id to update that item instead (for example mark a step done or a criterion proven with evidence). ' +
        'In free mode, kind idea keeps an idea thread: status open, trying, kept or dropped (a dropped idea says why in statement). ' +
        'With the lean rules, tag what you did not build (decision, tag skipped), a `lean:` shortcut (decision, tag shortcut) and an over-engineering finding (finding, tag cut): the person sees them under «Не построено».',
      inputSchema: {
        type: 'object',
        required: ['title'],
        properties: {
          id: { type: 'string', description: 'An existing node id to update instead of adding (status, title, statement, parent, evidence)' },
          kind: { type: 'string', enum: ['goal', 'constraint', 'question', 'hypothesis', 'task', 'finding', 'decision', 'open', 'assumption', 'risk', 'idea'] },
          title: { type: 'string', description: '10 words or fewer, plain English' },
          title_ru: { type: 'string', description: 'The same title in plain Russian' },
          statement: { type: 'string', description: 'One sentence, 25 words or fewer' },
          statement_ru: { type: 'string' },
          parent: { type: 'string', description: 'Parent node id, if any' },
          status: { type: 'string', description: 'For example done, refuted, accepted, proven; an idea: open, trying, kept or dropped' },
          evidence: { type: 'array', items: { type: 'string' }, description: 'file:line, command, test or URL' },
          tag: { type: 'string', enum: ['skipped', 'shortcut', 'cut'], description: 'lean items only: skipped (not built), shortcut (a lean: comment), cut (over-engineering to remove)' },
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
    const pair = { type: 'object', properties: { en: { type: 'string' }, ru: { type: 'string' } }, required: ['en', 'ru'] }
    await $.tool.register({
      name: 'task',
      description: TASK_TOOL_DESCRIPTION,
      inputSchema: {
        type: 'object',
        required: ['title', 'title_ru', 'goal', 'goal_ru', 'done_when'],
        properties: {
          title: { type: 'string' }, title_ru: { type: 'string' },
          goal: { type: 'string' }, goal_ru: { type: 'string' },
          result: { type: 'string' }, result_ru: { type: 'string' },
          done_when: { type: 'array', items: pair, description: '2 to 5 checkable criteria' },
          rules: { type: 'array', items: pair, description: 'Rules and bans the person stated' },
          out_of_scope: { type: 'array', items: { type: 'string' } },
          materials: { type: 'array', items: { type: 'string' }, description: 'Files, links, examples' },
          authority: { type: 'string', enum: ['careful', 'normal', 'bold'], description: 'What you may do alone; default: the project policy' },
        },
      },
    })
    await $.tool.register({
      name: 'submit',
      description: SUBMIT_TOOL_DESCRIPTION,
      inputSchema: {
        type: 'object',
        required: ['summary_ru', 'criteria'],
        properties: {
          summary: { type: 'string' }, summary_ru: { type: 'string' },
          criteria: {
            type: 'array',
            items: {
              type: 'object', required: ['id', 'status', 'result_ru'],
              properties: {
                id: { type: 'string' },
                status: { type: 'string', enum: ['proven', 'failed'] },
                result_ru: { type: 'string', description: 'One plain Russian sentence for the person: what is true now. No ids, paths or commands.' },
                evidence: { type: 'array', items: { type: 'string' }, description: 'Technical proof: command and output, file:line, URL, run id. Hidden under a toggle.' },
              },
            },
          },
          for_you: { type: 'array', items: { type: 'string' }, description: 'What only the person can do now, plain Russian, one action per item' },
          verify: { type: 'array', items: { type: 'string' } },
          not_done: { type: 'array', items: { type: 'string' } },
          next: { type: 'array', items: { type: 'string' } },
          lean_check: { type: 'string', description: 'With the lean rules only: the result of your over-engineering self-check of the task\'s diff, one plain Russian line' },
        },
      },
    })

    if (cfg.autoOpen && e.isInteractive) openBoard($)
    return next(e)
  })

  on('command.run', { command: 'board' }, async ($, e) => {
    if (e.origin?.kind === 'bridge') {
      // a phone or a browser: mods draw nothing there, so the board is text plus a question
      $.clock.after(0, () => void askNext($).catch(() => undefined))
      return { text: boardText(await read($, ledger)) }
    }
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Session board opened.' }
  })

  on('command.run', { command: 'board-update' }, async $ => {
    const L = await read($, ledger)
    schedule($, L.nodes.length ? catchUpDigest(L) ?? lastDigest(L) : 'bootstrap')
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Session board: map update started.' }
  })

  on('command.run', { command: 'board-ask' }, async ($, e) => {
    const q = (e.args ?? '').trim()
    if (!q) return { text: 'Usage: /board-ask <question>' }
    await update($, view, () => 'ask')
    await $.ui.open({ id: PANE, title: TITLE })
    $.clock.after(0, () => void runAsk($, q))
    return { text: 'Session board: the answer appears in the Ask view.' }
  })

  on('command.run', { command: 'board-report' }, async $ => {
    const path = await buildReport($)
    if (!path) return { text: 'Session board: the task has no folder yet, so there is no report.' }
    await openPath($, path)
    return { text: `Session board: report at ${path}` }
  })

  // ---------- turn pipeline ----------

  on('prompt.submit', async ($, e, next) => {
    await update($, ladder, () => false)
    const L = await read($, ledger)
    current = { n: (L.turns.at(-1)?.n ?? 0) + 1, ask: e.text.trim() || (e.attachments?.length ? '(вложение без текста)' : ''), tools: {}, files: new Set(), paths: new Set(), errors: [], ops: [], touched: [] }
    await update($, live, () => [])
    const fromPerson = USER_ORIGINS.has(e.origin?.kind)
    const fromBoard = e.origin?.kind === 'plugin'
    // «Старт», «Принять», «Вернуть: …» typed in the chat (a phone has no board buttons) press the button, and the
    // message Claude gets is the one the button would send, not a second one
    const word = fromPerson ? parseChatCommand(e.text, L.task?.phase, L.task?.mode === 'free') : null
    let text = e.text
    if (word?.kind === 'start') text = (await startTask($, false)) || text
    else if (word?.kind === 'free') text = (await freeMode($, false)) || text
    else if (word?.kind === 'wrap') text = WRAP_ASK
    else if (word) {
      if (word.kind !== 'accept') await update($, verdict, v => ({ ...v, general: [...v.general, word.remark] }))
      text = (await sendVerdict($, word.kind, false)) || text
    }
    if (fromPerson) await findLean($).catch(() => undefined)
    // The person wrote in the chat: their message probably answers the open questions. Take the cards down now;
    // the cartographer marks each one answered, or opens it again when the message did not answer it.
    if (fromPerson && current.ask && !word) {
      const waiting = L.nodes.filter(n => n.kind === 'open' && n.status === 'open' && (n.ask ?? 'user') === 'user')
      if (waiting.length) await commit($, waiting.map(n => ({ op: 'update' as const, id: n.id, status: 'pending' })), current.n, 'user')
    }
    if (!fromPerson && !fromBoard) return next(text === e.text ? e : { ...e, text })
    // what Claude reads beside the prompt and the person never sees: the protocol once a session, the board notes
    const extra: string[] = []
    if (sessionId && (await read($, greeted)) !== sessionId) {
      // read again: a chat word may have just switched the mode
      const t = (await read($, ledger)).task
      extra.push(protocol(t?.dir ?? '', projectRules, t?.mode === 'free'))
      await update($, greeted, () => sessionId)
    }
    const queued = await read($, notes)
    if (queued.length) {
      extra.push(`Notes the person added on the session board since their last message. Apply them:\n${queued.map(n => `- ${n}`).join('\n')}`)
      await update($, notes, () => [])
    }
    const out = text === e.text ? e : { ...e, text }
    return next(extra.length ? { ...out, context: [...(out.context ?? []), ...extra] } : out)
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
    if (!e.agentId) await update($, ladder, () => e.reason === 'answer' && !e.isAborted && proseWords(e.answer) >= LADDER_MIN_WORDS)
    if (!e.agentId) await update($, sent, list => list.filter(x => !x.started))
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
    if (c.paths.size) await countDebt($)
    if (cfg.updateMode === 'every-turn' && !e.isAborted && (toolCount >= cfg.minTools || !L.brief)) {
      const latest: TurnDigest = { n: c.n, ask: c.ask, answer: e.answer, tools: c.tools, files: [...c.files], errors: c.errors }
      schedule($, L.nodes.length ? catchUpDigest(L, latest) ?? latest : 'bootstrap')
    }
    return r
  })

  // ---------- the lean plugin: its hook prints "lean is on. Level: …" at session start ----------

  on('session.append', async ($, e, next) => {
    // the person's prompt, the model and tool output may quote the line; only injected context counts
    if (!e.agentId && e.door !== 'prompt' && e.door !== 'tool-result' && e.message.type !== 'assistant') {
      const text = e.message.content.map(b => ('text' in b && typeof b.text === 'string' ? b.text : '')).join('\n')
      const level = leanLineLevel(text)
      if (level) {
        await update($, lean, () => ({ level }))
        await countDebt($).catch(() => undefined)
      }
    }
    return next(e)
  })

  // ---------- compaction: the files keep the ledger; the summary keeps only what the files lack ----------

  on('session.compact', async ($, e, next) => {
    if (e.agentId) return next(e)
    const L0 = await read($, ledger)
    const rules = compactRules(renderBrief(L0), L0.task?.dir ?? '')
    const result = await next({ ...e, instructions: e.instructions ? `${e.instructions}\n\n${rules}` : rules })
    if (!cfg.injectAfterCompact || 'skip' in result) return result
    const L = await read($, ledger)
    if (!L.nodes.length && !L.brief && !L.task) return result
    // the brief rides in the compacted conversation itself: a session.append from a timer
    // never reached the compacted conversation (K4, 2026-10-03)
    if (result.messages.at(-1)?.text.startsWith('<session-ledger')) return result
    const text = `${renderBrief(L)}\n\n${protocol(L.task?.dir ?? '', projectRules, L.task?.mode === 'free')}`
    return { ...result, messages: [...result.messages, { role: 'user' as const, text, toolUses: [] }] }
  })

  // ---------- tools Claude can call ----------

  on('tool.call', { tool: 'mcp__session-board__ledger_read' }, async ($, e) => {
    const input = e as unknown as { id?: string; section?: string }
    const L = await read($, ledger)
    let text: string
    if (input.id) {
      const n = L.nodes.find(x => x.id === input.id)
      text = n ? JSON.stringify({ node: n, children: L.nodes.filter(x => x.parent === n.id).map(x => ({ id: x.id, kind: x.kind, status: x.status, title: x.title.en })) }, null, 1) : `No node ${input.id}.`
    } else if (input.section === 'task') {
      text = L.task ? renderTaskMd(L) : 'No task brief yet.'
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
    return reply(text)
  })

  on('tool.call', { tool: 'mcp__session-board__note' }, async ($, e) => {
    const i = e as unknown as Record<string, unknown>
    const s = (k: string) => (typeof i[k] === 'string' && (i[k] as string).trim() ? (i[k] as string) : undefined)
    const L = await read($, ledger)
    const turn = current?.n ?? L.turns.at(-1)?.n ?? 1
    const evidence = Array.isArray(i.evidence) ? i.evidence.map(x => ({ ref: String(x), type: 'tool' })) : undefined
    const id = s('id')
    if (id) {
      const n = L.nodes.find(x => x.id === id)
      if (!n) return reply(`No node ${id}.`)
      const op = parseOp({
        op: 'update', id, status: s('status'), parent: s('parent'),
        // an English-only update keeps the Russian text: the board must not turn English
        ...(s('title') ? { title: { en: s('title'), ru: s('title_ru') ?? n.title.ru } } : {}),
        ...(s('statement') || s('statement_ru') ? { statement: { en: s('statement') ?? s('statement_ru'), ru: s('statement_ru') ?? n.statement?.ru ?? s('statement') } } : {}),
        ...(evidence ? { evidence: [...n.evidence, ...evidence].slice(0, 8) } : {}),
        tag: i.tag,
      })
      if (!op) return reply(`Not updated: ${id}.`)
      await commit($, [op], turn, 'claude')
      if (current) current.touched.push(id)
      return reply(`Updated ${id}.`)
    }
    const op = parseOp({
      op: 'add', kind: i.kind, parent: s('parent'), status: s('status'),
      title: { en: s('title') ?? '', ru: s('title_ru') ?? s('title') ?? '' },
      // a Russian-only statement still shows: the board is read in Russian
      ...(s('statement') || s('statement_ru') ? { statement: { en: s('statement') ?? s('statement_ru'), ru: s('statement_ru') ?? s('statement') } } : {}),
      evidence: evidence ?? [],
      ...(i.kind === 'decision' ? { by: 'claude' } : {}),
      tag: i.tag,
    })
    if (!op) return reply('Not recorded: kind and title are required.')
    const [added] = await commit($, [op], turn, 'claude')
    if (current && added) current.touched.push(added)
    if (i.kind === 'open' && (s('ask') ?? 'user') === 'user') await push($, `Нужен ваш ответ: ${s('title_ru') ?? s('title') ?? ''} Ответьте сообщением или наберите /board.`)
    return reply(`Recorded ${added}.`)
  })

  on('tool.call', { tool: 'mcp__session-board__show' }, async ($, e) => {
    const i = e as unknown as { title?: string; markdown?: string; svg?: string }
    const svg = typeof i.svg === 'string' && i.svg.trim().startsWith('<svg') ? i.svg.slice(0, 131072) : ''
    const at = await iso($)
    await update($, explain, () => ({ title: (i.title ?? 'Объяснение').slice(0, 80), markdown: (i.markdown ?? '').slice(0, 10000), svg, at }))
    await $.ui.open({ id: EXPLAIN_PANE, title: (i.title ?? 'Объяснение').slice(0, 40) })
    return reply('Shown in the session board.')
  })

  on('tool.call', { tool: 'mcp__session-board__task' }, async ($, e) => {
    const input = parseTaskInput(e as unknown as Record<string, unknown>)
    if ('error' in input) return reply(`Not recorded: ${input.error}.`)
    const at = await iso($)
    let L = await read($, ledger)
    // a brief with another title while the task waits for acceptance is a new task, not an amend: amending would
    // supersede the handed-in criteria (2026-10-04). The old task keeps its folder and waits under "open tasks".
    const waiting = L.task?.phase === 'review' && L.task.title.en.trim() !== input.title.en.trim() ? L.task : null
    if (L.task?.phase === 'accepted' || waiting || L.task?.mode === 'free') {
      // a new task after an accepted one, or out of free mode, starts a fresh ledger; the old one stays in its folder
      L = await update($, ledger, prev => ({ ...emptyLedger(prev.sid), updated: at }))
      await update($, verdict, () => emptyVerdict())
    }
    await commit($, briefOps(L, input), current?.n ?? L.turns.at(-1)?.n ?? 1, 'claude')
    const prev = (await read($, ledger)).task ?? null
    let dir = prev?.dir ?? ''
    if (!dir) dir = await newTaskDir($, input.title.en)
    else if (prev && !prev.formal) {
      // work that grew without a brief now gets a folder named after the real title
      const renamed = await newTaskDir($, input.title.en)
      if (renamed && (await $.process.run(['mv', dir, renamed])).exitCode === 0) dir = renamed
    }
    const keepPhase = prev && prev.formal && prev.phase !== 'intake'
    const task: TaskSpec = {
      title: input.title, goal: input.goal, result: input.result, outOfScope: input.outOfScope, materials: input.materials,
      authority: input.authority ?? prev?.authority ?? (await read($, policy)),
      dir, created: prev?.created ?? at, phase: keepPhase ? prev.phase : 'intake', round: prev?.round ?? 1, formal: true,
      ...(prev?.started ? { started: prev.started } : {}),
      ...(prev?.base ? { base: prev.base } : {}),
    }
    const L2 = await update($, ledger, x => ({ ...x, task, updated: at }))
    await persist($, L2, [])
    await update($, view, () => '')
    await update($, editing, () => '')
    await refreshOpenTasks($)
    openBoard($)
    if (task.phase === 'intake') await push($, `Задание готово: «${task.title.ru}». Ответьте «Старт» или наберите /board.`)
    const kept = waiting ? ` The previous task «${waiting.title.en}» still waits for the person's verdict in ${waiting.dir || 'its folder'}.` : ''
    return reply(task.phase === 'intake'
      ? `Task brief recorded${dir ? ` in ${dir}/task.md` : ''}.${kept} End your turn now: the person reviews the brief on the board and presses Start. Do not start the work before that.`
      : `Task brief updated${dir ? ` in ${dir}/task.md` : ''}. Go on with the work.`)
  })

  on('tool.call', { tool: 'mcp__session-board__submit' }, async ($, e) => {
    const raw = e as unknown as Record<string, unknown>
    await ensureTask($)
    const L = await read($, ledger)
    const t = L.task
    if (!t) return reply('Not handed in: there is no task. Write the brief with the task tool first.')
    const summary = txt(typeof raw.summary === 'string' && typeof raw.summary_ru === 'string' ? { en: raw.summary, ru: raw.summary_ru } : raw.summary_ru ?? raw.summary, 1200)
    if (!summary) return reply('Not handed in: summary_ru is required.')
    if (t.mode === 'free') {
      // free mode: no criteria and no acceptance; the summary closes the session
      const sub: Submission = { at: await iso($), round: 1, summary, forYou: strs(raw.for_you), verify: strs(raw.verify), notDone: strs(raw.not_done), next: strs(raw.next) }
      const L2 = await setTask($, x => ({ ...x, submitted: sub, phase: 'accepted' }))
      if (t.dir) await $.fs.write(`${t.dir}/summary.md`, renderSummary(L2))
      openBoard($)
      $.ui.toast('Итог подведён')
      await push($, `Итог готов: «${t.title.ru}». Наберите /board.`)
      return reply(`Summary recorded${t.dir ? ` in ${t.dir}/summary.md` : ''}; the free session is closed. End your turn now.`)
    }
    const crit = criteriaOf(L)
    const items = (Array.isArray(raw.criteria) ? raw.criteria : []).filter(isObj)
    const ops: Op[] = []
    const results: Record<string, string> = {}
    for (const it of items) {
      const k = crit.find(c => c.id === it.id)
      if (!k) continue
      if (typeof it.result_ru === 'string' && it.result_ru.trim()) results[k.id] = it.result_ru.trim().slice(0, 300)
      const ev = strs(it.evidence, 6).map(r => ({ ref: r.slice(0, 200), type: 'tool' as const }))
      ops.push({ op: 'update', id: k.id, ...(it.status === 'proven' || it.status === 'failed' ? { status: it.status } : {}), evidence: [...k.evidence, ...ev].slice(0, 8) })
    }
    const closing = !!t.acceptOnSubmit
    if (closing) for (const g of L.nodes.filter(n => n.kind === 'goal' && n.status !== 'done' && !gone(n))) ops.push({ op: 'update', id: g.id, status: 'done' })
    if (ops.length) await commit($, ops, current?.n ?? L.turns.at(-1)?.n ?? 1, 'claude')
    const at = await iso($)
    const leanCheck = typeof raw.lean_check === 'string' && raw.lean_check.trim() ? raw.lean_check.trim().slice(0, 300) : undefined
    const sub: Submission = { at, round: t.round, summary, results, forYou: strs(raw.for_you), verify: strs(raw.verify), notDone: strs(raw.not_done), next: strs(raw.next), ...(leanCheck ? { leanCheck } : {}) }
    await setTask($, x => ({ ...x, submitted: sub, phase: closing ? 'accepted' : 'review', acceptOnSubmit: false }))
    await update($, verdict, () => emptyVerdict())
    const path = await buildReport($)
    if (closing && t.dir) {
      const file = `${t.dir}/feedback.md`
      const prev = (await $.fs.exists(file)) ? await $.fs.read(file) : `# Приёмка: ${t.title.ru}\n`
      await $.fs.write(file, `${prev.trimEnd()}\n\nПравки внесены ${at.slice(0, 16).replace('T', ' ')}: задача закрыта.\n`)
    }
    openBoard($)
    $.ui.toast(closing ? 'Правки внесены, задача закрыта' : 'Работа сдана: открой «Приёмку»')
    if (!closing) await push($, `Работа сдана: «${t.title.ru}». ${verdictLine(criteriaOf(await read($, ledger)))}. Ответьте «Принять» или наберите /board.`)
    const missing = crit.filter(c => !items.some(it => it.id === c.id)).map(c => c.id)
    return reply(closing
      ? `Fixes recorded; the task is closed.${path ? ` Report: ${path}.` : ''}`
      : `Handed in for review${missing.length ? ` (no result for ${missing.join(', ')})` : ''}.${path ? ` Report: ${path}.` : ''} End your turn now and wait for the person's verdict.`)
  })

  // ---------- drawing ----------

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    if (e.surface !== 'desktop' && e.surface !== 'terminal') {
      const { Markdown } = $.ui.resolve(e)
      return <Markdown text={renderMarkdown(await read($, ledger), 'ru').slice(0, 9000)} />
    }
    const els = $.ui.resolve(e)
    const L = await read($, ledger)
    const v = resolveView(await read($, view), L.task?.phase)
    const d: Data = {
      ledger: L,
      view: v,
      expanded: await read($, expanded),
      status: await read($, status),
      // live events redraw the pane on every tool call: read them only where they show
      live: v === 'log-turns' ? await read($, live) : [],
      qa: v === 'ask' ? await read($, qa) : [],
      answering: await read($, answering),
      diff: v === 'log-files' ? await read($, diff) : null,
      verdict: v === 'review' ? await read($, verdict) : emptyVerdict(),
      notes: await read($, notes),
      editing: await read($, editing),
      openTasks: v === 'task' && (!L.task || L.task.mode === 'free') ? await read($, openTasks) : [],
      policy: await read($, policy),
      lean: await read($, lean),
      debt: v === 'task' ? await read($, debt) : null,
      sent: (await read($, sent)).map(x => x.key),
      width: Math.max(24, e.props.bodyColumns - 1),
      ...(e.surface === 'desktop' ? { svg: $.ui.resolve(e).Svg } : {}),
    }
    const a = boardActions($)
    try {
      return Board(els, d, a)
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
    if (e.props.hasSurvey || (e.surface !== 'desktop' && e.surface !== 'terminal')) return next(e)
    const L = await read($, ledger)
    const st = await read($, status)
    const v = await read($, verdict)
    const fixes = ruleCandidates(v).length + Object.values(v.marks).filter(m => m === 'no').length
    const showLadder = await read($, ladder)
    return Band($.ui.resolve(e), { ledger: L, mapping: st.phase === 'mapping', mappingNote: st.note, cols: e.props.bodyColumns, fixes, ladder: showLadder ? RUNGS : [] }, {
      open: x => {
        openBoard($, true)
        void update($, view, () => x)
      },
      accept: () => {
        sendVerdict($, 'accept').catch((err: unknown) => $.ui.toast(`Доска: ${String((err as Error)?.message ?? err).slice(0, 80)}`))
      },
      wrap: () => {
        sendOnce($, 'wrap', WRAP_ASK).catch(() => undefined)
      },
      rung: text => {
        void update($, ladder, () => false)
        say($, text)
      },
    })
  })
}
