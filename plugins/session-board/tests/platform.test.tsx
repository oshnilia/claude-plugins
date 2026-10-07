import { test, expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { home, slashed } from '../hooks/extract'
import { applyOps, emptyLedger, upsertTurn } from '../hooks/ledger'

// The board on each platform: which command opens the report and a file, and how it reads Windows paths.
const PANE = {
  component: 'Pane' as const,
  requestId: 'board',
  props: { title: 'Доска сессии', isFocused: true, bodyColumns: 48, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 160 }, view: {} },
}
const BRIEF = {
  tool: 'mcp__session-board__task',
  title: 'Ship the board', title_ru: 'Выпустить доску',
  goal: 'The person sees the session at a glance', goal_ru: 'Человек видит сессию с одного взгляда',
  done_when: [{ en: 'Tests pass', ru: 'Тесты проходят' }, { en: 'The report opens', ru: 'Отчёт открывается' }],
  authority: 'normal',
}
const SID = 'platform-session'

type Machine = { os?: string; uname?: string; missing?: string[]; top?: string }

// the test kit on macOS takes `C:/…` for a relative path and puts its own folder in front: cut that off again
const drive = (p: string) => p.replace(/^.*?(?=[A-Z]:\/)/, '')

/**
 * A machine in memory: the OS variable, what `uname -s` prints, the commands it lacks, and the top level git prints
 * (none: "not a repository", so the project folder is the session's cwd as given). Every command the board runs is kept.
 */
function machine(on: On, m: Machine) {
  const files = new Map<string, string>()
  const runs: string[][] = []
  const toasts: string[] = []
  mock.clock(on, { now: Date.parse('2026-10-07T10:00:00Z') })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('command.register', async () => ({ value: undefined }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('session.id', async () => ({ value: SID }))
  on('env.get', async (_$, e) => ({ value: e.name === 'OS' ? m.os : undefined }) as never)
  on('fs.exists', async (_$, e) => ({ value: files.has(drive(e.path)) || [...files.keys()].some(k => k.startsWith(`${drive(e.path)}/`)) }))
  on('fs.read', async (_$, e) => {
    const text = files.get(drive(e.path))
    if (text === undefined) throw new Error(`no file ${e.path}`)
    return { value: text }
  })
  on('fs.write', async (_$, e) => {
    files.set(drive(e.path), e.text)
    return { value: undefined }
  })
  on('fs.list', async () => ({ value: [] }) as never)
  on('process.run', async (_$, e) => {
    const argv = [...e.argv]
    runs.push(argv)
    if (m.missing?.includes(argv[0]!)) throw new Error(`spawn ${argv[0]} ENOENT`)
    if (argv[0] === 'git') {
      // a repository where nothing is tracked yet: every file is new
      const top = argv.includes('--show-toplevel') ? `${m.top}\n` : argv.includes('--is-inside-work-tree') ? 'true\n' : ''
      const ok = m.top && !argv.includes('--error-unmatch') && !argv.includes('grep')
      return { value: { exitCode: ok ? 0 : 128, stdout: ok ? top : '', stderr: '' } } as never
    }
    return { value: { exitCode: argv[0] === 'explorer' ? 1 : 0, stdout: argv[0] === 'uname' ? `${m.uname ?? ''}\n` : '', stderr: '' } } as never
  })
  on('ui.toast', async (_$, e) => {
    toasts.push(e.text)
    return { value: undefined } as never
  })
  return { files, runs, toasts }
}

const opened = (runs: string[][]) => runs.filter(r => !['git', 'uname'].includes(r[0]!))

/** The session's saved ledger, as an earlier start left it: a turn that changed `path`, and a goal when given. */
function savedLedger(files: Map<string, string>, root: string, path: string, goal?: string) {
  let L = upsertTurn(emptyLedger(SID), {
    n: 1, at: '2026-10-07T09:00:00Z', ask: { en: 'Fix it', ru: 'Поправь' }, did: { en: '', ru: '' },
    tools: { Write: 1 }, files: [path], paths: [path], errors: 0, nodes: [], mapped: true,
  })
  if (goal) L = applyOps(L, [{ op: 'add', kind: 'goal', title: { en: goal, ru: goal } }], 1, 'claude').ledger
  files.set(`${root}/.claude/session-board/${SID}/ledger.json`, JSON.stringify(L))
}

/** «Открыть» on the file under Журнал → Файлы; the button runs its command in the background. */
async function pressOpen($: { ui: { mount: (x: never) => Promise<{ press: (x: { key: string }) => Promise<unknown>; unmount: () => Promise<unknown> }> } }, path: string, m: ReturnType<typeof machine>) {
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE } as never)
  await ui.press({ key: 'view-log' })
  await ui.press({ key: 'log-log-files' })
  m.runs.length = 0
  await ui.press({ key: `fo-${path}` })
  for (let i = 0; i < 100 && !opened(m.runs).length && !m.toasts.length; i++) await new Promise(r => setTimeout(r, 5))
  await ui.unmount()
}

