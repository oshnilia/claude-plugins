import { test, expect } from 'claude-code/testing'

const PANE = {
  component: 'Pane' as const,
  requestId: 'board',
  props: { title: 'Доска сессии', isFocused: true, bodyColumns: 48, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 120 }, view: {} },
}

const BAND = { component: 'AbovePrompt' as const, props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 120, scroll: { offset: 0, bodyRows: 3 } } }

const note = (input: Record<string, unknown>) => ({ tool: 'mcp__session-board__note', ...input })

const BRIEF = {
  tool: 'mcp__session-board__task',
  title: 'Ship the board', title_ru: 'Выпустить доску',
  goal: 'The person sees the session at a glance', goal_ru: 'Человек видит сессию с одного взгляда',
  result: 'A mod in the marketplace', result_ru: 'Мод в маркетплейсе',
  done_when: [{ en: 'Tests pass', ru: 'Тесты проходят' }, { en: 'The band shows the phase', ru: 'Полоса показывает фазу' }],
  rules: [{ en: 'Native mod elements first', ru: 'Сначала родные элементы модов' }],
  out_of_scope: ['видео'],
  authority: 'normal',
}

test('the views draw real ledger content and their actions', async $ => {
  await $.tool.call(note({ kind: 'goal', title: 'Ship the board', title_ru: 'Выпустить доску' }))
  await $.tool.call(note({ kind: 'task', parent: 'G1', title: 'Spike', title_ru: 'Проверить элементы', status: 'done' }))
  await $.tool.call(note({ kind: 'task', parent: 'G1', title: 'Design views', title_ru: 'Нарисовать виды', status: 'doing' }))
  await $.tool.call(note({ kind: 'question', parent: 'G1', title: 'What to draw with?', title_ru: 'Чем рисовать доску?' }))
  await $.tool.call(note({ kind: 'hypothesis', parent: 'Q1', title: 'Svg tree', title_ru: 'Svg-дерево', status: 'refuted', statement: 'Too small.', statement_ru: 'Слишком мелко.' }))
  await $.tool.call(note({ kind: 'decision', parent: 'Q1', title: 'Native widgets', title_ru: 'Родные виджеты' }))
  await $.tool.call(note({ kind: 'open', parent: 'G1', title: 'Publish now?', title_ru: 'Публиковать сейчас?' }))
  const brief = await $.tool.call({ tool: 'mcp__session-board__ledger_read' })
  expect(brief.text).toContain('DEAD ENDS - do not retry: H1 Svg tree')

  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  // no task yet: the board opens on the Task screen with the template
  expect(await ui.find({ text: /Задания нет/ })).toBeDefined()
  expect(await ui.find({ key: 'task-new' })).toBeDefined()
  expect(await ui.find({ key: 'auth-normal' })).toBeDefined()

  await ui.press({ key: 'view-work' })
  expect(await ui.find({ text: /Нужен ты/ })).toBeDefined()
  expect(await ui.find({ text: /Публиковать сейчас\?/ })).toBeDefined()
  expect(await ui.find({ text: /1 из 2/ })).toBeDefined()
  expect(await ui.find({ text: /Нарисовать виды/ })).toBeDefined()
  await ui.press({ key: 'ansb-O1' })
  expect(await ui.find({ key: 'ans-O1' })).toBeDefined()

  await ui.press({ key: 'view-log' })
  expect(await ui.find({ text: /Чем рисовать доску\?/ })).toBeDefined()
  expect(await ui.find({ text: /Слишком мелко\./ })).toBeDefined()
  expect(await ui.find({ key: 'decw-D1' })).toBeDefined()
  await ui.press({ key: 'log-log-turns' })
  expect(await ui.find({ text: /Ходов пока нет/ })).toBeDefined()
  await ui.press({ key: 'log-log-memory' })
  expect(await ui.find({ text: /Тупики — не повторять/ })).toBeDefined()
  await ui.press({ key: 'stale-D1' })
  expect(await ui.find({ text: /заметок: 1/ })).toBeDefined()

  await ui.press({ key: 'view-ask' })
  expect(await ui.find({ key: 'ask-input' })).toBeDefined()
  expect(await ui.find({ key: 'quick-1' })).toBeDefined()
  await ui.unmount()

  const term = await $.ui.mount({ plugin: 'session-board', surface: 'terminal', ...PANE })
  await term.press({ key: 'view-log' })
  expect(await term.find({ text: /Родные виджеты/ })).toBeDefined()
  await term.press({ key: 'view-work' })
  expect(await term.find({ text: /Выпустить доску/ })).toBeDefined()
  await term.unmount()
})

