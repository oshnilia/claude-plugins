import { test, expect } from 'claude-code/testing'

const PANE = {
  component: 'Pane' as const,
  requestId: 'board',
  props: { title: 'Доска сессии', isFocused: true, bodyColumns: 48, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 80 }, view: {} },
}

const note = (input: Record<string, unknown>) => ({ tool: 'mcp__session-board__note', ...input })

test('the four views draw real ledger content and their actions', async $ => {
  expect((await $.tool.call(note({ kind: 'goal', title: 'Ship the board', title_ru: 'Выпустить доску' }))).text).toBe('Recorded G1.')
  await $.tool.call(note({ kind: 'task', parent: 'G1', title: 'Spike', title_ru: 'Проверить элементы', status: 'done' }))
  await $.tool.call(note({ kind: 'task', parent: 'G1', title: 'Design views', title_ru: 'Нарисовать виды', status: 'doing' }))
  await $.tool.call(note({ kind: 'question', parent: 'G1', title: 'What to draw with?', title_ru: 'Чем рисовать доску?' }))
  await $.tool.call(note({ kind: 'hypothesis', parent: 'Q1', title: 'Svg tree', title_ru: 'Svg-дерево', status: 'refuted', statement: 'Too small.', statement_ru: 'Слишком мелко.' }))
  await $.tool.call(note({ kind: 'decision', parent: 'Q1', title: 'Native widgets', title_ru: 'Родные виджеты' }))
  await $.tool.call(note({ kind: 'open', parent: 'G1', title: 'Publish now?', title_ru: 'Публиковать сейчас?' }))
  const brief = await $.tool.call({ tool: 'mcp__session-board__ledger_read' })
  expect(brief.text).toContain('DEAD ENDS - do not retry: H1 Svg tree')

  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'desktop', ...PANE })
  await ui.press({ key: 'view-now' })
  expect(await ui.find({ text: /Нужен ты/ })).toBeDefined()
  expect(await ui.find({ text: /Публиковать сейчас\?/ })).toBeDefined()
  expect(await ui.find({ text: /1 из 2/ })).toBeDefined()
  expect(await ui.find({ text: /Нарисовать виды/ })).toBeDefined()
  await ui.press({ key: 'ansb-O1' })
  expect(await ui.find({ key: 'ans-O1' })).toBeDefined()

  await ui.press({ key: 'view-why' })
  expect(await ui.find({ text: /Чем рисовать доску\?/ })).toBeDefined()
  expect(await ui.find({ text: /Слишком мелко\./ })).toBeDefined()
  expect(await ui.find({ key: 'decw-D1' })).toBeDefined()

  await ui.press({ key: 'view-history' })
  expect(await ui.find({ text: /Ходов пока нет/ })).toBeDefined()

  await ui.press({ key: 'view-ask' })
  expect(await ui.find({ key: 'ask-input' })).toBeDefined()
  expect(await ui.find({ key: 'quick-1' })).toBeDefined()
  await ui.unmount()

  const term = await $.ui.mount({ plugin: 'session-board', surface: 'terminal', ...PANE })
  await term.press({ key: 'view-why' })
  expect(await term.find({ text: /Родные виджеты/ })).toBeDefined()
  await term.press({ key: 'view-now' })
  expect(await term.find({ text: /Выпустить доску/ })).toBeDefined()
  await term.unmount()
})

test('the band shows the current step, metrics and buttons', async $ => {
  await $.tool.call(note({ kind: 'goal', title: 'Ship', title_ru: 'Выпустить доску' }))
  await $.tool.call(note({ kind: 'task', parent: 'G1', title: 'Spike', title_ru: 'Проверить элементы', status: 'done' }))
  await $.tool.call(note({ kind: 'task', parent: 'G1', title: 'Views', title_ru: 'Нарисовать виды', status: 'doing' }))
  await $.tool.call(note({ kind: 'open', parent: 'G1', title: 'Publish?', title_ru: 'Публиковать?' }))
  for (const surface of ['desktop', 'terminal'] as const) {
    const band = await $.ui.mount({ plugin: 'session-board', surface, component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 120, scroll: { offset: 0, bodyRows: 3 } } })
    expect(await band.find({ text: /Нарисовать виды/ })).toBeDefined()
    expect(await band.find({ text: /1\/2 шагов/ })).toBeDefined()
    expect(await band.find({ key: 'band-wait' })).toBeDefined()
    expect(await band.find({ key: 'band-ask' })).toBeDefined()
    await band.unmount()
  }
})
