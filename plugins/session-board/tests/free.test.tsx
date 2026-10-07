import { test, expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

// Free mode: no brief, no criteria, no acceptance; the board keeps the ideas and ends with a summary.
const PANE = {
  component: 'Pane' as const,
  requestId: 'board',
  props: { title: 'Доска сессии', isFocused: true, bodyColumns: 48, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 160 }, view: {} },
}
const BAND = { component: 'AbovePrompt' as const, props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 120, scroll: { offset: 0, bodyRows: 3 } } }
const BRIEF = {
  tool: 'mcp__session-board__task',
  title: 'Ship the board', title_ru: 'Выпустить доску',
  goal: 'The person sees the session at a glance', goal_ru: 'Человек видит сессию с одного взгляда',
  done_when: [{ en: 'Tests pass', ru: 'Тесты проходят' }, { en: 'The band shows the phase', ru: 'Полоса показывает фазу' }],
  authority: 'normal',
}
const idea = (input: Record<string, unknown>) => ({ tool: 'mcp__session-board__note', kind: 'idea', ...input })
const task = async ($: { tool: { call: (x: never) => Promise<{ text?: string }> } }) =>
  (await $.tool.call({ tool: 'mcp__session-board__ledger_read', section: 'task' } as never)).text ?? ''

/** A project folder in memory (git answers "not a repository" unless `git` answers), and the prompts Claude gets with their context. */
function project(on: On, git?: (argv: readonly string[]) => { exitCode: number; stdout: string } | undefined) {
  const files = new Map<string, string>()
  const prompts: { text: string; context: string }[] = []
  mock.clock(on, { now: Date.parse('2026-10-04T10:00:00Z') })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('command.register', async () => ({ value: undefined }) as never)
  on('tool.register', async () => ({ value: undefined }) as never)
  on('session.id', async () => ({ value: 'free-session' }))
  on('fs.exists', async (_$, e) => ({ value: files.has(e.path) || [...files.keys()].some(k => k.startsWith(`${e.path}/`)) }))
  on('fs.read', async (_$, e) => {
    const text = files.get(e.path)
    if (text === undefined) throw new Error(`no file ${e.path}`)
    return { value: text }
  })
  on('fs.write', async (_$, e) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  on('fs.list', async (_$, e) => {
    const names = new Map<string, 'file' | 'dir'>()
    for (const k of files.keys()) {
      if (!k.startsWith(`${e.path}/`)) continue
      const rest = k.slice(e.path.length + 1)
      names.set(rest.split('/')[0]!, rest.includes('/') ? 'dir' : 'file')
    }
    return { value: [...names].map(([name, kind]) => ({ name, kind })) } as never
  })
  on('process.run', async (_$, e) => ({ value: { stderr: '', ...(git?.(e.argv) ?? { exitCode: 1, stdout: '', stderr: 'not a git repository' }) } }) as never)
  on('prompt.submit', async (_$, e) => {
    prompts.push({ text: e.text, context: (e.context ?? []).join('\n') })
    return { text: e.text }
  })
  on('turn.complete', async (_$, e) => ({ text: e.answer }))
  return { files, prompts }
}

test('free mode pauses the task, keeps the ideas and ends with a summary in the folder', async ($, on) => {
  const p = project(on)
  await $.session.start({ cwd: '/proj', surface: null, isInteractive: false })

  // no task: the Task screen offers free mode next to a new task
  const empty = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  expect(await empty.find({ key: 'task-free' })).toBeDefined()
  await empty.unmount()

  await $.tool.call(BRIEF)
  await $.prompt.submit({ text: 'Старт', origin: { kind: 'composer' } })
  expect(await task($)).toContain('фаза: work')

  // a strict task in work: the switch on its Task screen pauses it
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui.press({ key: 'view-task' })
  expect(await ui.find({ text: /встанет на паузу/ })).toBeDefined()
  await ui.press({ key: 'task-free' })
  await ui.unmount()
  // the board's own message skips the board's prompt hook, so it carries the rules itself
  const sent = p.prompts.at(-1)!
  expect(sent.text).toContain('Свободный режим.')
  expect(sent.text).toContain('note: kind idea')
  expect(sent.text).toContain('Тулы task и submit не вызывай')
  expect(sent.text).toContain('Задача «Выпустить доску» на паузе')
  expect(await task($)).toContain('Свободный режим')
  await $.turn.complete({ answer: 'Давай.', durationMs: 1, isAborted: false, turnId: 'free-1', reason: 'answer' })
  // the person's next message carries the free-mode protocol
  await $.prompt.submit({ text: 'Давай придумаем, как показывать идеи', origin: { kind: 'composer' } })
  expect(p.prompts.at(-1)!.context).toContain('Free mode («Свободный режим») is on')
  expect(p.prompts.at(-1)!.context).toContain('do not call the task or submit tools')
  const paused = JSON.parse(p.files.get('/proj/.claude/tasks/2026-10-04-ship-the-board/ledger.json')!) as { task: { phase: string } }
  expect(paused.task.phase).toBe('work')

  await $.tool.call(idea({ title: 'Ideas as cards', title_ru: 'Идеи карточками', statement_ru: 'Каждая идея — строка со статусом.', status: 'kept' }))
  await $.tool.call(idea({ title: 'Kanban columns', title_ru: 'Колонки как в канбане', status: 'dropped', statement_ru: 'Не помещаются в узкую панель.' }))
  await $.tool.call(idea({ title: 'Voice notes', title_ru: 'Голосовые заметки', status: 'trying' }))
  expect((await $.tool.call({ tool: 'mcp__session-board__ledger_read' })).text).toContain('DROPPED IDEAS - do not offer again: I2 Kanban columns')

  // the Work screen shows the ideas instead of criteria; on both surfaces
  for (const surface of ['desktop', 'terminal'] as const) {
    const work = await $.ui.mount({ plugin: 'session-board', surface, ...PANE })
    expect(await work.find({ text: /Идеи/ })).toBeDefined()
    expect(await work.find({ text: /Идеи карточками/ })).toBeDefined()
    expect(await work.find({ text: /Не помещаются в узкую панель/ })).toBeDefined()
    expect(await work.find({ text: /Копится на приёмку/ })).toBeUndefined()
    expect(await work.find({ key: 'free-wrap' })).toBeDefined()
    await work.press({ key: 'view-review' })
    expect(await work.find({ text: /Итог ещё не подведён/ })).toBeDefined()
    await work.unmount()
  }
  const band = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...BAND })
  expect(await band.find({ text: /свободный режим · идей 3 · оставили 1/ })).toBeDefined()
  expect(await band.find({ text: /Подвести итог/ })).toBeDefined()
  await band.unmount()

  // «Итог» typed in the chat sends the summary request
  await $.prompt.submit({ text: 'Итог', origin: { kind: 'composer' } })
  expect(p.prompts.at(-1)!.text).toContain('Подведи итог свободной сессии')

  const done = await $.tool.call({ tool: 'mcp__session-board__submit', summary_ru: 'Нашли, как показывать идеи.', next: ['Сделать голосовые заметки'] })
  expect(done.text).toContain('Summary recorded in /proj/.claude/tasks/2026-10-04-free-session/summary.md')
  const summary = p.files.get('/proj/.claude/tasks/2026-10-04-free-session/summary.md')!
  expect(summary).toContain('Нашли, как показывать идеи.')
  expect(summary).toMatch(/## Оставили\n\n- Идеи карточками/)
  expect(summary).toMatch(/## Отбросили\n\n- Колонки как в канбане — Не помещаются в узкую панель\./)
  expect(summary).toMatch(/## Не решили\n\n- Голосовые заметки/)
  expect(summary).toContain('- Сделать голосовые заметки')

  // the summary screen; then the paused task comes back
  const end = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  expect(await end.find({ key: 'view-review', text: 'Итог' })).toBeDefined()
  expect(await end.find({ text: /Нашли, как показывать идеи/ })).toBeDefined()
  await end.press({ key: 'view-task' })
  expect(await end.find({ text: /Выпустить доску/ })).toBeDefined()
  // the switch the board sent earlier is answered: the button is back, not stuck on «отправлено»
  expect(await end.find({ key: 'task-free', text: 'Новый свободный режим' })).toBeDefined()
  await end.press({ key: 'ot-go-0' })
  await end.unmount()
  const back = await task($)
  expect(back).toContain('Выпустить доску')
  expect(back).toContain('фаза: work')
})

test('from a phone: «Свободный режим» and «Итог» in the chat, the text card, a brief out of free mode', async ($, on) => {
  const p = project(on)
  const BRIDGE = { kind: 'bridge' as const }
  // a longer sentence does not switch
  await $.prompt.submit({ text: 'Свободный режим включим потом', origin: BRIDGE })
  expect(await task($)).toBe('No task brief yet.')

  await $.prompt.submit({ text: 'Свободный режим', origin: BRIDGE })
  expect(await task($)).toContain('фаза: work')
  // Claude gets the button's message, not the bare word
  expect(p.prompts.at(-1)!.text).toContain('Задания, критериев и приёмки нет')

  await $.tool.call(idea({ title: 'Ideas as cards', title_ru: 'Идеи карточками', status: 'kept' }))
  const card = await $.command.run({ command: 'board', args: '', origin: BRIDGE, presentation: { isFullscreen: false, columns: 60 } })
  expect(card.text).toContain('Итог ещё не подведён')
  expect(card.text).toMatch(/## Оставили\n\n- Идеи карточками/)
  expect(card.text).toContain('Напишите «Итог»')

  // a second «Свободный режим» during free work changes nothing
  await $.prompt.submit({ text: 'Свободный режим', origin: BRIDGE })
  expect(p.prompts.at(-1)!.text).toBe('Свободный режим')

  // a new brief out of free mode starts a strict task
  await $.tool.call(BRIEF)
  const t = await task($)
  expect(t).toContain('Выпустить доску')
  expect(t).toContain('фаза: intake')
  // «Итог» outside free mode is a plain message
  await $.prompt.submit({ text: 'Итог', origin: BRIDGE })
  expect(p.prompts.at(-1)!.text).toBe('Итог')
})

test('a policy that git tracks behind a symlinked .claude is refused, and the session pointer stays out of git', async ($, on) => {
  // git asked from .claude/tasks itself (a symlink or a submodule) knows the file; asked from the project it does not
  const p = project(on, argv => (argv.join(' ') === 'git -C /proj/.claude/tasks ls-files -- policy.json' ? { exitCode: 0, stdout: 'policy.json\n' } : undefined))
  p.files.set('/proj/.claude/tasks/policy.json', JSON.stringify({ authority: 'bold' }))
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  await $.session.start({ cwd: '/proj', surface: null, isInteractive: false })
  expect(toasts.join('\n')).toContain('не применяет policy.json')

  await $.tool.call(BRIEF)
  expect(p.files.get('/proj/.claude/session-board/.gitignore')).toContain('*')
  expect(p.files.get('/proj/.claude/session-board/free-session/task.json')).toContain('/proj/.claude/tasks/')
})