test('intake, start, hand-in and a returned verdict', async $ => {
  const recorded = await $.tool.call(BRIEF)
  expect(recorded.text).toContain('Task brief recorded')

  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  // the brief waits for Start
  expect(await ui.find({ text: /Выпустить доску/ })).toBeDefined()
  expect(await ui.find({ text: /Полоса показывает фазу/ })).toBeDefined()
  expect(await ui.find({ text: /Сначала родные элементы модов/ })).toBeDefined()
  expect(await ui.find({ key: 'task-start' })).toBeDefined()
  await ui.unmount()

  const band = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...BAND })
  expect(await band.find({ text: /Проверить и начать/ })).toBeDefined()
  await band.unmount()

  const ui2 = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui2.press({ key: 'task-start' })
  await ui2.unmount()
  expect((await $.tool.call({ tool: 'mcp__session-board__ledger_read', section: 'task' })).text).toContain('фаза: work')

  const handed = await $.tool.call({
    tool: 'mcp__session-board__submit',
    summary_ru: 'Доска работает, полоса показывает фазу.',
    criteria: [
      { id: 'K1', status: 'proven', result_ru: 'Да: все тесты проходят.', evidence: ['claude plugin test: 8 pass'] },
      { id: 'K2', status: 'failed', result_ru: 'Нет: без задачи полоса пустая.' },
    ],
    for_you: ['Открой доску и посмотри на полосу'],
    verify: ['claude plugin test .'],
    not_done: ['видео'],
  })
  expect(handed.text).toContain('Handed in for review')

  const rv = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  // the verdict, what the person must do and one plain sentence per item; the technical proof waits under a toggle
  expect(await rv.find({ text: /Готово 1 из 2 · не вышло: 1/ })).toBeDefined()
  expect(await rv.find({ text: /Доска работает/ })).toBeDefined()
  expect(await rv.find({ text: /Открой доску и посмотри на полосу/ })).toBeDefined()
  expect(await rv.find({ text: /Да: все тесты проходят\./ })).toBeDefined()
  expect(await rv.find({ text: /8 pass/ })).toBeUndefined()
  await rv.press({ key: 'ev-K1' })
  expect(await rv.find({ text: /claude plugin test: 8 pass/ })).toBeDefined()
  expect(await rv.find({ key: 'v-ok-K1' })).toBeUndefined()
  expect(await rv.find({ key: 'v-accept' })).toBeDefined()
  // no fixes yet: "accept with fixes" would send an empty list
  expect(await rv.find({ key: 'v-fixes' })).toBeUndefined()
  await rv.press({ key: 'v-no-K2' })
  expect(await rv.find({ key: 'v-fixes' })).toBeDefined()
  await rv.press({ key: 'v-c-K2' })
  // a remark being typed holds the verdict back
  expect(await rv.find({ key: 'v-accept' })).toBeUndefined()
  await $.ui.input({ plugin: 'session-board', key: 'cf-K2-in', text: 'полоса пустая без задачи' })
  expect(await rv.find({ key: 'v-accept' })).toBeDefined()
  expect(await rv.find({ text: /твой комментарий: полоса пустая без задачи/ })).toBeDefined()
  await rv.press({ key: 'rule-0' })
  expect(await rv.find({ text: /станет правилом проекта/ })).toBeDefined()
  await rv.unmount()

  // drafted fixes: the band leads to the Acceptance screen instead of accepting
  const band2 = await $.ui.mount({ plugin: 'session-board', surface: 'terminal', ...BAND })
  expect(await band2.find({ text: /Отправить приёмку · правок 2/ })).toBeDefined()
  await band2.unmount()

  const rv2 = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await rv2.press({ key: 'v-return' })
  await rv2.unmount()
  const after = await $.tool.call({ tool: 'mcp__session-board__ledger_read', section: 'task' })
  expect(after.text).toContain('раунд 2')
  expect(after.text).toContain('фаза: work')
  expect((await $.tool.call({ tool: 'mcp__session-board__ledger_read', id: 'K2' })).text).toContain('"failed"')
  expect((await $.tool.call({ tool: 'mcp__session-board__ledger_read', section: 'constraints' })).text).toContain('полоса пустая без задачи')
})

test('the band shows one state and one action', async $ => {
  for (const surface of ['desktop', 'terminal'] as const) {
    const band = await $.ui.mount({ plugin: 'session-board', surface, ...BAND })
    expect(await band.find({ text: /задания нет/ })).toBeDefined()
    expect(await band.find({ key: 'band-main' })).toBeDefined()
    expect(await band.find({ key: 'band-open' })).toBeDefined()
    await band.unmount()
  }
  await $.tool.call(note({ kind: 'goal', title: 'Ship', title_ru: 'Выпустить доску' }))
  await $.tool.call(note({ kind: 'open', parent: 'G1', title: 'Publish?', title_ru: 'Публиковать?' }))
  const band = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...BAND })
  expect(await band.find({ text: /нужен ты · 1/ })).toBeDefined()
  await band.unmount()
})

