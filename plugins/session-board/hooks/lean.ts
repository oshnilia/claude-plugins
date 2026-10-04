// The lean plugin in the board's pipeline: its level in the brief, a self-check before hand-in, what Claude did not
// build at Acceptance and in the report, the shortcuts the project carries. The board learns about lean from the line
// lean's hook prints at session start; without that line nothing here shows.

import type { LeanLevel, LeanTag, Ledger, LedgerNode } from '../types'

export const LEAN_LEVELS: readonly LeanLevel[] = ['lite', 'full', 'ultra', 'off']

export const LEAN_LEVEL: Record<LeanLevel, { label: string; ru: string }> = {
  lite: { label: 'lite', ru: 'строит, что просили, и называет вариант проще' },
  full: { label: 'full', ru: 'сначала то, что уже есть в проекте, стандартная библиотека и платформа; самый короткий дифф' },
  ultra: { label: 'ultra', ru: 'сначала удаляет, потом добавляет; остальное в задаче ставит под вопрос' },
  off: { label: 'выкл', ru: 'правила lean не действуют' },
}

const isLevel = (x: unknown): x is LeanLevel => LEAN_LEVELS.includes(x as LeanLevel)

/** The level from lean's session-start line ("lean is on. Level: full."), the last one when there are several. */
export function leanLineLevel(text: string): LeanLevel | null {
  const level = [...text.matchAll(/lean is on\. Level: (lite|full|ultra)\./g)].at(-1)?.[1]
  return isLevel(level) ? level : null
}

/** What the Start message says about code, when the person picked a level for the task. */
export const codeLine = (level: LeanLevel) => `Код: lean ${level} — ${LEAN_LEVEL[level].ru}.`

export const LEAN_TAGS: readonly LeanTag[] = ['skipped', 'shortcut', 'cut']

/** How each kind of lean item shows at Acceptance, and what a mark on it asks of Claude. */
export const TAG: Record<LeanTag, { label: string; glyph: string; mark: string; ask: string }> = {
  skipped: { label: 'пропущено', glyph: '◇', mark: 'добавить сейчас', ask: 'Добавь сейчас то, что ты пропустил:' },
  shortcut: { label: 'срезано', glyph: '◆', mark: 'сделать полностью', ask: 'Сделай полностью вместо срезанного угла:' },
  cut: { label: 'лишнее', glyph: '−', mark: 'убрать', ask: 'Убери лишнее, что нашла проверка:' },
}

const gone = (n: LedgerNode) => n.status === 'superseded' || n.status === 'dropped'

/** Lean's items in the ledger, in the order Acceptance shows them: skipped, shortcuts, findings. */
export const leanItems = (L: Ledger) =>
  LEAN_TAGS.flatMap(tag => L.nodes.filter(n => n.tag === tag && !gone(n)))

/** `git grep -c` arguments: a `lean:` marker after a comment prefix, as lean-debt reads them. Docs and JSON (which
 * has no comments, but transcripts quote lean's rules) are left out. */
export const DEBT_GREP = ['grep', '-c', '--untracked', '-E', '(#|//|/[*]|--) ?lean:', '--', '.', ':(exclude)*.md', ':(exclude)*.json', ':(exclude)*.jsonl']

/** The sum of `git grep -c` lines ("path:count"). */
export function parseDebt(stdout: string): { markers: number; files: number } {
  let markers = 0
  let files = 0
  for (const line of stdout.split('\n')) {
    const n = Number(line.slice(line.lastIndexOf(':') + 1))
    if (line.includes(':') && Number.isInteger(n) && n > 0) {
      markers += n
      files++
    }
  }
  return { markers, files }
}

/** "Проверить на лишнее": the request the board sends at Acceptance. */
export const LEAN_REVIEW_ASK =
  'Проверь сданную работу на лишнее: прогони lean-review по диффу этой задачи (от коммита на старте). ' +
  'Каждую находку запиши на доску через note: kind finding, tag cut, title и title_ru — что убрать, statement_ru — чем заменить, evidence — файл и строка. ' +
  'Код не меняй и заново не сдавай: что резать, я отмечу в приёмке.'

/** The project's debt list: the request behind the counter on the Task screen. */
export const LEAN_DEBT_ASK =
  'Покажи долг lean в проекте: все метки `lean:` в коде (lean-debt), по файлам, с пределом и условием, когда переделать. Ничего не меняй.'
