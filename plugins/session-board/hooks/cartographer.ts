import type { Brief, Ledger, Txt } from '../types'
import { parseBrief, parseOp, txt, type Op } from './ledger'

export type TurnDigest = {
  n: number
  ask: string
  answer: string
  tools: Record<string, number>
  files: string[]
  errors: string[]
  // every turn this update covers (older turns that never reached the map, then this one)
  covers?: { n: number; ask: string }[]
}

export type TurnNote = { n: number; ask: Txt | null; did: Txt | null }

export type CartographerReply = { ops: Op[]; brief: Brief | null; ask: Txt | null; did: Txt | null; turns: TurnNote[]; dropped: number }

const RULES = `You are the session cartographer. You keep a typed ledger of THIS conversation.
Two readers use it: a human who reviews your work in a side board, and you yourself after the context is compacted.

Write every "en" text in plain technical English (about 80% of ASD-STE100): active voice, simple tenses,
one fact per sentence, titles of 10 words or fewer, statements of 25 words or fewer.
Write every "ru" text in plain technical Russian with the same rules: verbs, not verbal nouns; no bureaucratic words.

Node kinds and id prefixes: goal G, constraint C (a rule the USER stated: "never/always/only"), question Q (a question
the work must answer), hypothesis H (a guess to test), task T, finding F (a claim with evidence), decision D, open O
(an open question), assumption S, risk R.

Rules:
- Build a tree: goals at the top; questions and tasks under a goal; hypotheses under a question; findings and
  decisions under the question or task they answer. Use "parent" with an existing or new id.
- 2 to 5 children per parent. A parent states a conclusion, not "there are 3 issues".
- Never reuse or renumber ids. To change a node use {"op":"update","id":...}. Mark a disproved hypothesis
  status "refuted" (a dead end). Mark finished tasks "done".
- A finding needs evidence refs (file:line, a command and its result, a test, a URL) and likelihood
  (almost-certain|likely|even|unlikely) and confidence (low|moderate|high).
- A decision uses a Y-statement: context, chosen, rejected[], accepting, by (user|claude).
- Keep a PLAN: every active goal has 2 to 6 tasks (its steps) with status todo|doing|done; exactly one task is
  "doing" while work goes on. Update statuses every turn; add a task when new work starts.
- A refuted hypothesis states WHY in "statement" (the evidence that killed it).
- An open question for the user (kind "open", "ask":"user") may carry "options": 2 or 3 short answers (max 4 words
  each, in Russian) that the board shows as buttons.
- brief.keyLine, now, next and blockedBy must name ids that exist or that you add in this reply.
- When the update covers several turns, also return "turns": [{"n":2,"ask":{"en","ru"},"did":{"en","ru"}}, ...]
  with one entry per covered turn, oldest first.
- Add only what these turns changed. At most 8 ops (12 when several turns are covered). Skip trivial actions (reads, listings).
- Return "brief" only when the top of the pyramid changed. brief.answer is the governing thought: what the
  session does and the current answer, or "Not known yet. Best hypothesis: H2".

Reply with ONE JSON object and nothing else:
{"ops":[{"op":"add","kind":"finding","id":"F3","parent":"Q1","title":{"en":"","ru":""},"statement":{"en":"","ru":""},
"status":"stated","evidence":[{"ref":"src/a.ts:42","type":"code"}],"likelihood":"likely","confidence":"moderate"},
{"op":"update","id":"T2","status":"done"}],
"turn":{"ask":{"en":"","ru":""},"did":{"en":"","ru":""}},
"brief":null}
brief shape when present: {"question":{"en","ru"},"answer":{"en","ru"},"scqa":{"s":{"en","ru"},"c":{"en","ru"}},
"keyLine":["F3","D2"],"now":"T4","next":"T5","blockedBy":[]}`

