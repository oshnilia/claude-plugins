import type { LiveEvent } from '../types'
import type { Op } from './ledger'

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

const short = (s: string, n = 70) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** A path as the board compares it: forward slashes and an upper-case drive letter, as Windows gives either. */
export const slashed = (p: string) => p.replace(/\\/g, '/').replace(/^[a-z]:/, d => d.toUpperCase())

/** The person's home folder at the start of a slashed path, on macOS, Linux and Windows: it holds their user name. */
export const home = /^(?:\/Users|\/home|[A-Z]:\/Users)\/[^/]+\//

/** A short human label for what a tool call worked on. */
export function targetOf(tool: string, input: Record<string, unknown>): string {
  const pick = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '')
  const path = pick('file_path') || pick('notebook_path') || pick('path')
  if (path) return short(slashed(path).replace(home, '~/'), 80)
  if (tool === 'Bash') return short(pick('description') || (pick('command').split('\n')[0] ?? ''))
  if (pick('pattern')) return short(pick('pattern'))
  if (pick('url')) return short(pick('url'))
  if (pick('query')) return short(pick('query'))
  if (pick('skill')) return pick('skill')
  if (pick('description')) return short(pick('description'))
  if (pick('subject')) return short(pick('subject'))
  if (tool === 'AskUserQuestion' && Array.isArray(input.questions)) return `${input.questions.length} question(s)`
  return ''
}

export const FILE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit'])

/** Short tool name for counters: mcp__server__tool -> server:tool. */
export function toolLabel(tool: string): string {
  const m = /^mcp__(.+?)__(.+)$/.exec(tool)
  return m ? `${m[1]!.replace(/^plugin_/, '').slice(0, 18)}:${m[2]}` : tool
}

export function liveEvent(tool: string, input: Record<string, unknown>, at: number): LiveEvent {
  return { tool: toolLabel(tool), target: targetOf(tool, input), ok: null, at }
}

/**
 * Facts that need no model: what the user decided through AskUserQuestion,
 * an accepted plan, and tasks Claude created.
 */
export function deterministicOps(tool: string, input: Record<string, unknown>, result: unknown, isError: boolean): Op[] {
  if (isError) return []
  if (tool === 'AskUserQuestion') {
    const answers = isObj(result) && isObj(result.answers) ? result.answers : null
    if (!answers) return []
    const ops: Op[] = []
    for (const [question, answer] of Object.entries(answers)) {
      if (typeof answer !== 'string' || !answer) continue
      const q = short(question.replace(/\s+/g, ' '), 200)
      const a = short(answer, 200)
      ops.push({
        op: 'add', kind: 'decision', by: 'user',
        title: { en: short(a, 80), ru: short(a, 80) },
        statement: { en: `The user answered "${q}": ${a}`, ru: `Пользователь ответил на «${q}»: ${a}` },
        chosen: { en: a, ru: a },
        context: { en: q, ru: q },
        evidence: [{ ref: 'AskUserQuestion', type: 'user' }],
        status: 'accepted',
      })
    }
    return ops
  }
  if (tool === 'ExitPlanMode') {
    return [{
      op: 'add', kind: 'decision', by: 'user', status: 'accepted',
      title: { en: 'Plan approved', ru: 'План утверждён' },
      statement: { en: 'The user approved the implementation plan.', ru: 'Пользователь утвердил план работ.' },
      evidence: [{ ref: 'ExitPlanMode', type: 'user' }],
    }]
  }
  if (tool === 'TaskCreate') {
    const subject = typeof input.subject === 'string' ? input.subject : ''
    if (!subject) return []
    return [{ op: 'add', kind: 'task', status: 'todo', title: { en: short(subject, 80), ru: short(subject, 80) }, evidence: [{ ref: 'TaskCreate', type: 'tool' }] }]
  }
  return []
}