test('paths: Windows backslashes and drive letters read as one form; the home folder hides on every platform', async () => {
  expect(slashed('D:\\work\\proj\\src\\a.py')).toBe('D:/work/proj/src/a.py')
  expect(slashed('d:/work/proj')).toBe('D:/work/proj')
  expect(slashed('/work/proj')).toBe('/work/proj')
  // CI refuses a literal home path with a user name in the repository: the tops and the name are joined here
  for (const top of ['/Users', '/home', 'C:/Users', 'c:\\Users']) expect(slashed(`${top}/dev/x.md`).replace(home, '~/')).toBe('~/x.md')
  expect('/opt/x.md'.replace(home, '~/')).toBe('/opt/x.md')
})

test('Windows: the report opens with explorer, a project file only shows in Explorer, C:\\ paths are the project', async ($, on) => {
  const m = machine(on, { os: 'Windows_NT', missing: ['open', 'uname', 'xdg-open', 'mv'], top: 'D:/work/proj' })
  savedLedger(m.files, 'D:/work/proj', 'D:\\work\\proj\\src\\tool.py')
  m.files.set('D:/work/proj/src/tool.py', 'print(1)\n')
  await $.session.start({ cwd: 'D:\\work\\proj', surface: null, isInteractive: false })
  await $.tool.call(BRIEF)

  const r = await $.command.run({ command: 'board-report', args: '' })
  expect(r.text).toContain('D:/work/proj/.claude/tasks/2026-10-07-ship-the-board/report.html')
  expect(opened(m.runs)).toEqual([['explorer', 'D:\\work\\proj\\.claude\\tasks\\2026-10-07-ship-the-board\\report.html']])
  // explorer exits with 1 even when it worked: no false alarm
  expect(m.toasts).toEqual([])
  // the report names the file in the project, and the home folder never shows
  const report = m.files.get('D:/work/proj/.claude/tasks/2026-10-07-ship-the-board/report.html') ?? ''
  expect(report).toContain('src/tool.py')
  expect(report).not.toContain('файл вне репозитория')

  // a .py file runs on a double click in Windows: «Открыть» only selects it in Explorer
  await pressOpen($ as never, 'D:\\work\\proj\\src\\tool.py', m)
  expect(opened(m.runs)).toEqual([['explorer', '/select,', 'D:\\work\\proj\\src\\tool.py']])
  expect(m.toasts).toEqual([])
})

test('Windows: a brief over unbriefed work keeps its folder when there is no mv', async ($, on) => {
  const m = machine(on, { os: 'Windows_NT', missing: ['mv'] })
  savedLedger(m.files, 'D:/work/proj', 'D:\\work\\proj\\a.txt', 'Fix the port')
  await $.session.start({ cwd: 'D:\\work\\proj', surface: null, isInteractive: false })
  const r = await $.tool.call({ ...BRIEF, title: 'Fix the serial port' })
  expect(m.runs.some(x => x[0] === 'mv')).toBe(true)
  expect(r.text).toContain('D:/work/proj/.claude/tasks/2026-10-07-fix-the-port/task.md')
})

test('macOS keeps open and open -R', async ($, on) => {
  const m = machine(on, { uname: 'Darwin' })
  savedLedger(m.files, '/work/proj', '/work/proj/run.sh')
  m.files.set('/work/proj/run.sh', 'echo hi\n')
  await $.session.start({ cwd: '/work/proj', surface: null, isInteractive: false })
  await $.tool.call(BRIEF)
  await $.command.run({ command: 'board-report', args: '' })
  expect(opened(m.runs)).toEqual([['open', '/work/proj/.claude/tasks/2026-10-07-ship-the-board/report.html']])
  await pressOpen($ as never, '/work/proj/run.sh', m)
  expect(opened(m.runs)).toEqual([['open', '-R', '/work/proj/run.sh']])
})

test('Linux uses xdg-open; a machine without the command gets a toast, not an error', async ($, on) => {
  const m = machine(on, { uname: 'Linux' })
  await $.session.start({ cwd: '/srv/proj', surface: null, isInteractive: false })
  await $.tool.call(BRIEF)
  await $.command.run({ command: 'board-report', args: '' })
  expect(opened(m.runs)).toEqual([['xdg-open', '/srv/proj/.claude/tasks/2026-10-07-ship-the-board/report.html']])
  expect(m.toasts).toEqual([])
})

test('a missing open command shows a toast', async ($, on) => {
  const m = machine(on, { uname: 'Linux', missing: ['xdg-open'] })
  await $.session.start({ cwd: '/srv/proj', surface: null, isInteractive: false })
  await $.tool.call(BRIEF)
  await $.command.run({ command: 'board-report', args: '' })
  expect(m.toasts.some(t => t.startsWith('Не удалось открыть'))).toBe(true)
})
