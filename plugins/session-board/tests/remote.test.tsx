import { test, expect, mock, type Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

// A phone or a browser over Remote Control: mods draw nothing there, the board speaks text and asks questions.
const BRIEF = {
  tool: 'mcp__session-board__task',
  title: 'Ship the board', title_ru: 'Выпустить доску',
  goal: 'The person sees the session at a glance', goal_ru: 'Человек видит сессию с одного взгляда',
  done_when: [{ en: 'Tests pass', ru: 'Тесты проходят' }, { en: 'The band shows the phase', ru: 'Полоса показывает фазу' }],
  authority: 'normal',
}
const BRIDGE = { kind: 'bridge' as const }
const task = async ($: Engine) => (await $.tool.call({ tool: 'mcp__session-board__ledger_read', section: 'task' })).text ?? ''

/** What lies beneath the plugin: the person's answers to question dialogs, pushes, and the prompts Claude gets. */
function phone(on: On, answers: string[]) {
  const pushes: string[] = []
  const prompts: string[] = []
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
  on('prompt.submit', async (_$, e) => {
    prompts.push(e.text)
    return { text: e.text }
  })
  return { pushes, prompts, asked }
}

test('«Старт», «Принять» and «Вернуть: …» typed in the chat press the board buttons', async ($, on) => {
  const p = phone(on, [])
  await $.tool.call(BRIEF)
  expect(p.pushes.at(-1)).toContain('Ответьте «Старт»')

  await $.prompt.submit({ text: 'Старт', origin: BRIDGE })
  expect(await task($)).toContain('фаза: work')
  // Claude gets the Start button's message, not the bare word and not a second message
  expect(p.prompts.length).toBe(1)
  expect(p.prompts[0]).not.toBe('Старт')

  await $.tool.call({ tool: 'mcp__session-board__submit', summary_ru: 'Готово.', criteria: [{ id: 'K1', status: 'proven', result_ru: 'Да.' }, { id: 'K2', status: 'failed', result_ru: 'Нет.' }] })
  expect(p.pushes.at(-1)).toContain('Ответьте «Принять»')
  await $.prompt.submit({ text: 'Вернуть: полоса пустая без задачи', origin: BRIDGE })
  const t = await task($)
  expect(t).toContain('раунд 2')
  expect(t).toContain('фаза: work')
  expect(p.prompts.at(-1)).toContain('полоса пустая без задачи')

  await $.tool.call({ tool: 'mcp__session-board__submit', summary_ru: 'Исправил.', criteria: [{ id: 'K1', status: 'proven', result_ru: 'Да.' }, { id: 'K2', status: 'proven', result_ru: 'Да.' }] })
  await $.prompt.submit({ text: 'Принять', origin: BRIDGE })
  expect(await task($)).toContain('фаза: accepted')
})

test('the words do nothing outside their phase and in a longer sentence', async ($, on) => {
  const p = phone(on, [])
  await $.prompt.submit({ text: 'Старт', origin: BRIDGE })
  expect(p.prompts.at(-1)).toBe('Старт')
  await $.tool.call(BRIEF)
  await $.prompt.submit({ text: 'Старт не нажимай, сначала поправь цель', origin: BRIDGE })
  expect(await task($)).toContain('фаза: intake')
  await $.prompt.submit({ text: 'Принять', origin: BRIDGE })
  expect(await task($)).toContain('фаза: intake')
})

test('/board from a phone prints a text card and asks the next step', async ($, on) => {
  const clock = mock.clock(on)
  const p = phone(on, ['Старт', 'Принять'])
  await $.tool.call(BRIEF)
  const presentation = { isFullscreen: false, columns: 60 }

  const card = await $.command.run({ command: 'board', args: '', origin: BRIDGE, presentation })
  expect(card.text).toContain('Выпустить доску')
  expect(card.text).toContain('Ответьте «Старт»')
  await clock.advance(1)
  expect(p.asked.at(-1)).toContain('ждёт старта')
  expect(await task($)).toContain('фаза: work')

  await $.tool.call({ tool: 'mcp__session-board__submit', summary_ru: 'Готово.', criteria: [{ id: 'K1', status: 'proven', result_ru: 'Да: тесты проходят.' }, { id: 'K2', status: 'proven', result_ru: 'Да.' }] })
  const review = await $.command.run({ command: 'board', args: '', origin: BRIDGE, presentation })
  expect(review.text).toContain('✓ Да: тесты проходят.')
  await clock.advance(1)
  expect(p.asked.at(-1)).toContain('сдана')
  expect(await task($)).toContain('фаза: accepted')
})

test('a new brief while the last task waits for acceptance starts a new task', async ($, on) => {
  phone(on, [])
  await $.tool.call(BRIEF)
  await $.prompt.submit({ text: 'Старт', origin: BRIDGE })
  await $.tool.call({ tool: 'mcp__session-board__submit', summary_ru: 'Готово.', criteria: [{ id: 'K1', status: 'proven', result_ru: 'Да.' }] })
  const r = await $.tool.call({ ...BRIEF, title: 'Mobile mode', title_ru: 'Режим для телефона' })
  expect(r.text).toContain('still waits')
  const t = await task($)
  expect(t).toContain('Режим для телефона')
  expect(t).toContain('фаза: intake')
  // the same title during review still amends the brief
  const again = await $.tool.call({ ...BRIEF, title: 'Mobile mode', title_ru: 'Режим для телефона', goal_ru: 'Другая цель' })
  expect(again.text).not.toContain('still waits')
})
