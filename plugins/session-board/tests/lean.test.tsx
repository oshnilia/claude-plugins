import { test, expect, type Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { emptyLedger, applyOps } from '../hooks/ledger'
import { leanLineLevel, parseDebt } from '../hooks/lean'
import { boardText } from '../hooks/remote'
import { renderReport } from '../hooks/report'

// The lean plugin in the board's pipeline: the level in the brief, the self-check at hand-in, «Не построено» at
// Acceptance and in the report, the project's shortcuts. Without lean's session-start line none of it shows.

const PANE = {
  component: 'Pane' as const,
  requestId: 'board',
  props: { title: 'Доска сессии', isFocused: true, bodyColumns: 60, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 200 }, view: {} },
}

const BRIEF = {
  tool: 'mcp__session-board__task',
  title: 'Slugs for posts', title_ru: 'Слаги для постов',
  goal: 'Posts get readable URLs', goal_ru: 'У постов читаемые адреса',
  done_when: [{ en: 'slugify works', ru: 'slugify работает' }, { en: 'A test passes', ru: 'Тест проходит' }],
  authority: 'normal',
}

const note = (input: Record<string, unknown>) => ({ tool: 'mcp__session-board__note', ...input })
const task = async ($: Engine) => (await $.tool.call({ tool: 'mcp__session-board__ledger_read', section: 'task' })).text ?? ''

/** lean's hook output, as it reaches the session at start. */
async function leanOn($: Engine, level = 'full') {
  try {
    await $.session.append({ message: { type: 'user', content: [{ type: 'text', text: `SessionStart:startup hook success: lean is on. Level: ${level}. If mcp__session-board__note is in your tools…` }] } })
  } catch {
    // the test kit stores no rows; the board's hook has already read the line
  }
}

/** Beneath the plugin: the prompts Claude gets, and git grep answering for the project. */
function engine(on: On, grep = '') {
  const prompts: string[] = []
  on('prompt.submit', async (_$, e) => {
    prompts.push(e.text)
    return { text: e.text }
  })
  on('session.cwd', async () => ({ value: '/work/project' }) as never)
  on('process.run', async (_$, e) => ({
    value: e.argv.includes('grep') ? { exitCode: grep ? 0 : 1, stdout: grep, stderr: '' } : { exitCode: 1, stdout: '', stderr: '' },
  }) as never)
  return { prompts }
}

/** A handed-in task with one item of each lean kind, as Claude records them during the work and at hand-in. */
async function handIn($: Engine) {
  await $.tool.call(BRIEF)
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui.press({ key: 'task-start' })
  await ui.unmount()
  await $.tool.call(note({ kind: 'decision', title: 'Took the stdlib regex', title_ru: 'Взял regex из стандартной библиотеки' }))
  await $.tool.call(note({ kind: 'decision', tag: 'skipped', title: 'Skipped: transliteration', title_ru: 'Пропущено: транслитерация кириллицы', statement: 'Add when titles come in Russian.', statement_ru: 'Добавить, когда появятся заголовки на русском.' }))
  await $.tool.call(note({ kind: 'decision', tag: 'shortcut', title: 'Shortcut: no length limit', title_ru: 'Срезано: нет предела длины', statement_ru: 'Добавить, когда адреса упрутся в предел.', evidence: ['slug.py:6'] }))
  await $.tool.call(note({ kind: 'finding', tag: 'cut', title: 'Unused SlugConfig class', title_ru: 'Лишний класс SlugConfig', statement_ru: 'Удалить: настройка ни разу не меняется.', evidence: ['slug.py:12-20'] }))
  await $.tool.call({ tool: 'mcp__session-board__submit', summary_ru: 'Слаги работают.', criteria: [{ id: 'K1', status: 'proven', result_ru: 'Да.' }, { id: 'K2', status: 'proven', result_ru: 'Да.' }], lean_check: 'Нашёл одно лишнее место, оно в списке.' })
}

test('without lean the board shows nothing of it', async ($, on) => {
  engine(on, 'src/a.py:2\n')
  await $.tool.call(BRIEF)
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ plugin: 'session-board', surface, ...PANE })
    expect(await ui.find({ key: 'auth-normal' })).toBeDefined()
    expect(await ui.find({ key: 'code-full' })).toBeUndefined()
    expect(await ui.find({ text: /код:/ })).toBeUndefined()
    expect(await ui.find({ text: /Срезанные углы/ })).toBeUndefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui.press({ key: 'task-start' })
  await ui.unmount()
  expect(await task($)).not.toContain('Код:')
  await $.tool.call({ tool: 'mcp__session-board__submit', summary_ru: 'Готово.', criteria: [{ id: 'K1', status: 'proven', result_ru: 'Да.' }] })
  const rv = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  expect(await rv.find({ text: /Что проверено/ })).toBeDefined()
  expect(await rv.find({ text: /Не построено/ })).toBeUndefined()
  expect(await rv.find({ key: 'lean-review' })).toBeUndefined()
  await rv.unmount()
})

