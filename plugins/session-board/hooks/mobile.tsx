// The board on the Claude mobile app (Remote Control). The phone draws Box, Text, Button, Markdown and Svg, and no
// Input or Select, and it has no band above the prompt. So the board is one narrow column, every action is a Button,
// and text the person must type goes through the engine's question dialog, whose "Other" field takes free text.
import type { ElementTable } from 'claude-code'
import type { Ledger, LedgerNode } from '../types'
import { criteriaOf, verdictLine } from './task'
import { BLUE, GREEN, ORANGE, RED, waitingQuestions } from './views'

export type MobileEls = Pick<ElementTable<'mobile'>, 'Box' | 'Text' | 'Button'> & { Svg?: ElementTable<'mobile'>['Svg'] }

export type MobileData = { ledger: Ledger; width: number; sent: string[] }

export type MobileActions = {
  start: () => void
  accept: () => void
  answer: (id: string, text: string) => void
  /** the question dialog: an option or the person's own text under "Other" */
  askAnswer: (id: string) => void
  askFix: () => void
  askVerdict: () => void
  askNewTask: () => void
  askNote: () => void
  publishReport: () => void
}

const GREY = '#9aa0a6'
const gone = (n: LedgerNode) => ['superseded', 'dropped'].includes(n.status)

function critMark(status: string): { mark: string; color: string } {
  if (status === 'proven') return { mark: '✓', color: GREEN }
  if (status === 'failed') return { mark: '✗', color: RED }
  return { mark: '○', color: GREY }
}