function ledgerDigest(ledger: Ledger): string {
  const nodes = ledger.nodes
    .slice(-80)
    .map(n => `${n.id}${n.parent ? `<${n.parent}` : ''} ${n.kind} [${n.status}] ${n.title.en}`)
    .join('\n')
  const b = ledger.brief
  return [
    b ? `BRIEF: Q: ${b.question.en} | A: ${b.answer.en} | key: ${b.keyLine.join(',')} | now: ${b.now ?? '-'} next: ${b.next ?? '-'}` : 'BRIEF: none yet',
    `NODES (id<parent kind [status] title):\n${nodes || '(none yet)'}`,
  ].join('\n')
}

export function cartographerPrompt(ledger: Ledger, turn: TurnDigest): string {
  const tools = Object.entries(turn.tools).map(([k, v]) => `${k}x${v}`).join(', ') || 'none'
  return [
    RULES,
    '',
    '--- CURRENT LEDGER ---',
    ledgerDigest(ledger),
    '',
    ...(turn.covers && turn.covers.length > 1
      ? [`--- TURNS ${turn.covers.map(c => c.n).join(', ')} (they never reached the ledger; the last one is the latest user turn) ---`,
         ...turn.covers.map(c => `Turn ${c.n} user asked: ${c.ask.slice(0, 300) || '(no text: an image or attachment)'}`)]
      : [`--- TURN ${turn.n} (the last user turn in this conversation) ---`, `User asked: ${turn.ask.slice(0, 700)}`]),
    `Tools: ${tools}`,
    `Files changed: ${turn.files.slice(0, 12).join(', ') || 'none'}`,
    `Errors: ${turn.errors.slice(0, 5).join(' | ') || 'none'}`,
    `Your final answer began: ${turn.answer.slice(0, 900)}`,
    '',
    'Update the ledger for this turn. Reply with the JSON object only.',
  ].join('\n')
}

/** Parse the model reply. Tolerates code fences and prose around the JSON. */
export function parseReply(text: string): CartographerReply | { error: string } {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return { error: 'no JSON object in the reply' }
  let raw: unknown
  try {
    raw = JSON.parse(text.slice(start, end + 1))
  } catch (err) {
    return { error: `invalid JSON: ${(err as Error).message.slice(0, 120)}` }
  }
  if (typeof raw !== 'object' || raw === null) return { error: 'reply is not an object' }
  const r = raw as Record<string, unknown>
  const rawOps = Array.isArray(r.ops) ? r.ops.slice(0, 14) : []
  const ops = rawOps.map(parseOp).filter((o): o is Op => o !== null)
  const turn = typeof r.turn === 'object' && r.turn !== null ? (r.turn as Record<string, unknown>) : {}
  return {
    ops,
    brief: r.brief ? parseBrief(r.brief) : null,
    ask: txt(turn.ask) ?? null,
    did: txt(turn.did) ?? null,
    turns: Array.isArray(r.turns)
      ? r.turns
          .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null && typeof (t as Record<string, unknown>).n === 'number')
          .map(t => ({ n: t.n as number, ask: txt(t.ask) ?? null, did: txt(t.did) ?? null }))
      : [],
    dropped: rawOps.length - ops.length,
  }
}

// ---------- the "Ask" view and compaction ----------

export function askPrompt(question: string, brief: string): string {
  return `A person reviews this session in a side board and asks a question about it.
Answer in the language of the question. Use plain technical style: the answer first in one sentence,
then 2 to 4 short points that do not overlap, each with a source (file, command, decision id) when you have one.
At most 180 words. No preamble. If you do not know, say so.

The current session ledger:
${brief}

Question: ${question}`
}

export const COMPACT_RULES = `Write the summary as a session ledger in plain technical English:
GOALS with status; CONSTRAINTS the user stated (keep them word for word); DECISIONS as Y-statements with who decided;
FINDINGS with evidence (file:line, command, test); DEAD ENDS (refuted hypotheses - do not retry); OPEN questions and
who must answer; FILES changed; NOW and NEXT step. Keep ids such as G1, D2, F3 when they exist.`