test('intake: the brief carries a code level and Start passes it to Claude', async ($, on) => {
  const { prompts } = engine(on)
  await leanOn($, 'full')
  await $.tool.call(BRIEF)
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ plugin: 'session-board', surface, ...PANE })
    // lean's own level until the person picks one
    expect(await ui.find({ text: /код: full/ })).toBeDefined()
    expect(await ui.find({ text: /Как в настройках lean/ })).toBeDefined()
    expect(await ui.find({ key: 'code-ultra' })).toBeDefined()
    expect(await ui.find({ key: 'code-off' })).toBeDefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui.press({ key: 'code-ultra' })
  expect(await ui.find({ text: /код: ultra/ })).toBeDefined()
  expect(await ui.find({ text: /Как в настройках lean/ })).toBeUndefined()
  expect(await ui.find({ text: /сначала удаляет, потом добавляет/ })).toBeDefined()
  await ui.press({ key: 'task-start' })
  await ui.unmount()
  expect(await task($)).toContain('## Код: lean ultra')
  expect(prompts.at(-1)).toContain('Старт по заданию «Слаги для постов»')
  expect(prompts.at(-1)).toContain('Код: lean ultra — сначала удаляет')
  // a change during the work reaches Claude as a board note
  const ui2 = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui2.press({ key: 'view-task' })
  await ui2.press({ key: 'code-lite' })
  expect(await ui2.find({ text: /заметок: 1/ })).toBeDefined()
  await ui2.unmount()
})

test('a resumed session finds lean in the conversation with the first message', async ($, on) => {
  engine(on)
  // a resume brings no new line from lean's hook: the line sits in the saved conversation
  on('session.messages', async () => ({
    value: [{ role: 'user', content: [{ type: 'text', text: '<system-reminder>SessionStart:startup hook success: lean is on. Level: lite. If …</system-reminder>' }] }],
  }) as never)
  await $.tool.call(BRIEF)
  const before = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  expect(await before.find({ key: 'code-lite' })).toBeUndefined()
  await before.unmount()
  try {
    await $.prompt.submit({ text: 'Поехали дальше', wait: true, origin: { kind: 'composer' } })
  } catch {
    // no model answers in the test kit; the hook has already run
  }
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  expect(await ui.find({ text: /код: lite/ })).toBeDefined()
  await ui.unmount()
})

test('acceptance: «Не построено» lists lean items and a mark becomes a fix', async ($, on) => {
  const { prompts } = engine(on)
  await leanOn($)
  await handIn($)
  for (const surface of ['desktop', 'terminal'] as const) {
    const rv = await $.ui.mount({ plugin: 'session-board', surface, ...PANE })
    expect(await rv.find({ text: /Не построено/ })).toBeDefined()
    expect(await rv.find({ text: /Пропущено: транслитерация кириллицы/ })).toBeDefined()
    expect(await rv.find({ text: /Добавить, когда появятся заголовки на русском\./ })).toBeDefined()
    expect(await rv.find({ text: /Срезано: нет предела длины/ })).toBeDefined()
    // a statement given only in Russian still shows
    expect(await rv.find({ text: /Добавить, когда адреса упрутся в предел\./ })).toBeDefined()
    expect(await rv.find({ text: /Лишний класс SlugConfig/ })).toBeDefined()
    expect(await rv.find({ text: /Самопроверка на лишнее: Нашёл одно лишнее место/ })).toBeDefined()
    // lean's items are not repeated among Claude's own decisions
    expect(await rv.find({ text: /Claude решил сам/ })).toBeDefined()
    expect(await rv.find({ key: 'rv-D1' })).toBeDefined()
    expect((await rv.findAll({ key: 'rv-D2' })).length).toBe(1)
    expect((await rv.find({ key: 'v-no-D2' }))?.text).toContain('добавить сейчас')
    expect((await rv.find({ key: 'v-no-D3' }))?.text).toContain('сделать полностью')
    expect((await rv.find({ key: 'v-no-F1' }))?.text).toContain('убрать')
    expect(await rv.find({ key: 'lean-review' })).toBeDefined()
    await rv.unmount()
  }
  const rv = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  // the shortcut's file and line wait under a toggle
  expect(await rv.find({ text: /slug\.py:6/ })).toBeUndefined()
  await rv.press({ key: 'ev-D3' })
  expect(await rv.find({ text: /slug\.py:6/ })).toBeDefined()
  await rv.press({ key: 'v-no-D2' })
  await rv.press({ key: 'v-no-F1' })
  expect(await rv.find({ key: 'v-fixes' })).toBeDefined()
  await rv.press({ key: 'v-return' })
  await rv.unmount()
  const verdict = prompts.at(-1) ?? ''
  expect(verdict).toContain('Добавь сейчас то, что ты пропустил:')
  expect(verdict).toContain('D2 Пропущено: транслитерация кириллицы')
  expect(verdict).toContain('Убери лишнее, что нашла проверка:')
  expect(verdict).toContain('F1 Лишний класс SlugConfig')
  expect(verdict).not.toContain('Отмени эти решения')
})