export function MobileBoard(els: MobileEls, d: MobileData, a: MobileActions) {
  const { Box, Text, Button } = els
  const L = d.ledger
  const t = L.task
  const phase = t?.phase ?? 'none'
  const qs = waitingQuestions(L)
  const crit = criteriaOf(L)
  const steps = L.nodes.filter(n => n.kind === 'task' && !gone(n))
  const doing = steps.find(n => n.status === 'doing')
  const done = steps.filter(n => n.status === 'done').length
  const sub = t?.submitted
  const sent = (key: string) => d.sent.includes(key)
  const state = phase === 'none' ? { mark: '○', color: GREY, text: 'Задания нет' }
    : phase === 'intake' ? { mark: '●', color: BLUE, text: 'Задание ждёт «Старт»' }
      : phase === 'review' ? { mark: '✓', color: GREEN, text: `Работа сдана · ${verdictLine(crit)}` }
        : phase === 'accepted' ? { mark: '✓', color: GREEN, text: 'Принято' }
          : { mark: '●', color: BLUE, text: steps.length ? `В работе · шагов ${done} из ${steps.length}` : 'В работе' }
  const main = phase === 'none' || phase === 'accepted'
    ? [<Button key="m-new" label="Поставить задачу" variant="primary" onPress={() => a.askNewTask()} />]
    : phase === 'intake'
      ? [<Button key="m-start" label="Старт" variant="primary" onPress={() => a.start()} />,
        <Button key="m-fix" label="Поправить задание" onPress={() => a.askFix()} />]
      : phase === 'review'
        ? [<Button key="m-accept" label="Принять работу" variant="primary" onPress={() => a.accept()} />,
          <Button key="m-return" label="Вернуть или поправить" onPress={() => a.askVerdict()} />]
        : [<Button key="m-note" label="Написать Claude" onPress={() => a.askNote()} />]
  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text color={state.color} bold wrap="wrap">{`${state.mark} ${t ? t.title.ru : state.text}`}</Text>
        {t ? <Text dimColor wrap="wrap">{state.text}</Text> : null}
      </Box>
      {phase === 'intake' && t ? <Text wrap="wrap">{t.goal.ru}</Text> : null}
      {(phase === 'review' || phase === 'accepted') && sub ? <Text wrap="wrap">{sub.summary.ru}</Text> : null}
      <Box flexDirection="row" flexWrap="wrap" columnGap={2} rowGap={1}>{main}</Box>
      {qs.map(n => (
        <Box key={`m-q-${n.id}`} flexDirection="column" borderStyle="round" borderColor={ORANGE} paddingX={1}>
          <Text color={ORANGE} bold wrap="wrap">{`Нужен ты: ${n.title.ru}`}</Text>
          {n.statement ? <Text dimColor wrap="wrap">{n.statement.ru}</Text> : null}
          {sent(`answer:${n.id}`) ? <Text dimColor>✓ ответ отправлен</Text> : (
            <Box flexDirection="row" flexWrap="wrap" columnGap={2} rowGap={1}>
              {(n.options ?? []).slice(0, 3).map((o, i) => (
                <Button key={`m-opt-${n.id}-${i}`} label={o} variant={i === 0 ? 'primary' : 'secondary'} onPress={() => a.answer(n.id, o)} />
              ))}
              <Button key={`m-ans-${n.id}`} label="Ответить своим текстом" onPress={() => a.askAnswer(n.id)} />
            </Box>
          )}
        </Box>
      ))}
      {phase === 'work' && doing ? <Text wrap="wrap">{`Сейчас: ${doing.title.ru}`}</Text> : null}
      {phase === 'review' && sub?.forYou?.length ? (
        <Box flexDirection="column">
          <Text bold>Нужно от тебя</Text>
          {sub.forYou.map((x, i) => <Text key={`m-you-${i}`} wrap="wrap">{`• ${x}`}</Text>)}
        </Box>
      ) : null}
      {crit.length ? (
        <Box flexDirection="column">
          <Text bold>{`Готово, когда · ${crit.filter(k => k.status === 'proven').length} из ${crit.length}`}</Text>
          {crit.map(k => {
            const m = critMark(k.status)
            return <Text key={`m-k-${k.id}`} wrap="wrap"><Text color={m.color}>{`${m.mark} `}</Text>{sub?.results?.[k.id] ?? k.title.ru}</Text>
          })}
        </Box>
      ) : null}
      {els.Svg && (steps.length || crit.length) && phase !== 'none' && phase !== 'intake'
        ? <els.Svg key="m-route" source={routeSvg(L)} alt="Маршрут задачи: шаги и пункты приёмки" />
        : null}
      {phase === 'review' || phase === 'accepted'
        ? (sent('publish-report')
          ? <Text dimColor>✓ попросил Claude опубликовать отчёт, ссылка придёт в чат</Text>
          : <Button key="m-report" label="Отчёт на телефоне" onPress={() => a.publishReport()} />)
        : null}
    </Box>
  )
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** The task's route as one narrow SVG: steps in order, then the acceptance criteria, each colored by its state. */
export function routeSvg(L: Ledger): string {
  const steps = L.nodes.filter(n => n.kind === 'task' && !gone(n)).slice(0, 12)
  const crit = criteriaOf(L).slice(0, 8)
  type Row = { label: string; color: string; head?: boolean }
  const rows: Row[] = []
  if (steps.length) rows.push({ label: 'Шаги', color: GREY, head: true })
  for (const n of steps) rows.push({ label: n.title.ru, color: n.status === 'done' ? GREEN : n.status === 'doing' ? BLUE : GREY })
  if (crit.length) rows.push({ label: 'Готово, когда', color: GREY, head: true })
  for (const k of crit) rows.push({ label: k.title.ru, color: critMark(k.status).color })
  const step = 28
  const height = 16 + rows.length * step
  const dots = rows.map((r, i) => {
    const y = 18 + i * step
    if (r.head) return `<text x="8" y="${y + 4}" fill="currentColor" font-weight="600">${esc(r.label)}</text>`
    return `<circle cx="20" cy="${y}" r="6" fill="${r.color}"><title>${esc(r.label)}</title></circle>` +
      `<text x="34" y="${y + 4}" fill="currentColor">${esc(cut(r.label, 40))}</text>`
  })
  const firstDot = rows.findIndex(r => !r.head)
  const lastDot = rows.length - 1 - [...rows].reverse().findIndex(r => !r.head)
  const line = firstDot >= 0 && lastDot > firstDot
    ? `<line x1="20" y1="${18 + firstDot * step}" x2="20" y2="${18 + lastDot * step}" stroke="${GREY}" stroke-width="2" stroke-dasharray="3 3"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 ${height}" font-family="-apple-system, system-ui, sans-serif" font-size="13">${line}${dots.join('')}</svg>`
}
