import { test, expect } from 'claude-code/testing'
import type { On } from 'claude-code'

// The phone (Remote Control) draws a Pane inline and has no Input, no Select and no band above the prompt.
const PANE = {
  component: 'Pane' as const,
  requestId: 'board',
  props: { title: 'Доска сессии', isFocused: false, bodyColumns: 40, placement: 'inline' as const, scroll: { offset: 0, bodyRows: 80 }, view: {} },
}

const BRIEF = {
  tool: 'mcp__session-board__task',
  title: 'Ship the board', title_ru: 'Выпустить доску',
  goal: 'The person sees the session at a glance', goal_ru: 'Человек видит сессию с одного взгляда',
  done_when: [{ en: 'Tests pass', ru: 'Тесты проходят' }, { en: 'The band shows the phase', ru: 'Полоса показывает фазу' }],
  authority: 'normal',
}

/** The test answers the question dialog and the push tool, the way the person and the engine would. */
function phone(on: On, answers: string[]) {
  const pushes: string[] = []
  const asked: string[] = []
  on('tool.call', { tool: 'PushNotification' }, async (_$, e) => {
    pushes.push((e as unknown as { message: string }).message)
    return { result: 'Mobile push requested.', text: 'Mobile push requested.' } as never
  })
  on('tool.call', { tool: 'AskUserQuestion' }, async (_$, e) => {
    const qs = (e as unknown as { questions: { question: string }[] }).questions
    const q = qs[0]!.question
    asked.push(q)
    const a = answers.shift() ?? ''
    return { result: { questions: qs, answers: { [q]: a } }, text: `"${q}"="${a}"` } as never
  })
  on('prompt.submit', async (_$, e) => ({ text: e.text }))
  return { pushes, asked }
}

test('the phone gets a narrow board: Start, answers and the verdict without input fields', async ($, on) => {
  const p = phone(on, ['Публикуй после тестов', 'Вернуть на доработку', 'полоса пустая без задачи'])

  let ui = await $.ui.mount({ plugin: 'session-board', surface: 'mobile', ...PANE })
  expect(await ui.find({ text: /Задания нет/ })).toBeDefined()
  expect(await ui.find({ key: 'm-new' })).toBeDefined()
  await ui.unmount()

  // intake: a push, then Start from the phone
  await $.tool.call(BRIEF)
  expect(p.pushes.at(-1)).toContain('Выпустить доску')
  ui = await $.ui.mount({ plugin: 'session-board', surface: 'mobile', ...PANE })
  expect(await ui.find({ text: /ждёт «Старт»/ })).toBeDefined()
  await ui.press({ key: 'm-start' })
  await ui.unmount()
  expect((await $.tool.call({ tool: 'mcp__session-board__ledger_read', section: 'task' })).text).toContain('фаза: work')

  // a blocker: a push, then an answer typed under "Other" in the question dialog
  await $.tool.call({ tool: 'mcp__session-board__note', kind: 'open', title: 'Publish now?', title_ru: 'Публиковать сейчас?' })
  expect(p.pushes.at(-1)).toContain('Публиковать сейчас?')
  ui = await $.ui.mount({ plugin: 'session-board', surface: 'mobile', ...PANE })
  expect(await ui.find({ text: /Нужен ты: Публиковать сейчас\?/ })).toBeDefined()
  await ui.press({ key: 'm-ans-O1' })
  // answered: the card leaves the board
  expect(await ui.find({ text: /Нужен ты: Публиковать сейчас\?/ })).toBeUndefined()
  await ui.unmount()
  expect((await $.tool.call({ tool: 'mcp__session-board__ledger_read', id: 'O1' })).text).toContain('"answered"')

  // hand-in: a push, then the verdict with a remark from the phone
  await $.tool.call({
    tool: 'mcp__session-board__submit',
    summary_ru: 'Доска работает.',
    criteria: [{ id: 'K1', status: 'proven', result_ru: 'Да: тесты проходят.' }, { id: 'K2', status: 'failed', result_ru: 'Нет: без задачи полоса пустая.' }],
  })
  expect(p.pushes.at(-1)).toContain('Работа сдана')
  ui = await $.ui.mount({ plugin: 'session-board', surface: 'mobile', ...PANE })
  expect(await ui.find({ text: /Да: тесты проходят\./ })).toBeDefined()
  expect(await ui.find({ key: 'm-accept' })).toBeDefined()
  // the route map: the test kit finds an Svg by its type, not by key
  expect((await ui.findAll({ type: 'Svg' })).length).toBe(1)
  expect(await ui.find({ key: 'm-report' })).toBeDefined()
  await ui.press({ key: 'm-return' })
  await ui.unmount()
  const task = (await $.tool.call({ tool: 'mcp__session-board__ledger_read', section: 'task' })).text
  expect(task).toContain('раунд 2')
  expect(task).toContain('фаза: work')
  expect(p.asked.length).toBe(3)
  expect(p.pushes.length).toBe(3)
})

test('Accept from the phone closes the task in one press', async ($, on) => {
  phone(on, [])
  await $.tool.call(BRIEF)
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'mobile', ...PANE })
  await ui.press({ key: 'm-start' })
  await $.tool.call({ tool: 'mcp__session-board__submit', summary_ru: 'Готово.', criteria: [{ id: 'K1', status: 'proven', result_ru: 'Да.' }, { id: 'K2', status: 'proven', result_ru: 'Да.' }] })
  await ui.press({ key: 'm-accept' })
  await ui.unmount()
  expect((await $.tool.call({ tool: 'mcp__session-board__ledger_read', section: 'task' })).text).toContain('фаза: accepted')
})

test('/board prints the board card in the transcript on every surface', async ($, on) => {
  phone(on, [])
  await $.tool.call(BRIEF)
  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const card = await $.ui.mount({
      plugin: 'session-board', surface, component: 'CommandOutput',
      props: { command: 'board', args: '', text: 'Доска', isErrored: false },
    })
    expect(await card.find({ text: /Выпустить доску/ })).toBeDefined()
    expect(await card.find({ key: 'm-start' })).toBeDefined()
    await card.unmount()
  }
})

test('a new brief while the last task waits for acceptance starts a new task', async ($, on) => {
  phone(on, [])
  await $.tool.call(BRIEF)
  const ui = await $.ui.mount({ plugin: 'session-board', surface: 'mobile', ...PANE })
  await ui.press({ key: 'm-start' })
  await ui.unmount()
  await $.tool.call({ tool: 'mcp__session-board__submit', summary_ru: 'Готово.', criteria: [{ id: 'K1', status: 'proven', result_ru: 'Да.' }] })
  const r = await $.tool.call({ ...BRIEF, title: 'Mobile mode', title_ru: 'Режим для телефона' })
  expect(r.text).toContain('still waits')
  const task = (await $.tool.call({ tool: 'mcp__session-board__ledger_read', section: 'task' })).text
  expect(task).toContain('Режим для телефона')
  expect(task).toContain('фаза: intake')
  // the same title during review still amends the brief
  const again = await $.tool.call({ ...BRIEF, title: 'Mobile mode', title_ru: 'Режим для телефона', goal_ru: 'Другая цель' })
  expect(again.text).not.toContain('still waits')
})
