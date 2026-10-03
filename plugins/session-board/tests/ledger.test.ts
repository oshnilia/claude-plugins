import { test, expect } from 'claude-code/testing'

import { applyOps, emptyLedger, nextId, parseOp, renderBrief } from '../hooks/ledger'
import { parseReply } from '../hooks/cartographer'
import { deterministicOps } from '../hooks/extract'
import { renderReport } from '../hooks/report'
import { parseTaskInput, slugify, verdictMessage } from '../hooks/task'

test('applyOps adds, updates and never reuses ids', async () => {
  let L = emptyLedger('s1')
  L = applyOps(L, [
    { op: 'add', kind: 'goal', title: { en: 'Ship the board', ru: 'Выпустить доску' } },
    { op: 'add', kind: 'question', parent: 'G1', title: { en: 'Can mods draw it?', ru: 'Смогут ли моды?' } },
    { op: 'add', kind: 'hypothesis', id: 'H1', parent: 'Q1', title: { en: 'Svg map', ru: 'Svg-карта' } },
  ], 1, 'cartographer').ledger
  expect(L.nodes.map(n => n.id)).toEqual(['G1', 'Q1', 'H1'])
  L = applyOps(L, [{ op: 'update', id: 'H1', status: 'refuted' }], 2, 'cartographer').ledger
  expect(L.nodes.find(n => n.id === 'H1')?.status).toBe('refuted')
  // a model that sends a colliding id of another kind gets a fresh one
  const r = applyOps(L, [{ op: 'add', kind: 'decision', id: 'H1', title: { en: 'Text outline', ru: 'Текстовое дерево' } }], 3, 'cartographer')
  expect(r.touched).toEqual(['D1'])
  expect(nextId(r.ledger.nodes, 'hypothesis')).toBe('H2')
})

test('the brief lists dead ends and constraints for Claude', async () => {
  const L = applyOps(emptyLedger('s1'), [
    { op: 'add', kind: 'constraint', title: { en: 'Never push without asking', ru: 'Не пушить без спроса' } },
    { op: 'add', kind: 'hypothesis', status: 'refuted', title: { en: 'Svg main map', ru: 'Svg-карта' } },
  ], 1, 'cartographer').ledger
  const b = renderBrief(L)
  expect(b).toContain('CONSTRAINTS: C1 Never push without asking')
  expect(b).toContain('DEAD ENDS - do not retry: H1 Svg main map')
})

test('parseReply tolerates fences and drops bad ops', async () => {
  const r = parseReply('Here:\n```json\n{"ops":[{"op":"add","kind":"finding","title":{"en":"A","ru":"А"}},{"op":"add","kind":"nope"}],"turn":{"ask":{"en":"x","ru":"х"}},"brief":null}\n```')
  if ('error' in r) throw new Error(r.error)
  expect(r.ops.length).toBe(1)
  expect(r.dropped).toBe(1)
  expect(r.ask?.ru).toBe('х')
  expect('error' in parseReply('no json here')).toBe(true)
})

test('parseOp rejects an add without a title', async () => {
  expect(parseOp({ op: 'add', kind: 'task' })).toBe(null)
})

test('AskUserQuestion answers become user decisions', async () => {
  const ops = deterministicOps('AskUserQuestion', {}, { answers: { 'Where to host?': 'Public GitHub' } }, false)
  expect(ops.length).toBe(1)
  const op = ops[0]!
  expect(op.op === 'add' && op.kind === 'decision' && op.by === 'user').toBe(true)
})

test('a task brief needs a title, a goal and criteria; slugs are short', async () => {
  expect('error' in parseTaskInput({ title: 'X' })).toBe(true)
  expect('error' in parseTaskInput({ title: 'X', goal: 'Y' })).toBe(true)
  const ok = parseTaskInput({ title: 'Ship', title_ru: 'Выпустить', goal: 'G', goal_ru: 'Ц', done_when: [{ en: 'Tests pass', ru: 'Тесты проходят' }], authority: 'bold' })
  if ('error' in ok) throw new Error(ok.error)
  expect(ok.title.ru).toBe('Выпустить')
  expect(ok.authority).toBe('bold')
  expect(slugify('Ship the oshn plugin marketplace with two plugins and a board')).toBe('ship-the-oshn-plugin-marketplace-with')
})

test('the verdict message groups what is wrong and names new rules', async () => {
  let L = emptyLedger('s1')
  L = applyOps(L, [
    { op: 'add', kind: 'goal', title: { en: 'Ship', ru: 'Выпустить' } },
    { op: 'add', kind: 'criterion', parent: 'G1', title: { en: 'Tests pass', ru: 'Тесты проходят' } },
    { op: 'add', kind: 'decision', by: 'claude', title: { en: 'Use Svg', ru: 'Взять Svg' } },
  ], 1, 'claude').ledger
  const msg = verdictMessage('return', L, { marks: { K1: 'no', D1: 'no' }, comments: { K1: 'два теста падают' }, general: ['пиши короче'], rules: ['пиши короче'] })
  expect(msg).toContain('вернуть на доработку')
  expect(msg).toContain('K1 Тесты проходят: два теста падают')
  expect(msg).toContain('Отмени эти решения')
  expect(msg).toContain('- пиши короче')
  expect(msg).toContain('RULES.md')
})

test('the report shows criteria, escapes text and embeds no external scripts', async () => {
  let L = emptyLedger('s1')
  L = applyOps(L, [
    { op: 'add', kind: 'goal', title: { en: 'Ship', ru: 'Выпустить <доску>' } },
    { op: 'add', kind: 'criterion', parent: 'G1', status: 'proven', title: { en: 'Tests pass', ru: 'Тесты проходят' }, evidence: [{ ref: 'https://example.com/run/1', type: 'tool' }] },
  ], 1, 'claude').ledger
  const html = renderReport(L, { stat: '', files: [] }, '2026-10-03T10:00:00.000Z')
  expect(html).toContain('Тесты проходят')
  expect(html).toContain('Выпустить &lt;доску&gt;')
  expect(html).toContain('Доказано 1 из 1 критериев')
  expect(html.includes('<script src')).toBe(false)
})