test('a chat message takes the open question cards down', async $ => {
  await $.tool.call(note({ kind: 'goal', title: 'Ship the board', title_ru: 'Выпустить доску' }))
  await $.tool.call(note({ kind: 'open', parent: 'G1', title: 'Publish now?', title_ru: 'Публиковать сейчас?' }))
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui.press({ key: 'view-work' })
  expect(await ui.find({ text: /Публиковать сейчас\?/ })).toBeDefined()
  try {
    await $.prompt.submit({ text: 'Да, публикуй', wait: true, origin: { kind: 'composer' } })
  } catch {
    // no model answers in the test kit; the hook has already run
  }
  expect(await ui.find({ text: /Публиковать сейчас\?/ })).toBeUndefined()
  const brief = await $.tool.call({ tool: 'mcp__session-board__ledger_read', id: 'O1' })
  expect(brief.text).toContain('pending')
})

test('a board message button waits until Claude answers it', async $ => {
  await $.tool.call(note({ kind: 'goal', title: 'Ship', title_ru: 'Выпустить доску' }))
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui.press({ key: 'task-formal' })
  expect(await ui.find({ key: 'task-formal' })).toBeUndefined()
  expect(await ui.find({ text: /отправлено, Claude отвечает/ })).toBeDefined()
  await ui.unmount()
})

test('an English-only update keeps the Russian title on the board', async $ => {
  await $.tool.call(note({ kind: 'goal', title: 'Ship the board', title_ru: 'Выпустить доску' }))
  await $.tool.call(note({ id: 'G1', title: 'Ship board v2' }))
  const g = JSON.parse((await $.tool.call({ tool: 'mcp__session-board__ledger_read', id: 'G1' })).text) as { node: { title: { en: string; ru: string } } }
  expect(g.node.title.en).toBe('Ship board v2')
  expect(g.node.title.ru).toBe('Выпустить доску')
})

test('the band accepts the work in one press when there are no fixes', async $ => {
  await $.tool.call(BRIEF)
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui.press({ key: 'task-start' })
  await ui.unmount()
  await $.tool.call({ tool: 'mcp__session-board__submit', summary_ru: 'Готово.', criteria: [{ id: 'K1', status: 'proven', result_ru: 'Да.' }, { id: 'K2', status: 'proven', result_ru: 'Да.' }] })
  const band = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...BAND })
  expect(await band.find({ text: /Принять работу/ })).toBeDefined()
  expect(await band.find({ key: 'band-review' })).toBeDefined()
  try {
    await band.press({ key: 'band-main' })
  } catch {
    // no model answers the verdict message in the test kit; the accept has already run
  }
  await band.unmount()
  expect((await $.tool.call({ tool: 'mcp__session-board__ledger_read', section: 'task' })).text).toContain('фаза: accepted')
})

test('a long answer shows the format ladder; a press sends the request and takes it down', async ($, on) => {
  const asked: string[] = []
  on('prompt.submit', async (_$, e) => {
    asked.push(e.text)
    return { text: e.text }
  })
  on('turn.complete', async (_$, e) => ({ text: e.answer }))
  const long = Array.from({ length: 130 }, (_, i) => `word${i}`).join(' ')
  for (const surface of ['desktop', 'terminal'] as const) {
    await $.turn.complete({ answer: long, durationMs: 1, isAborted: false, turnId: `t-${surface}`, reason: 'answer' })
    const band = await $.ui.mount({ plugin: 'session-board', surface, ...BAND })
    expect(await band.find({ text: /показать иначе/ })).toBeDefined()
    expect(await band.find({ key: 'ladder-ste' })).toBeDefined()
    expect(await band.find({ key: 'ladder-diagram' })).toBeDefined()
    expect(await band.find({ key: 'ladder-animate' })).toBeDefined()
    await band.press({ key: 'ladder-html' })
    expect(await band.find({ key: 'ladder-html' })).toBeUndefined()
    // the state line of the band stays
    expect(await band.find({ key: 'band-open' })).toBeDefined()
    await band.unmount()
  }
  expect(asked.length).toBe(2)
  expect(asked[0]).toContain('HTML-страницу')

  // a short answer, an interrupted turn and code-only output show no ladder
  const code = '```\n' + long + '\n```'
  for (const end of [
    { answer: 'Порт 443.', isAborted: false, reason: 'answer' as const },
    { answer: long, isAborted: true, reason: 'aborted' as const },
    { answer: code, isAborted: false, reason: 'answer' as const },
  ]) {
    await $.turn.complete({ ...end, durationMs: 1, turnId: 'short' })
    const band = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...BAND })
    expect(await band.find({ key: 'ladder-html' })).toBeUndefined()
    await band.unmount()
  }

  // a new message from the person takes the ladder down
  await $.turn.complete({ answer: long, durationMs: 1, isAborted: false, turnId: 'again', reason: 'answer' })
  await $.prompt.submit({ text: 'Спасибо', origin: { kind: 'composer' } })
  const band = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...BAND })
  expect(await band.find({ key: 'ladder-html' })).toBeUndefined()
  await band.unmount()
})