test('«Проверить на лишнее» asks Claude to record cuts without touching the code', async ($, on) => {
  const { prompts } = engine(on)
  await leanOn($)
  await $.tool.call(BRIEF)
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui.press({ key: 'task-start' })
  await ui.unmount()
  await $.tool.call({ tool: 'mcp__session-board__submit', summary_ru: 'Готово.', criteria: [{ id: 'K1', status: 'proven', result_ru: 'Да.' }] })
  const rv = await $.ui.mount({ plugin: 'session-board', surface: 'terminal', ...PANE })
  expect(await rv.find({ text: /Claude ничего не пропустил и не срезал/ })).toBeDefined()
  // no self-check in the hand-in: the person sees that it is missing
  expect(await rv.find({ text: /Самопроверки на лишнее в сдаче нет/ })).toBeDefined()
  await rv.press({ key: 'lean-review' })
  expect(await rv.find({ key: 'lean-review' })).toBeUndefined()
  expect(await rv.find({ text: /отправлено, Claude отвечает/ })).toBeDefined()
  await rv.unmount()
  expect(prompts.at(-1)).toContain('lean-review')
  expect(prompts.at(-1)).toContain('tag cut')
  expect(prompts.at(-1)).toContain('Код не меняй')
})

test('the work screen counts what was not built, and a note keeps its tag', async ($, on) => {
  engine(on)
  await leanOn($)
  await $.tool.call(BRIEF)
  await $.tool.call(note({ kind: 'decision', tag: 'skipped', title: 'Skipped: transliteration', title_ru: 'Пропущено: транслитерация' }))
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui.press({ key: 'view-work' })
  expect(await ui.find({ text: /не построено 1/ })).toBeDefined()
  await ui.unmount()
  const D1 = JSON.parse((await $.tool.call({ tool: 'mcp__session-board__ledger_read', id: 'D1' })).text ?? '{}') as { node: { tag?: string } }
  expect(D1.node.tag).toBe('skipped')
})

test('the project counter shows the `lean:` shortcuts git finds', async ($, on) => {
  const { prompts } = engine(on, 'src/rates.py:2\nsrc/slug.ts:1\n')
  await leanOn($)
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ plugin: 'session-board', surface, ...PANE })
    expect(await ui.find({ text: /Срезанные углы в проекте/ })).toBeDefined()
    expect(await ui.find({ text: /Меток lean: 3 в файлах: 2/ })).toBeDefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui.press({ key: 'debt-list' })
  await ui.unmount()
  expect(prompts.at(-1)).toContain('lean-debt')
  await $.tool.call(BRIEF)
  const ui2 = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  expect(await ui2.find({ text: /Меток lean: 3 в файлах: 2/ })).toBeDefined()
  await ui2.unmount()
})

test('report, phone card and the parsers', async () => {
  let L = emptyLedger('s1')
  L = applyOps(L, [
    { op: 'add', kind: 'goal', title: { en: 'Slugs', ru: 'Слаги' } },
    { op: 'add', kind: 'decision', title: { en: 'Regex', ru: 'Взял regex' }, by: 'claude' },
    { op: 'add', kind: 'decision', tag: 'skipped', title: { en: 'Skipped: transliteration', ru: 'Пропущено: транслитерация' }, statement: { en: 'Add when titles are Russian.', ru: 'Добавить, когда будут русские заголовки.' } },
    { op: 'add', kind: 'finding', tag: 'cut', title: { en: 'Unused class', ru: 'Лишний класс' }, evidence: [{ ref: 'slug.py:12', type: 'code' }] },
  ], 1, 'claude').ledger
  L = { ...L, task: {
    title: { en: 'Slugs', ru: 'Слаги' }, goal: { en: '', ru: '' }, result: { en: '', ru: '' }, outOfScope: [], materials: [], authority: 'normal', code: 'ultra',
    dir: '', created: '', phase: 'review', round: 1, formal: true,
    submitted: { at: '', round: 1, summary: { en: '', ru: 'Готово.' }, verify: [], notDone: [], next: [], leanCheck: 'Нашёл одно место.' },
  } }
  const html = renderReport(L, { stat: '', files: [] }, new Date(0).toISOString())
  expect(html).toContain('Что не построено и когда добавить')
  expect(html).toContain('Добавить, когда будут русские заголовки.')
  expect(html).toContain('slug.py:12')
  expect(html).toContain('Самопроверка на лишнее: Нашёл одно место.')
  // lean's items are not forks of the route
  const forks = html.slice(html.indexOf('id="forks"'), html.indexOf('id="checked"'))
  expect(forks).toContain('Взял regex')
  expect(forks).not.toContain('Пропущено: транслитерация')
  expect(boardText(L)).toContain('**Не построено** · 2')
  expect(boardText(L)).toContain('Самопроверка на лишнее: Нашёл одно место.')
  expect(boardText(L)).toContain('пропущено: Пропущено: транслитерация — Добавить, когда будут русские заголовки.')

  expect(leanLineLevel('SessionStart:startup hook success: lean is on. Level: ultra. If …')).toBe('ultra')
  expect(leanLineLevel('the user wrote: lean is off')).toBeNull()
  expect(parseDebt('a.py:2\nsrc/b.ts:1\n')).toEqual({ markers: 3, files: 2 })
  expect(parseDebt('')).toEqual({ markers: 0, files: 0 })
})
