// The board for a phone or a browser over Remote Control. Mods draw only in the terminal and the Desktop app
// (code.claude.com/docs/en/plugins/mods/overview, "Where mods run"), so there the board speaks text: /board prints a
// text card, the next step comes as a question dialog (Remote Control forwards those), and short words in the chat
// press the board's buttons.
import type { Ledger, Phase } from '../types'
import { leanItems, TAG } from './lean'
import { criteriaOf, renderSummary, verdictLine } from './task'
import { waitingQuestions } from './views'

export type ChatCommand =
  | { kind: 'start' }
  | { kind: 'free' }
  | { kind: 'wrap' }
  | { kind: 'accept' }
  | { kind: 'return' | 'fixes'; remark: string }
  | { kind: 'redo' | 'extend'; remark: string }

const START = /^\s*(старт|start|начинай|поехали)\s*[.!]*\s*$/i
const ACCEPT = /^\s*(принять|принимаю|принято|accept)(\s+работу)?\s*[.!]*\s*$/i
const FIXES = /^\s*(принять\s+с\s+правками|с\s+правками)\s*[:—–-]\s*([\s\S]+)$/i
const RETURN = /^\s*(вернуть|верни|на\s+доработку|переделать|переделай|return)\s*[:—–-]\s*([\s\S]+)$/i
const EXTEND = /^\s*(дополнить|дополни|доп\.?\s+задача)\s*[:—–-]\s*([\s\S]+)$/i
const FREE = /^\s*(свободный\s+режим|free\s+mode)\s*[.!]*\s*$/i
const WRAP = /^\s*(подвести\s+итог|подведи\s+итог|итог)\s*[.!]*\s*$/i

/** A short word from the person that presses a board button, only in the phase where that button exists. */
export function parseChatCommand(text: string, phase: Phase | undefined, free = false): ChatCommand | null {
  const freeWork = free && phase === 'work'
  if (!freeWork && FREE.test(text)) return { kind: 'free' }
  if (freeWork && WRAP.test(text)) return { kind: 'wrap' }
  if (phase === 'intake' && START.test(text)) return { kind: 'start' }
  // «Дополнить: …» reopens the same task on the Acceptance screen too, without «Принять»
  const e = !free && (phase === 'accepted' || phase === 'review') ? EXTEND.exec(text) : null
  if (e) return { kind: 'extend', remark: e[2]!.trim() }
  if (phase === 'accepted' && !free) {
    // after acceptance «Вернуть: …» and «Переделать: …» reopen the same task
    const m = RETURN.exec(text)
    return m ? { kind: 'redo', remark: m[2]!.trim() } : null
  }
  if (phase !== 'review') return null
  if (ACCEPT.test(text)) return { kind: 'accept' }
  const f = FIXES.exec(text)
  if (f) return { kind: 'fixes', remark: f[2]!.trim() }
  const r = RETURN.exec(text)
  if (r) return { kind: 'return', remark: r[2]!.trim() }
  return null
}

/** A free session as text: the summary (or the ideas so far), the questions, what to answer. */
function freeText(L: Ledger): string {
  const qs = waitingQuestions(L)
  const hint = L.task?.phase === 'accepted' ? 'Напишите «Свободный режим», чтобы начать новую, или поставьте задачу.'
    : qs.length ? 'Ответьте на вопрос обычным сообщением.' : 'Напишите «Итог», чтобы подвести итог.'
  return [renderSummary(L).trim(), ...(qs.length ? ['', '**Нужен ты**', ...qs.map(n => `- ${n.title.ru}`)] : []), '', hint].join('\n')
}

const mark = (status: string) => (status === 'proven' ? '✓' : status === 'failed' ? '✗' : '○')

/** The board as text: what the phone shows for /board, with what to answer next. */
export function boardText(L: Ledger): string {
  const t = L.task
  if (!t) return 'Доска: задания нет. Опишите задачу в чате, и Claude оформит задание. Или напишите «Свободный режим».'
  if (t.mode === 'free') return freeText(L)
  const crit = criteriaOf(L)
  const qs = waitingQuestions(L)
  const steps = L.nodes.filter(n => n.kind === 'task' && !['superseded', 'dropped'].includes(n.status))
  const doing = steps.find(n => n.status === 'doing')
  const sub = t.submitted
  const out: string[] = [`**${t.title.ru}**`]
  if (t.phase === 'intake') out.push('Задание ждёт «Старт».', '', t.goal.ru)
  else if (t.phase === 'work') out.push(`В работе${steps.length ? ` · шагов ${steps.filter(n => n.status === 'done').length} из ${steps.length}` : ''}${doing ? ` · сейчас: ${doing.title.ru}` : ''}`)
  else if (t.phase === 'review') out.push(`Работа сдана · ${verdictLine(crit)}`, '', sub?.summary.ru ?? '')
  else out.push('Принято.')
  if (qs.length) {
    out.push('', '**Нужен ты**')
    for (const n of qs) out.push(`- ${n.title.ru}`)
  }
  if (t.phase === 'review' && sub?.forYou?.length) {
    out.push('', '**Нужно от тебя**')
    for (const x of sub.forYou) out.push(`- ${x}`)
  }
  if (crit.length) {
    out.push('', `**Готово, когда** · ${crit.filter(k => k.status === 'proven').length} из ${crit.length}`)
    for (const k of crit) out.push(`- ${mark(k.status)} ${sub?.results?.[k.id] ?? k.title.ru}`)
  }
  const lean = t.phase === 'review' ? leanItems(L) : []
  if (lean.length || (t.phase === 'review' && sub?.leanCheck)) {
    out.push('', `**Не построено** · ${lean.length}`)
    if (sub?.leanCheck) out.push(`Самопроверка на лишнее: ${sub.leanCheck}`)
    for (const n of lean) out.push(`- ${TAG[n.tag!].label}: ${n.title.ru}${n.statement ? ` — ${n.statement.ru}` : ''}`)
  }
  const hint = t.phase === 'intake' ? 'Ответьте «Старт», чтобы начать, или напишите, что поправить.'
    : t.phase === 'review' ? 'Ответьте «Принять», «Вернуть: что поправить» или «Дополнить: что добавить».'
      : t.phase === 'accepted' ? 'Дальше: «Переделать: что не так», «Дополнить: что добавить» или опишите новую задачу.'
        : qs.length ? 'Ответьте на вопрос обычным сообщением.' : ''
  if (hint) out.push('', hint)
  return out.join('\n')
}
