import type { Ledger, LedgerNode } from '../types'
import { leanItems, TAG } from './lean'
import { REPORT_CSS, REPORT_JS } from './report-client'
import { AUTHORITY, criteriaOf, proofOf, verdictLine } from './task'

/** What the report shows beside the ledger: the diff since Start. */
export type ReportDiff = { stat: string; files: { path: string; patch: string; isNew: boolean }[] }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const gone = (n: LedgerNode) => n.status === 'superseded' || n.status === 'dropped'

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

/** "3 октября в 12:51" from an ISO time, in the reader's words. */
function when(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getDate()} ${MONTHS[d.getMonth()]} в ${p(d.getHours())}:${p(d.getMinutes())}`
}

const clock = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function diffHtml(patch: string): string {
  return patch.split('\n').slice(0, 1500).map(l => {
    const cls = l.startsWith('+') ? 'add' : l.startsWith('-') ? 'del' : l.startsWith('@@') ? 'hunk' : ''
    return `<span class="${cls}">${esc(l) || ' '}</span>`
  }).join('')
}

const ring = '<svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true"><circle r="7" fill="var(--ground)" stroke="var(--ink)" stroke-width="3.2"/></svg>'
const bar = '<svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true"><rect x="-2" y="-8" width="4" height="16" rx="2" fill="var(--dead)"/></svg>'

/**
 * One self-contained page for the whole task (no network). The top says whether to accept; the route map draws the
 * session itself, one line per goal across the turns; a click on any station opens its details.
 */
export function renderReport(L: Ledger, diff: ReportDiff, generated: string): string {
  const t = L.task
  const title = t?.title.ru ?? L.brief?.question.ru ?? 'Отчёт по сессии'
  const crit = criteriaOf(L)
  const sub = t?.submitted
  const live = L.nodes.filter(n => !gone(n))
  const goals = live.filter(n => n.kind === 'goal' && !n.parent)
  const forks = live.filter(n => (n.kind === 'decision' && !n.tag) || (n.kind === 'hypothesis' && n.status === 'refuted')).sort((a, b) => a.turn - b.turn)
  const risks = live.filter(n => n.kind === 'risk' && !['lifted', 'done'].includes(n.status))
  const rules = live.filter(n => n.kind === 'constraint' && n.status !== 'lifted')
  const colors = ['#1f6feb', '#0ca4c4', '#d6336c', '#f59f00', '#7048e8', '#2b8a3e']

  const data = {
    results: sub?.results ?? {},
    turns: L.turns.map(x => ({ n: x.n, at: clock(x.at), ask: x.ask.ru, did: x.did.ru })),
    nodes: live.filter(n => n.kind !== 'action').map(n => ({
      id: n.id, kind: n.kind, parent: n.parent, title: n.title.ru, st: n.statement?.ru, status: n.status, turn: n.turn,
      ev: proofOf(n), by: n.by, ctx: n.context?.ru, chosen: n.chosen?.ru, rejected: n.rejected?.map(r => r.ru), accepting: n.accepting?.ru,
    })),
  }
  const json = JSON.stringify(data).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029')

  const where = [
    t?.phase === 'accepted' ? 'Задача принята.' : sub ? `Сдано ${when(sub.at)}.` : 'Работа ещё идёт.',
    t && t.round > 1 ? `Раунд ${t.round}.` : '',
    t ? `Полномочия: ${AUTHORITY[t.authority].label}.` : '',
  ].filter(Boolean).join(' ')

  const termini = crit.map(k => `<span class="sq ${k.status === 'proven' ? 'proven' : k.status === 'failed' ? 'failed' : ''}" title="${esc(k.title.ru)}"></span>`).join('')

  const forYou = sub?.forYou?.length
    ? `<aside class="you"><h2>Нужно от тебя</h2><ol>${sub.forYou.map(s => `<li>${esc(s)}</li>`).join('')}</ol></aside>`
    : ''

  const legend = [
    ...goals.map((g, i) => `<span><i class="swatch" style="background:${colors[i % colors.length]}"></i>${esc(g.title.ru)}</span>`),
    `<span>${ring}решение</span>`,
    `<span>${bar}тупик</span>`,
    '<span><svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true"><circle r="4.5" fill="var(--ink)"/></svg>находка</span>',
    '<span><svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true"><rect x="-7" y="-7" width="14" height="14" rx="3.5" fill="var(--proven)"/></svg>пункт приёмки</span>',
  ].join('')

  const forkRows = forks.map(n => {
    const isDead = n.kind === 'hypothesis'
    const who = isDead ? 'тупик' : n.by === 'user' ? 'решил ты' : 'решил Claude'
    const st = n.statement && n.statement.ru !== n.title.ru ? n.statement.ru : n.rejected?.length ? `Отвергли: ${n.rejected.map(r => r.ru).join('; ')}` : ''
    return `<button class="fork${isDead ? ' dead' : ''}" data-node="${esc(n.id)}">${isDead ? bar : ring}<span class="t">${esc(n.title.ru)}</span><span class="w">${who}, ход ${n.turn}</span>${st ? `<span class="s">${esc(st)}</span>` : ''}</button>`
  }).join('')

  const critRows = crit.map(k => {
    const proof = proofOf(k)
    const said = sub?.results?.[k.id]
    return `<div class="crit"><span class="sq ${k.status === 'proven' ? 'proven' : k.status === 'failed' ? 'failed' : ''}" style="margin-top:5px"></span><div><span class="t">${esc(k.title.ru)}</span>${said ? `<p>${esc(said)}</p>` : ''}${proof.length ? `<details class="proof"><summary>Доказательства (${proof.length})</summary>${proof.map(r => (/^https?:\/\//.test(r) ? `<a class="ev" href="${esc(r)}" target="_blank" rel="noreferrer">${esc(r.replace(/^https?:\/\//, ''))}</a>` : `<div class="ev">${esc(r)}</div>`)).join('')}</details>` : ''}</div></div>`
  }).join('')

  const counted = diff.files.map(f => {
    const lines = f.patch.split('\n')
    return { ...f, add: lines.filter(l => l.startsWith('+')).length, del: lines.filter(l => l.startsWith('-')).length }
  })
  const most = Math.max(1, ...counted.map(f => f.add + f.del))
  const fileRows = counted.map(f => {
    const a = (f.add / most) * 100
    const d = (f.del / most) * 100
    return `<details class="file"><summary><code>${esc(f.path)}${f.isNew ? ' (новый)' : ''}</code><span class="bar"><i class="a" style="width:${a.toFixed(1)}%"></i><i class="d" style="width:${d.toFixed(1)}%"></i></span><span class="nums">+${f.add} −${f.del}</span></summary><pre class="diff">${diffHtml(f.patch)}</pre></details>`
  }).join('')

  // lean's items: what Claude chose not to build, its shortcuts, the over-engineering it found
  const notBuilt = leanItems(L).map(n => {
    const asked = n.status === 'disputed' ? ' · попросили сделать' : ''
    const where = proofOf(n)
    return `<div class="crit"><span class="tag">${esc(TAG[n.tag!].label)}</span><div><span class="t">${esc(n.title.ru)}</span>${n.statement ? `<p>${esc(n.statement.ru)}${esc(asked)}</p>` : asked ? `<p>${esc(asked.slice(3))}</p>` : ''}${where.length ? `<div class="ev">${esc(where.join(' · '))}</div>` : ''}</div></div>`
  }).join('')

  const list = (items: string[], empty: string) => (items.length ? `<ul class="plain">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : `<p class="muted">${esc(empty)}</p>`)

  const verify = sub?.verify.length
    ? sub.verify.map((v, i) => `<div class="cmd"><span id="v${i}">${esc(v)}</span><button class="copy" data-for="v${i}">Копировать</button></div>`).join('')
    : '<p class="muted">Шагов проверки нет.</p>'

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>${REPORT_CSS}</style></head>
<body>
<div class="col">
<header class="hero">
  <p class="where">${esc(where)}</p>
  <h1>${esc(title)}</h1>
  <div class="verdict">${termini ? `<span class="termini">${termini}</span>` : ''}<span class="vtext">${esc(verdictLine(crit))}</span></div>
  <div class="lede">
    <p class="summary">${esc(sub?.summary.ru ?? L.brief?.answer.ru ?? t?.goal.ru ?? '')}</p>
    ${forYou}
  </div>
</header>
</div>

<section id="route">
  <div class="col maphead">
    <div><h2>Как шла сессия</h2><p class="hint">Каждая цель — своя линия, станции — шаги по ходам слева направо. Нажми на станцию, чтобы открыть детали, или на номер хода внизу.</p></div>
    <button class="play" id="play">Проиграть сессию</button>
  </div>
  <div class="col">
    <div class="map" id="map" tabindex="0" aria-label="Карта сессии"><div class="map-inner"><div class="lanes-fixed" id="lanes-fixed"></div><svg id="mapsvg" role="img" aria-label="Линии целей по ходам сессии"></svg><div class="tip" id="tip" hidden></div></div></div>
    <div class="turnbar" id="turncard" aria-live="polite"></div>
    <div class="legend">${legend}</div>
  </div>
</section>

<div class="col">
${forks.length ? `<section id="forks"><h2>Развилки и тупики</h2><p class="hint">Где выбирали путь и что не сработало, по порядку. Нажми, чтобы найти на карте.</p><div class="forks">${forkRows}</div></section>` : ''}

<section id="checked"><h2>Что проверено</h2>${critRows || '<p class="muted">В задании не было пунктов для проверки.</p>'}</section>

${notBuilt || sub?.leanCheck ? `<section id="not-built"><h2>Что не построено и когда добавить</h2><p class="hint">Что Claude сознательно не сделал, где срезал угол с известным пределом и что проверка нашла лишним.</p>${sub?.leanCheck ? `<p>Самопроверка на лишнее: ${esc(sub.leanCheck)}</p>` : ''}${notBuilt}</section>` : ''}

<section id="changes"><h2>Что изменилось</h2>${fileRows ? `<p class="hint">Файлы с начала работы. Нажми на файл, чтобы увидеть изменения.</p>${fileRows}` : '<p class="muted">Файлы не менялись.</p>'}</section>

<section class="three">
  <div><h3>Не сделано</h3>${list(sub?.notDone ?? [], 'Всё из задания сделано.')}</div>
  <div><h3>Риски</h3>${list(risks.map(r => r.title.ru), 'Открытых рисков нет.')}</div>
  <div><h3>Что дальше</h3>${list(sub?.next ?? [], 'Ничего не запланировано.')}</div>
</section>

<section id="verify"><h2>Как проверить самому</h2>${verify}</section>

${rules.length ? `<section id="rules"><h2>Правила этой задачи</h2>${list(rules.map(c => c.statement?.ru ?? c.title.ru), '')}</section>` : ''}

<footer>Отчёт собран ${esc(when(generated))}.${t?.dir ? ` Папка задачи: <code>${esc(t.dir)}</code>` : ''}</footer>
</div>

<aside class="drawer" id="drawer" aria-hidden="true"><button class="close" id="drawer-close" aria-label="Закрыть">×</button><div id="drawer-body"></div></aside>
<script type="application/json" id="report-data">${json}</script>
<script>${REPORT_JS}</script>
</body></html>
`
}
