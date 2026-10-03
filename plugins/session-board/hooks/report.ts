import type { Kind, Ledger, LedgerNode } from '../types'
import { AUTHORITY, criteriaOf, proofOf, verdictLine } from './task'

/** What the report shows beside the ledger: the diff since Start. */
export type ReportDiff = { stat: string; files: { path: string; patch: string; isNew: boolean }[] }

const KIND_COLOR: Record<Kind, string> = {
  goal: '#5b8cff', constraint: '#b57bff', question: '#8f7bff', hypothesis: '#8b93a1', task: '#34b27b', action: '#8b93a1',
  finding: '#e0a526', decision: '#ef6b55', open: '#ff9330', assumption: '#8b93a1', risk: '#ff6b6b', criterion: '#2bb3a3',
}

const KIND_LABEL: Record<Kind, string> = {
  goal: 'цель', constraint: 'правило', question: 'вопрос', hypothesis: 'гипотеза', task: 'шаг', action: 'действие',
  finding: 'находка', decision: 'решение', open: 'вопрос', assumption: 'допущение', risk: 'риск', criterion: 'критерий',
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const gone = (n: LedgerNode) => n.status === 'superseded' || n.status === 'dropped'

function ref(r: string): string {
  if (/^https?:\/\//.test(r)) return `<a class="ev" href="${esc(r)}" target="_blank" rel="noreferrer">${esc(r.replace(/^https?:\/\//, '').slice(0, 70))}</a>`
  return `<code class="ev">${esc(r.slice(0, 120))}</code>`
}

function evidence(n: LedgerNode): string {
  const list = n.evidence.filter(e => e.ref !== 'task brief')
  return list.length ? `<div class="evs">${list.map(e => ref(e.ref)).join('')}</div>` : ''
}

function chip(kind: Kind, text = KIND_LABEL[kind]): string {
  return `<span class="chip" style="--c:${KIND_COLOR[kind]}">${esc(text)}</span>`
}

function critMark(status: string): string {
  if (status === 'proven') return '<span class="mark ok">✓</span>'
  if (status === 'failed') return '<span class="mark bad">✗</span>'
  return '<span class="mark todo">○</span>'
}

function diffHtml(patch: string): string {
  return patch.split('\n').slice(0, 1500).map(l => {
    const cls = l.startsWith('+') ? 'add' : l.startsWith('-') ? 'del' : l.startsWith('@@') ? 'hunk' : ''
    return `<span class="${cls}">${esc(l) || ' '}</span>`
  }).join('\n')
}

function tree(L: Ledger): string {
  const kids = (id: string | undefined) => L.nodes.filter(n => (id ? n.parent === id : !n.parent) && !gone(n))
  const walk = (id: string | undefined, depth: number): string => {
    const list = kids(id)
    if (!list.length) return ''
    return `<ul class="tree">${list.map(n => {
      const inner = walk(n.id, depth + 1)
      const dead = n.kind === 'hypothesis' && n.status === 'refuted'
      const head = `${chip(n.kind)}<b class="nid">${esc(n.id)}</b> <span class="${dead ? 'dead' : ''}">${esc(n.title.ru)}</span> <span class="st">${esc(n.status)}</span>`
      const body = `${n.statement && n.statement.ru !== n.title.ru ? `<div class="stmt">${esc(n.statement.ru)}</div>` : ''}${evidence(n)}`
      const attrs = `class="node" data-kind="${n.kind}" data-status="${esc(n.status)}" data-turn="${n.turn}" data-text="${esc(`${n.id} ${n.title.ru} ${n.statement?.ru ?? ''}`.toLowerCase())}"`
      return inner
        ? `<li ${attrs}><details${depth < 2 ? ' open' : ''}><summary>${head}</summary>${body}${inner}</details></li>`
        : `<li ${attrs}><div class="leaf">${head}${body}</div></li>`
    }).join('')}</ul>`
  }
  return walk(undefined, 0)
}

/** One self-contained page for the whole task: verdict first, then evidence, changes, decisions, map, turns. */
export function renderReport(L: Ledger, diff: ReportDiff, generated: string): string {
  const t = L.task
  const title = t?.title.ru ?? L.brief?.question.ru ?? 'Отчёт по сессии'
  const crit = criteriaOf(L)
  const proven = crit.filter(k => k.status === 'proven').length
  const sub = t?.submitted
  const mine = L.nodes.filter(n => n.kind === 'decision' && n.by !== 'user' && !gone(n))
  const theirs = L.nodes.filter(n => n.kind === 'decision' && n.by === 'user' && !gone(n))
  const assumptions = L.nodes.filter(n => n.kind === 'assumption' && !gone(n))
  const risks = L.nodes.filter(n => n.kind === 'risk' && !['lifted', 'done'].includes(n.status) && !gone(n))
  const dead = L.nodes.filter(n => n.kind === 'hypothesis' && n.status === 'refuted')
  const rules = L.nodes.filter(n => n.kind === 'constraint' && !gone(n) && n.status !== 'lifted')
  const phase = t?.phase === 'accepted' ? 'принято' : t?.phase === 'review' ? 'на приёмке' : t?.phase === 'work' ? 'в работе' : 'черновик'
  const files = new Map<string, number[]>()
  for (const turn of L.turns) for (const p of turn.paths ?? turn.files) files.set(p, [...(files.get(p) ?? []), turn.n])

  const decisionCard = (n: LedgerNode) => `
    <div class="card dec">
      <div class="row">${chip('decision', n.by === 'user' ? 'решил ты' : 'решил Claude')}<b class="nid">${esc(n.id)}</b> <b>${esc(n.title.ru)}</b></div>
      ${n.context ? `<div class="kv"><span>контекст</span>${esc(n.context.ru)}</div>` : ''}
      ${n.chosen ? `<div class="kv"><span>выбрали</span>${esc(n.chosen.ru)}</div>` : ''}
      ${n.rejected?.length ? `<div class="kv"><span>отвергли</span>${n.rejected.map(r => `<s>${esc(r.ru)}</s>`).join(' · ')}</div>` : ''}
      ${n.accepting ? `<div class="kv"><span>цена</span>${esc(n.accepting.ru)}</div>` : ''}
      ${!n.chosen && n.statement ? `<div class="stmt">${esc(n.statement.ru)}</div>` : ''}
    </div>`

  const list = (items: string[], empty: string) => (items.length ? `<ul class="plain">${items.map(i => `<li>${i}</li>`).join('')}</ul>` : `<p class="muted">${empty}</p>`)

  const turns = L.turns.map(turn => {
    const made = turn.nodes.map(id => L.nodes.find(n => n.id === id)).filter((n): n is LedgerNode => !!n)
    const tools = Object.values(turn.tools).reduce((s, v) => s + v, 0)
    return `<li class="turn" data-n="${turn.n}">
      <div class="row"><b>Ход ${turn.n}</b><span class="muted">${esc(turn.at.slice(11, 16))}${tools ? ` · ${tools} тул.` : ''}${turn.files.length ? ` · ${turn.files.length} файл.` : ''}${turn.errors ? ` · ошибок ${turn.errors}` : ''}</span></div>
      <div class="ask">${esc(turn.ask.ru || '—')}</div>
      ${turn.did.ru ? `<div class="did">→ ${esc(turn.did.ru)}</div>` : ''}
      ${made.length ? `<div class="made">${made.slice(0, 8).map(n => chip(n.kind, `${n.id} ${KIND_LABEL[n.kind]}`)).join('')}</div>` : ''}
    </li>`
  }).join('')

  const diffBlock = diff.files.length
    ? `${diff.stat ? `<pre class="stat">${esc(diff.stat)}</pre>` : ''}${diff.files.map(f => `
      <details class="file"><summary><code>${esc(f.path)}</code>${f.isNew ? ' <span class="chip" style="--c:#34b27b">новый</span>' : ''}${files.get(f.path)?.length ? ` <span class="muted">ходы ${files.get(f.path)!.join(', ')}</span>` : ''}</summary>
      <pre class="diff">${diffHtml(f.patch)}</pre></details>`).join('')}`
    : `${list([...files.entries()].map(([p, ns]) => `<code>${esc(p)}</code> <span class="muted">ходы ${ns.join(', ')}</span>`), 'Файлы не менялись.')}`

  const verify = sub?.verify.length
    ? sub.verify.map((v, i) => `<div class="cmd"><pre id="v${i}">${esc(v)}</pre><button class="copy" data-for="v${i}">копировать</button></div>`).join('')
    : '<p class="muted">Шагов проверки нет.</p>'

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--bg:#fbfaf7;--card:#fff;--ink:#1d1d1b;--muted:#6f6e69;--line:#e6e3dc;--ok:#1f9d63;--bad:#d64545;--todo:#9a988f;--accent:#5b5bd6;--add:#e6f6ec;--del:#fbe9e9;--hunk:#eef0fb}
@media (prefers-color-scheme:dark){:root{--bg:#191917;--card:#22221f;--ink:#ecebe6;--muted:#a19f97;--line:#34332f;--ok:#4cc38a;--bad:#f07373;--todo:#7d7b74;--accent:#9d9df2;--add:#1d3527;--del:#3a2222;--hunk:#262a40}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:920px;margin:0 auto;padding:32px 20px 80px}h1{font-size:28px;line-height:1.25;margin:0 0 6px;font-weight:600}
h2{font-size:20px;margin:48px 0 14px;font-weight:600}.muted{color:var(--muted)}.sub{color:var(--muted);font-size:14px}
nav{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 0;margin:20px 0 0;display:flex;gap:16px;flex-wrap:wrap;font-size:14px}
nav a{color:var(--muted);text-decoration:none}nav a:hover{color:var(--ink)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:10px 0}
.verdict{display:grid;gap:12px;padding:22px}.big{font-size:22px;font-weight:600}.bar{height:8px;border-radius:4px;background:var(--line);overflow:hidden}.bar i{display:block;height:100%;background:var(--ok)}
.stats{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;color:var(--muted)}.stats b{color:var(--ink)}
.row{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.chip{display:inline-block;font-size:12px;line-height:18px;padding:0 8px;border-radius:9px;color:var(--c);border:1px solid color-mix(in srgb,var(--c) 45%,transparent);background:color-mix(in srgb,var(--c) 12%,transparent);margin-right:6px;white-space:nowrap}
.nid{font-size:13px;color:var(--muted);font-weight:500}.mark{display:inline-block;width:22px;font-weight:700}.mark.ok{color:var(--ok)}.mark.bad{color:var(--bad)}.mark.todo{color:var(--todo)}
.crit{display:grid;grid-template-columns:24px 1fr;gap:4px 8px}.evs{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.ev{font-size:12.5px;background:color-mix(in srgb,var(--accent) 10%,transparent);padding:1px 7px;border-radius:6px;color:var(--ink);text-decoration:none;word-break:break-all}
.said{margin:4px 0 0}.proof{margin-top:6px;font-size:14px}.proof summary{cursor:pointer;color:var(--muted)}.you ol{margin:6px 0 0;padding-left:22px}.you li{margin:4px 0}
.kv{display:grid;grid-template-columns:90px 1fr;gap:8px;font-size:15px;margin-top:6px}.kv span{color:var(--muted);font-size:13px}.stmt{color:var(--muted);font-size:14.5px;margin-top:4px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media (max-width:700px){.two{grid-template-columns:1fr}}
ul.plain{margin:6px 0;padding-left:20px}ul.plain li{margin:4px 0}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}.toolbar button,.player button,.copy{font:inherit;font-size:13px;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:8px;padding:4px 10px;cursor:pointer}
.toolbar button.on{border-color:var(--accent);color:var(--accent)}.toolbar input{font:inherit;font-size:14px;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:8px;padding:4px 10px;flex:1;min-width:160px}
ul.tree{list-style:none;margin:0;padding-left:18px;border-left:1px solid var(--line)}main>section>ul.tree{border-left:0;padding-left:0}
.node{margin:6px 0}.node summary{cursor:pointer;list-style:none}.node summary::-webkit-details-marker{display:none}.node summary::before{content:'▸';color:var(--muted);display:inline-block;width:14px}.node details[open]>summary::before{content:'▾'}
.leaf{padding-left:14px}.dead{text-decoration:line-through;color:var(--muted)}.st{font-size:12px;color:var(--muted)}.node.dim{opacity:.28}.node.hit>details>summary,.node.hit>.leaf{background:color-mix(in srgb,var(--accent) 14%,transparent);border-radius:6px}
.timeline{list-style:none;padding:0;margin:0}.turn{border-left:3px solid var(--line);padding:8px 14px;margin:0 0 6px}.turn.cur{border-left-color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,transparent);border-radius:0 8px 8px 0}
.ask{font-weight:500}.did{color:var(--muted)}.made{margin-top:6px}.player{display:flex;gap:8px;align-items:center;margin-bottom:12px;font-size:14px}
pre{margin:0;overflow:auto;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}.stat{padding:10px 12px;background:var(--card);border:1px solid var(--line);border-radius:8px;margin-bottom:8px}
.file{border:1px solid var(--line);border-radius:8px;margin:6px 0;background:var(--card)}.file summary{cursor:pointer;padding:8px 12px}.diff{padding:8px 12px;border-top:1px solid var(--line);max-height:520px}
.diff span{display:block}.diff .add{background:var(--add)}.diff .del{background:var(--del)}.diff .hunk{background:var(--hunk);color:var(--muted)}
.cmd{display:flex;gap:8px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin:6px 0}.cmd pre{flex:1;white-space:pre-wrap}
footer{margin-top:56px;color:var(--muted);font-size:13px}code{font:13px ui-monospace,SFMono-Regular,Menlo,monospace}
</style></head>
<body><main>
<header>
  <h1>${esc(title)}</h1>
  <div class="sub">${esc(phase)}${t ? ` · раунд ${t.round}` : ''}${sub ? ` · сдано ${esc(sub.at.slice(0, 16).replace('T', ' '))}` : ''} · отчёт собран ${esc(generated.slice(0, 16).replace('T', ' '))}${t ? ` · полномочия: ${esc(AUTHORITY[t.authority].label)}` : ''}</div>
</header>
<nav><a href="#verdict">Итог</a><a href="#criteria">Что проверено</a><a href="#changes">Изменения</a><a href="#decisions">Решения</a><a href="#map">Карта</a><a href="#turns">Ходы</a><a href="#verify">Проверить</a></nav>

<section id="verdict">
  <div class="card verdict">
    <div class="big">${esc(verdictLine(crit))}</div>
    ${crit.length ? `<div class="bar"><i style="width:${Math.round((proven / crit.length) * 100)}%"></i></div>` : ''}
    ${sub ? `<p>${esc(sub.summary.ru)}</p>` : L.brief ? `<p>${esc(L.brief.answer.ru)}</p>` : ''}
    <div class="stats"><span>решений Claude <b>${mine.length}</b></span><span>допущений <b>${assumptions.length}</b></span><span>тупиков <b>${dead.length}</b></span><span>файлов <b>${files.size}</b></span><span>ходов <b>${L.turns.length}</b></span></div>
  </div>
  ${sub?.forYou?.length ? `<div class="card you"><b>Нужно от тебя</b><ol>${sub.forYou.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
  ${t ? `<div class="two"><div class="card"><div class="muted">Цель</div>${esc(t.goal.ru)}</div><div class="card"><div class="muted">Результат</div>${esc(t.result.ru || '—')}</div></div>` : ''}
</section>

<section id="criteria"><h2>Что проверено</h2>
  ${crit.length ? crit.map(k => {
    const proof = proofOf(k)
    const said = sub?.results?.[k.id]
    return `<div class="card crit">${critMark(k.status)}<div><b>${esc(k.title.ru)}</b>${said ? `<p class="said">${esc(said)}</p>` : ''}${proof.length ? `<details class="proof"><summary>доказательства · ${proof.length}</summary><div class="evs">${proof.map(ref).join('')}</div></details>` : ''}</div></div>`
  }).join('') : '<p class="muted">В задании не было пунктов для проверки.</p>'}
  <div class="two">
    <div class="card"><b>Не сделано</b>${list((sub?.notDone ?? []).map(esc), 'Всё из задания сделано.')}</div>
    <div class="card"><b>Риски</b>${list(risks.map(r => `${esc(r.title.ru)}${r.statement ? ` <span class="muted">— ${esc(r.statement.ru)}</span>` : ''}`), 'Открытых рисков нет.')}</div>
  </div>
  ${sub?.next.length ? `<div class="card"><b>Что дальше</b>${list(sub.next.map(esc), '')}</div>` : ''}
</section>

<section id="changes"><h2>Что изменилось</h2>${diffBlock}</section>

<section id="decisions"><h2>Решения</h2>
  ${mine.length ? `<p class="muted">Claude принял сам — их можно отменить на приёмке:</p>${mine.map(decisionCard).join('')}` : '<p class="muted">Claude не принимал решений сам.</p>'}
  ${theirs.length ? `<p class="muted">Решил ты:</p>${theirs.map(decisionCard).join('')}` : ''}
  <div class="two">
    <div class="card"><b>Допущения</b>${list(assumptions.map(a => `${esc(a.title.ru)}${a.statement ? ` <span class="muted">— ${esc(a.statement.ru)}</span>` : ''}`), 'Допущений нет.')}</div>
    <div class="card"><b>Тупики — не повторять</b>${list(dead.map(h => `<s>${esc(h.title.ru)}</s>${h.statement ? ` <span class="muted">— ${esc(h.statement.ru)}</span>` : ''}`), 'Тупиков нет.')}</div>
  </div>
  ${rules.length ? `<div class="card"><b>Правила</b>${list(rules.map(c => esc(c.statement?.ru ?? c.title.ru)), '')}</div>` : ''}
</section>

<section id="map"><h2>Карта рассуждений</h2>
  <div class="toolbar">
    <button data-f="all" class="on">все</button><button data-f="decision">решения</button><button data-f="finding">находки</button><button data-f="dead">тупики</button><button data-f="question">вопросы</button><button data-f="criterion">критерии</button>
    <input id="q" placeholder="поиск по карте"><button id="expand">развернуть всё</button>
  </div>
  ${tree(L) || '<p class="muted">Карта пуста.</p>'}
</section>

<section id="turns"><h2>Ходы</h2>
  ${L.turns.length ? `<div class="player"><button id="prev">◀</button><button id="play">▶ проиграть</button><button id="next">▶</button><span id="pos" class="muted"></span><span class="muted">· клавиши ← →</span></div>` : ''}
  <ul class="timeline">${turns || '<li class="muted">Ходов нет.</li>'}</ul>
</section>

<section id="verify"><h2>Как проверить самому</h2>${verify}</section>

<footer>${t?.dir ? `Папка задачи: <code>${esc(t.dir)}</code> — task.md, ledger.md, feedback.md.` : ''}</footer>
</main>
<script>
(function(){
  var nodes=[].slice.call(document.querySelectorAll('.node'));
  var filter='all',query='';
  function match(li){
    var k=li.dataset.kind,s=li.dataset.status;
    var f=filter==='all'||(filter==='dead'?(k==='hypothesis'&&s==='refuted'):k===filter);
    return f&&(!query||li.dataset.text.indexOf(query)>=0);
  }
  function apply(){
    var on=filter!=='all'||query;
    nodes.forEach(function(li){li.classList.remove('hit','dim')});
    if(!on)return;
    nodes.forEach(function(li){
      var m=match(li),sub=[].slice.call(li.querySelectorAll('.node')).some(match);
      if(m){li.classList.add('hit');var d=li.querySelector('details');if(d)d.open=true}
      if(!m&&!sub)li.classList.add('dim');
      if(sub){var dd=li.querySelector('details');if(dd)dd.open=true}
    });
  }
  document.querySelectorAll('[data-f]').forEach(function(b){b.onclick=function(){
    document.querySelectorAll('[data-f]').forEach(function(x){x.classList.remove('on')});b.classList.add('on');filter=b.dataset.f;apply()}});
  var q=document.getElementById('q');if(q)q.oninput=function(){query=q.value.trim().toLowerCase();apply()};
  var ex=document.getElementById('expand'),open=false;
  if(ex)ex.onclick=function(){open=!open;document.querySelectorAll('.node details').forEach(function(d){d.open=open});ex.textContent=open?'свернуть всё':'развернуть всё'};
  document.querySelectorAll('.copy').forEach(function(b){b.onclick=function(){
    var t=document.getElementById(b.dataset.for).textContent;
    if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){b.textContent='скопировано';setTimeout(function(){b.textContent='копировать'},1500)})}});
  var turns=[].slice.call(document.querySelectorAll('.turn')),cur=-1,timer=null;
  var pos=document.getElementById('pos');
  function show(i){
    if(!turns.length)return;cur=Math.max(0,Math.min(turns.length-1,i));
    turns.forEach(function(t,j){t.classList.toggle('cur',j===cur)});
    var n=turns[cur].dataset.n;if(pos)pos.textContent='ход '+n+' из '+turns.length;
    nodes.forEach(function(li){li.classList.toggle('hit',li.dataset.turn===n)});
    turns[cur].scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function stop(){if(timer){clearInterval(timer);timer=null;var p=document.getElementById('play');if(p)p.textContent='▶ проиграть'}}
  var pr=document.getElementById('prev'),nx=document.getElementById('next'),pl=document.getElementById('play');
  if(pr)pr.onclick=function(){stop();show(cur-1)};if(nx)nx.onclick=function(){stop();show(cur+1)};
  if(pl)pl.onclick=function(){if(timer){stop();return}pl.textContent='❚❚ пауза';if(cur>=turns.length-1)cur=-1;timer=setInterval(function(){if(cur>=turns.length-1){stop();return}show(cur+1)},1600)};
  document.addEventListener('keydown',function(e){if(e.target.tagName==='INPUT')return;if(e.key==='ArrowRight'){stop();show(cur+1)}if(e.key==='ArrowLeft'){stop();show(cur-1)}});
})();
</script>
</body></html>
`
}
