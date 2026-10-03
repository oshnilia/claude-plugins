// The report page's own style and script. Plain strings: no template holes, so the page stays one self-contained file.

export const REPORT_CSS = String.raw`
:root{--ground:#fff;--ink:#172033;--muted:#5e6878;--hair:#e3e7ed;--band:#f1f4f8;--proven:#12b886;--failed:#e03131;--open:#f76707;--dead:#a3abb8;--casing:#fff;
  --font:"Avenir Next","Avenir","Segoe UI Variable Text","Segoe UI","Helvetica Neue",Arial,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,monospace}
@media (prefers-color-scheme:dark){:root{--ground:#0f141d;--ink:#e7ebf2;--muted:#9aa4b5;--hair:#253042;--band:#161d2a;--dead:#5d6778;--casing:#0f141d}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--ground);color:var(--ink);font:17px/1.55 var(--font);font-variant-numeric:tabular-nums}
a{color:inherit}
button{font:inherit;color:inherit}
.col{max-width:1040px;margin:0 auto;padding:0 24px}
.hero{padding:56px 0 36px}
.where{margin:0 0 14px;color:var(--muted);font-size:15px}
h1{font-size:clamp(32px,5.4vw,50px);line-height:1.06;font-weight:600;letter-spacing:-.012em;margin:0;max-width:21ch}
.verdict{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:26px 0 0}
.vtext{font-size:23px;font-weight:600}
.termini{display:flex;gap:6px}
.sq{width:16px;height:16px;border-radius:4px;border:2.5px solid var(--dead);display:inline-block}
.sq.proven{background:var(--proven);border-color:var(--proven)}.sq.failed{background:var(--failed);border-color:var(--failed)}
.lede{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:40px;margin-top:22px;align-items:start}
.summary{margin:0;font-size:19px;line-height:1.55;max-width:60ch}
.you{border-left:4px solid var(--ink);padding:2px 0 2px 20px}
.you h2{font-size:17px;margin:0 0 6px}
.you ol{margin:0;padding-left:20px}.you li{margin:6px 0}
h2{font-size:24px;line-height:1.2;font-weight:600;margin:0 0 6px;letter-spacing:-.005em}
.hint{margin:0;color:var(--muted);font-size:15px;max-width:68ch}
section{padding:44px 0 0}
.maphead{display:flex;justify-content:space-between;align-items:end;gap:20px;flex-wrap:wrap;margin-bottom:16px}
.play{border:2px solid var(--ink);background:var(--ink);color:var(--ground);border-radius:999px;padding:8px 20px;font-weight:600;cursor:pointer;white-space:nowrap}
.play:hover{opacity:.88}.play:focus-visible,.st:focus-visible,.rowlink:focus-visible{outline:3px solid #1f6feb;outline-offset:3px}
.map{overflow-x:auto;overflow-y:hidden;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair);cursor:grab;scrollbar-width:thin;overscroll-behavior-x:contain}
.map.drag{cursor:grabbing;user-select:none}
.map-inner{position:relative}
#mapsvg{display:block}
.line{fill:none;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
.casing{fill:none;stroke:var(--casing);stroke-width:12;stroke-linecap:round;stroke-linejoin:round}
.spur .line{stroke-width:4}.spur .casing{stroke-width:8}
.spur path{transition:stroke-dashoffset .55s cubic-bezier(.3,.7,.2,1)}
.tail{stroke-dasharray:2 9;stroke-width:5}
.lanes-fixed{position:sticky;left:0;top:0;width:0;height:0;z-index:2}
.lane-chip{position:absolute;left:14px;transform:translateY(-50%);display:flex;align-items:center;gap:8px;white-space:nowrap;font-size:13.5px;font-weight:600;
  padding:3px 12px 3px 9px;border-radius:999px;border:0;cursor:pointer;background:color-mix(in srgb,var(--ground) 86%,transparent);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.lane-chip:hover{text-decoration:underline}.lane-chip i{width:18px;height:6px;border-radius:3px;flex:none}
.band{fill:var(--band);transition:x .25s ease,width .25s ease}
.axis line{stroke:var(--hair)}.axis text{font-size:12px;fill:var(--muted)}.axis .cur text{fill:var(--ink);font-weight:600}
.axis .hit{fill:transparent;cursor:pointer}
.playhead{stroke:var(--ink);stroke-width:1.5;stroke-dasharray:3 4;opacity:.55}
.st{cursor:pointer;outline:none}
.st .shape{transform-box:fill-box;transform-origin:center;transition:transform .5s cubic-bezier(.34,1.56,.64,1),opacity .2s ease}
.st.off .shape{transform:scale(0);opacity:0}
.st .halo{fill:none;stroke-width:2.5;opacity:0}
.st.sel .halo{opacity:1;animation:halo 1.6s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes halo{0%{transform:scale(.7);opacity:.9}100%{transform:scale(1.6);opacity:0}}
.st:hover .shape{transform:scale(1.25)}
svg.focus .st:not(.lit) .shape,svg.focus .spur:not(.lit),svg.focus .lane:not(.lit) .main{opacity:.16}

.tip{position:absolute;pointer-events:none;background:var(--ink);color:var(--ground);font-size:13px;line-height:1.35;padding:6px 10px;border-radius:8px;max-width:280px;transform:translate(-50%,calc(-100% - 14px));white-space:normal;z-index:3}
.tip b{display:block;font-weight:600;opacity:.75;font-size:12px}
.turnbar.swap{animation:swap .32s ease-out}
@keyframes swap{from{opacity:.25;transform:translateY(5px)}to{opacity:1;transform:none}}
.turnbar{display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px 28px;align-items:start;padding:18px 0 0}
.tn{font-size:34px;line-height:1;font-weight:600;min-width:3.2ch}
.tn small{display:block;font-size:13px;font-weight:400;color:var(--muted);margin-top:6px}
.ask{margin:0;font-weight:600}.did{margin:4px 0 0;color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--hair);border-radius:999px;padding:2px 10px 2px 8px;font-size:13.5px;background:none;cursor:pointer;max-width:100%;text-align:left}
.chip:hover{border-color:var(--ink)}
.dot{width:9px;height:9px;border-radius:50%;flex:none}
.legend{display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:22px;font-size:14px;color:var(--muted)}
.legend span{display:inline-flex;align-items:center;gap:8px}
.legend svg{flex:none}
.swatch{width:26px;height:6px;border-radius:3px;display:inline-block}
.drawer{position:fixed;top:0;right:0;bottom:0;width:min(430px,92vw);background:var(--ground);border-left:1px solid var(--hair);
  transform:translateX(104%);visibility:hidden;transition:transform .4s cubic-bezier(.2,.8,.2,1),visibility 0s linear .4s;overflow-y:auto;padding:26px 26px 40px;z-index:10}
.drawer.open{transform:none;visibility:visible;box-shadow:-24px 0 48px rgba(15,20,29,.14);transition:transform .4s cubic-bezier(.2,.8,.2,1),visibility 0s}
.dk{font-size:14px;font-weight:600}
.close{position:absolute;top:18px;right:18px;border:1px solid var(--hair);background:none;border-radius:999px;width:34px;height:34px;cursor:pointer;font-size:18px;line-height:1}
.drawer h3{font-size:24px;line-height:1.2;font-weight:600;margin:10px 40px 10px 0}
.drawer p{margin:8px 0}
.drawer h4{font-size:14px;margin:22px 0 6px;color:var(--muted);font-weight:600}
.kv{margin:6px 0}.kv b{font-weight:600}
.ev{display:block;font:13px/1.45 var(--mono);background:var(--band);border-radius:6px;padding:5px 8px;margin:5px 0;word-break:break-word;text-decoration:none}
a.ev:hover{text-decoration:underline}
.rowlink{display:flex;gap:10px;align-items:baseline;width:100%;text-align:left;background:none;border:0;padding:6px 0;cursor:pointer;border-bottom:1px solid var(--hair)}
.rowlink:hover .t{text-decoration:underline}
.forks{margin-top:14px}
.fork{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:4px 12px;align-items:start;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--hair);padding:14px 0;cursor:pointer}
.fork:hover .t{text-decoration:underline}
.fork .t{font-weight:600}.fork .s{grid-column:2;color:var(--muted);font-size:15.5px}.fork .w{color:var(--muted);font-size:14px;white-space:nowrap}
.fork.dead .t{text-decoration:line-through;text-decoration-color:var(--dead)}
.crit{border-top:1px solid var(--hair);padding:16px 0;display:grid;grid-template-columns:28px minmax(0,1fr);gap:2px 12px}
.crit .t{font-weight:600}.crit p{margin:4px 0 0}
details.proof summary{cursor:pointer;color:var(--muted);font-size:15px;margin-top:6px}
.file{border-top:1px solid var(--hair)}
.file summary{display:grid;grid-template-columns:minmax(0,1fr) 120px 90px;gap:12px;align-items:center;padding:10px 0;cursor:pointer;list-style:none}
.file summary::-webkit-details-marker{display:none}
.file code{font:14px var(--mono);overflow-wrap:anywhere}
.bar{display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--band)}
.bar i{display:block;height:100%}.bar .a{background:var(--proven)}.bar .d{background:var(--failed)}
.nums{font-size:13px;color:var(--muted);text-align:right}
.diff{margin:0 0 14px;max-height:520px;overflow:auto;font:12.5px/1.5 var(--mono);background:var(--band);border-radius:8px;padding:10px 0}
.diff span{display:block;padding:0 12px;white-space:pre}.diff .add{background:color-mix(in srgb,var(--proven) 16%,transparent)}.diff .del{background:color-mix(in srgb,var(--failed) 14%,transparent)}.diff .hunk{color:var(--muted)}
.three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px}
.three h3{font-size:17px;margin:0 0 6px}
ul.plain{margin:0;padding-left:20px}ul.plain li{margin:6px 0}
.muted{color:var(--muted)}
.cmd{display:flex;gap:12px;align-items:flex-start;border-top:1px solid var(--hair);padding:12px 0}
.cmd span{flex:1}
.copy{border:1px solid var(--hair);background:none;border-radius:999px;padding:3px 12px;font-size:13px;cursor:pointer;white-space:nowrap}
footer{margin:64px 0 48px;color:var(--muted);font-size:14px}
footer code{font:13px var(--mono);overflow-wrap:anywhere}
@media (max-width:760px){.lede,.three{grid-template-columns:1fr}.turnbar{grid-template-columns:1fr}.file summary{grid-template-columns:minmax(0,1fr) 70px}.nums{display:none}
  .drawer{top:auto;left:0;width:auto;height:72vh;border-left:0;border-top:1px solid var(--hair);border-radius:16px 16px 0 0;transform:translateY(104%)}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`

export const REPORT_JS = String.raw`
(function(){
  var D = JSON.parse(document.getElementById('report-data').textContent);
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['#1f6feb','#0ca4c4','#d6336c','#f59f00','#7048e8','#2b8a3e'];
  var KIND = {goal:'цель',task:'шаг',decision:'решение',question:'вопрос',hypothesis:'гипотеза',finding:'находка',open:'вопрос к тебе',assumption:'допущение',risk:'риск',criterion:'пункт приёмки'};
  var STATUS = {done:'сделано',doing:'в работе',todo:'впереди',accepted:'принято',proven:'доказано',failed:'не вышло',refuted:'опровергнуто, это тупик',supported:'подтвердилось',
    answered:'отвечено',open:'открыт',pending:'ждёт ответа',lifted:'снят',active:'в работе',stated:'',testing:'проверяем'};
  var svg = document.getElementById('mapsvg');
  if (!svg) return;
  var byId = {};
  D.nodes.forEach(function(n, i){ n.i = i; byId[n.id] = n; });
  function par(n){ return n.parent && byId[n.parent] ? byId[n.parent] : null; }
  function rootOf(n){ var r = n; while (par(r)) r = par(r); return r; }
  function kids(id){ return D.nodes.filter(function(x){ return x.parent === id; }); }
  function desc(n){ var out = []; kids(n.id).forEach(function(k){ out.push(k); out = out.concat(desc(k)); }); return out; }
  function onMap(n){ return n.kind !== 'constraint' && n.kind !== 'action'; }
  function byTurn(a, b){ return a.turn - b.turn || a.i - b.i; }
  function dead(n){ return n.kind === 'hypothesis' && n.status === 'refuted'; }
  function el(tag, attrs, parent){ var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function make(tag, cls, text, parent){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }

  // ---- time: one column per turn, as wide as the busiest line needs ----
  var turnNs = D.turns.map(function(t){ return t.n; });
  D.nodes.forEach(function(n){ if (turnNs.indexOf(n.turn) < 0) turnNs.push(n.turn); });
  turnNs.sort(function(a, b){ return a - b; });
  if (!turnNs.length) turnNs = [1];
  var turnByN = {}; D.turns.forEach(function(t){ turnByN[t.n] = t; });
  function tIdx(n){ return turnNs.indexOf(n); }

  // ---- lines: one per goal; its direct children are stations, deeper items hang on branches ----
  var goals = D.nodes.filter(function(n){ return n.kind === 'goal' && !par(n); });
  var lanes = goals.map(function(g, gi){
    var main = kids(g.id).filter(onMap).sort(byTurn);
    main.forEach(function(s){ s.spur = desc(s).filter(onMap).sort(byTurn); });
    return { g: g, color: COLORS[gi % COLORS.length], main: main, idx: gi };
  });
  lanes.forEach(function(l){ l.g.lane = l; l.main.forEach(function(s){ s.lane = l; s.spur.forEach(function(c){ c.lane = l; c.anchor = s; }); }); });

  var GAP = 34, PAD = 30, MINCOL = 58, LEFT = 32, LEVEL = 30, SG = 24;
  var cols = {}, x = LEFT;
  turnNs.forEach(function(t){
    var cnt = 0;
    lanes.forEach(function(l){ var c = l.main.filter(function(s){ return s.turn === t; }).length + (l.g.turn === t ? 1 : 0); if (c > cnt) cnt = c; });
    cols[t] = { x: x, w: Math.max(MINCOL, cnt * GAP + PAD), k: {} };
    x += cols[t].w;
  });
  var colEnd = x;
  function place(t, li){ var c = cols[t]; c.k[li] = c.k[li] || 0; var px = c.x + PAD / 2 + (c.k[li] + 0.5) * GAP; c.k[li]++; return px; }

  var y = 18, maxX = colEnd;
  lanes.forEach(function(l, li){
    l.g.x = place(l.g.turn, li);
    l.main.forEach(function(s){ s.x = place(s.turn, li); });
    var last = { '-1': {}, '1': {} }, up = 0, down = 0, flip = -1;
    l.main.forEach(function(s){
      if (!s.spur.length) return;
      var start = s.x, end = s.x + 26 + s.spur.length * SG, pick = null;
      for (var lev = 1; lev <= 6 && !pick; lev++) {
        var sides = [flip, -flip];
        for (var j = 0; j < 2; j++) { var e = last[sides[j]][lev]; if (e == null || e < start - 10) { pick = { side: sides[j], lev: lev }; break; } }
      }
      if (!pick) pick = { side: -1, lev: 7 };
      flip = -flip;
      last[pick.side][pick.lev] = end;
      s.side = pick.side; s.lev = pick.lev;
      if (pick.side < 0) up = Math.max(up, pick.lev); else down = Math.max(down, pick.lev);
      if (end > maxX) maxX = end;
    });
    l.top = y;
    l.y = y + 34 + up * LEVEL;
    l.g.y = l.y;
    l.main.forEach(function(s){
      s.y = l.y;
      s.spur.forEach(function(c, ci){ c.x = s.x + 30 + ci * SG; c.y = l.y + s.side * s.lev * LEVEL; c.ci = ci; });
    });
    y = l.y + down * LEVEL + 40;
  });
  var AXIS_Y = y + 4, H = AXIS_Y + 40, W = Math.max(colEnd, maxX) + 48;
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  document.querySelector('.map-inner').style.width = W + 'px';

  var defs = el('defs', {}, svg);
  var clip = el('clipPath', { id: 'reveal' }, defs);
  var reveal = el('rect', { x: 0, y: 0, width: W, height: H }, clip);
  var band = el('rect', { class: 'band', x: 0, y: 0, width: 0, height: AXIS_Y }, svg);
  var gLanes = el('g', {}, svg);
  var stations = [], spurs = [];

  function shape(n, color, parent){
    var g = el('g', { class: 'shape' }, parent);
    var k = n.kind, s = n.status;
    if (k === 'goal') { el('circle', { r: 10, fill: color }, g); el('circle', { r: 4, fill: 'var(--ground)' }, g); }
    else if (k === 'decision') { el('circle', { r: 8.5, fill: 'var(--ground)', stroke: 'var(--ink)', 'stroke-width': 3.5 }, g); }
    else if (k === 'criterion') {
      var c = s === 'proven' ? 'var(--proven)' : s === 'failed' ? 'var(--failed)' : 'var(--ground)';
      el('rect', { x: -8, y: -8, width: 16, height: 16, rx: 4, fill: c, stroke: s === 'proven' || s === 'failed' ? c : 'var(--dead)', 'stroke-width': 2.5 }, g);
      if (s === 'proven') el('path', { d: 'M-4 0.5 L-1 3.5 L4.5 -3', fill: 'none', stroke: '#fff', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    }
    else if (dead(n)) { el('rect', { x: -2, y: -9, width: 4, height: 18, rx: 2, fill: 'var(--dead)' }, g); }
    else if (k === 'hypothesis') { el('circle', { r: 6, fill: s === 'supported' ? color : 'var(--ground)', stroke: color, 'stroke-width': 2.5 }, g); }
    else if (k === 'question') { el('circle', { r: 6.5, fill: 'var(--ground)', stroke: color, 'stroke-width': 2.5, 'stroke-dasharray': '3 2.4' }, g); }
    else if (k === 'finding') { el('circle', { r: 4.5, fill: 'var(--ink)' }, g); }
    else if (k === 'open') { el('circle', { r: 6.5, fill: s === 'answered' ? 'var(--ground)' : 'var(--open)', stroke: 'var(--open)', 'stroke-width': 2.5 }, g); }
    else if (k === 'risk') { el('path', { d: 'M0 -8 L7.5 6 L-7.5 6 Z', fill: s === 'lifted' ? 'var(--ground)' : 'var(--open)', stroke: s === 'lifted' ? 'var(--dead)' : 'var(--open)', 'stroke-width': 2, 'stroke-linejoin': 'round' }, g); }
    else if (k === 'assumption') { el('circle', { r: 5, fill: 'var(--ground)', stroke: 'var(--dead)', 'stroke-width': 2.5 }, g); }
    else { el('circle', { r: 6.5, fill: s === 'done' ? color : 'var(--ground)', stroke: color, 'stroke-width': 3 }, g); }
    return g;
  }
  function station(n, color, parent){
    var g = el('g', { class: 'st', transform: 'translate(' + n.x + ',' + n.y + ')', tabindex: 0, role: 'button', 'aria-label': (KIND[n.kind] || n.kind) + ': ' + n.title }, parent);
    el('circle', { class: 'halo', r: 13, stroke: color }, g);
    shape(n, color, g);
    if (n.ci != null) g.querySelector('.shape').style.transitionDelay = (0.18 + n.ci * 0.06) + 's';
    g.addEventListener('click', function(ev){ ev.stopPropagation(); select(n.id, false); });
    g.addEventListener('keydown', function(ev){ if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(n.id, false); } });
    g.addEventListener('pointerenter', function(){ tipShow(n); });
    g.addEventListener('pointerleave', tipHide);
    n.el = g;
    stations.push(n);
    return g;
  }

  lanes.forEach(function(l){
    var lg = el('g', { class: 'lane' }, gLanes);
    l.el = lg;
    var chip = make('button', 'lane-chip', null, document.getElementById('lanes-fixed'));
    chip.style.top = (l.top + 13) + 'px';
    var sw = make('i', '', null, chip); sw.style.background = l.color;
    make('span', '', l.g.title, chip);
    chip.addEventListener('click', function(){ select(l.g.id, false); });
    var pts = [l.g].concat(l.main);
    var x0 = Math.min.apply(null, pts.map(function(p){ return p.x; })), x1 = Math.max.apply(null, pts.map(function(p){ return p.x; }));
    var main = el('g', { class: 'main', 'clip-path': 'url(#reveal)' }, lg);
    // branches first, so the main line sits on top of their roots
    l.main.forEach(function(s){
      if (!s.spur.length) return;
      var sg = el('g', { class: 'spur' }, lg);
      var yy = l.y + s.side * s.lev * LEVEL, xe = s.spur[s.spur.length - 1].x;
      var d = 'M' + s.x + ' ' + l.y + ' L' + (s.x + 18) + ' ' + yy + ' L' + xe + ' ' + yy;
      el('path', { class: 'casing', d: d }, sg);
      var p = el('path', { class: 'line', d: d, stroke: l.color, 'stroke-opacity': 0.6 }, sg);
      var len = Math.ceil(Math.abs(yy - l.y) * 1.3 + (xe - s.x) + 4);
      sg.querySelectorAll('path').forEach(function(pp){ pp.style.strokeDasharray = len; pp.style.strokeDashoffset = 0; });
      s.spurEl = sg;
      spurs.push(s);
    });
    el('path', { class: 'casing', d: 'M' + x0 + ' ' + l.y + ' L' + x1 + ' ' + l.y }, main);
    el('path', { class: 'line', d: 'M' + x0 + ' ' + l.y + ' L' + x1 + ' ' + l.y, stroke: l.color }, main);
    if (l.g.status === 'done') el('rect', { x: x1 + 10, y: l.y - 9, width: 5, height: 18, rx: 2, fill: l.color }, main);
    else el('path', { class: 'line tail', d: 'M' + (x1 + 14) + ' ' + l.y + ' L' + (x1 + 52) + ' ' + l.y, stroke: l.color }, main);
    var sts = el('g', {}, lg);
    station(l.g, l.color, sts);
    l.main.forEach(function(s){ station(s, l.color, sts); });
    l.main.forEach(function(s){ (s.spurEl ? s.spur : []).forEach(function(c){ station(c, l.color, s.spurEl); }); });
  });

  // ---- the turn axis doubles as a scrubber ----
  var axis = el('g', { class: 'axis' }, svg);
  el('line', { x1: LEFT, x2: colEnd, y1: AXIS_Y, y2: AXIS_Y }, axis);
  var ticks = {};
  turnNs.forEach(function(t){
    var c = cols[t], g = el('g', {}, axis);
    el('line', { x1: c.x, x2: c.x, y1: AXIS_Y - 4, y2: AXIS_Y + 4 }, g);
    var tx = el('text', { x: c.x + c.w / 2, y: AXIS_Y + 22, 'text-anchor': 'middle' }, g);
    tx.textContent = t;
    var hit = el('rect', { class: 'hit', x: c.x, y: AXIS_Y - 14, width: c.w, height: 40 }, g);
    hit.addEventListener('click', function(ev){ ev.stopPropagation(); stopPlay(); goTurn(t); });
    ticks[t] = g;
  });
  var head = el('line', { class: 'playhead', x1: 0, x2: 0, y1: 0, y2: AXIS_Y }, svg);

  // ---- play state ----
  var playX = W, curTurn = null, raf = 0, playing = false;
  function turnAt(px){ var t = turnNs[0]; turnNs.forEach(function(n){ if (cols[n].x <= px) t = n; }); return t; }
  function setPlay(px){
    playX = px;
    reveal.setAttribute('width', Math.max(0, px));
    head.setAttribute('x1', px); head.setAttribute('x2', px);
    head.style.display = px >= W - 1 ? 'none' : '';
    var t = turnAt(px), ti = tIdx(t);
    stations.forEach(function(n){ var ax = n.anchor ? n.anchor.x : n.x; n.el.classList.toggle('off', ax > px + 1 || tIdx(n.turn) > ti); });
    spurs.forEach(function(s){
      var off = s.x > px + 1 || tIdx(s.turn) > ti;
      s.spurEl.classList.toggle('off', off);
      s.spurEl.querySelectorAll('path').forEach(function(pp){ pp.style.strokeDashoffset = off ? pp.style.strokeDasharray : 0; });
    });
    if (t !== curTurn) setTurn(t);
  }
  function setTurn(t){
    curTurn = t;
    var c = cols[t];
    band.setAttribute('x', c.x); band.setAttribute('width', c.w);
    for (var k in ticks) ticks[k].classList.toggle('cur', +k === t);
    turnCard(t);
  }
  function goTurn(t){ setPlay(cols[t].x + cols[t].w - 1); follow(cols[t].x + cols[t].w / 2, true); }
  function follow(px, smooth, k){
    var m = document.getElementById('map');
    var target = px - m.clientWidth * (k == null ? 0.55 : k);
    if (smooth && m.scrollTo) m.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' }); else m.scrollLeft = target;
  }
  var btn = document.getElementById('play');
  function stopPlay(){ if (raf) cancelAnimationFrame(raf); raf = 0; playing = false; btn.textContent = playX >= W - 1 ? 'Проиграть сессию ещё раз' : 'Продолжить'; }
  function play(fromStart){
    if (playing) { stopPlay(); return; }
    var from = fromStart || playX >= W - 1 ? 0 : playX;
    var dur = Math.min(5200, Math.max(2600, turnNs.length * 260)) * (1 - from / W);
    var t0 = performance.now();
    playing = true; btn.textContent = 'Пауза';
    function step(now){
      var k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      var px = from + (W - from) * e;
      setPlay(px); follow(px, false);
      if (k < 1) raf = requestAnimationFrame(step); else { raf = 0; playing = false; setPlay(W); btn.textContent = 'Проиграть сессию ещё раз'; }
    }
    raf = requestAnimationFrame(step);
  }
  btn.addEventListener('click', function(){ play(false); });

  // ---- turn card under the map ----
  function turnCard(t){
    var box = document.getElementById('turncard'); box.innerHTML = '';
    if (!reduce) { box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap'); }
    var tr = turnByN[t];
    var n = make('div', 'tn', 'Ход ' + t, box);
    if (tr && tr.at) make('small', '', tr.at, n);
    var body = make('div', '', null, box);
    make('p', 'ask', tr ? tr.ask || 'Без текста' : 'Ход без записи', body);
    if (tr && tr.did) make('p', 'did', tr.did, body);
    var made = D.nodes.filter(function(x){ return x.turn === t && onMap(x) && x.lane; }).slice(0, 10);
    if (made.length) {
      var chips = make('div', 'chips', null, body);
      made.forEach(function(m){
        var b = make('button', 'chip', null, chips);
        var dt = make('span', 'dot', null, b); dt.style.background = dead(m) ? 'var(--dead)' : m.kind === 'decision' ? 'var(--ink)' : m.lane.color;
        make('span', '', m.title, b);
        b.addEventListener('click', function(){ select(m.id, false); });
      });
    }
  }

  // ---- tooltip ----
  var tip = document.getElementById('tip');
  function tipShow(n){ tip.innerHTML = ''; make('b', '', dead(n) ? 'тупик' : KIND[n.kind] || n.kind, tip); tip.appendChild(document.createTextNode(n.title)); tip.style.left = n.x + 'px'; tip.style.top = n.y + 'px'; tip.hidden = false; }
  function tipHide(){ tip.hidden = true; }

  // ---- selection: focus the lineage on the map and open the details ----
  var drawer = document.getElementById('drawer'), selected = null;
  function lineage(n){ var ids = {}; var p = n; while (p) { ids[p.id] = 1; p = par(p); } desc(n).forEach(function(d){ ids[d.id] = 1; }); return ids; }
  function select(id, scroll){
    var n = byId[id]; if (!n) return;
    if (!n.el) { openDrawer(n); return; }
    if (n.el.classList.contains('off')) { stopPlay(); setPlay(W); }
    if (selected && selected.el) selected.el.classList.remove('sel');
    selected = n; n.el.classList.add('sel');
    var ids = lineage(n);
    svg.classList.add('focus');
    stations.forEach(function(s){ s.el.classList.toggle('lit', !!ids[s.id]); });
    spurs.forEach(function(s){ s.spurEl.classList.toggle('lit', !!ids[s.id]); });
    lanes.forEach(function(l){ l.el.classList.toggle('lit', l === n.lane); });
    if (scroll) document.getElementById('route').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    // the drawer covers the right side on wide screens: keep the station in the open part
    follow(n.x, true, window.innerWidth > 760 ? 0.3 : 0.5);
    openDrawer(n);
  }
  function clearSel(){
    if (selected && selected.el) selected.el.classList.remove('sel');
    selected = null; svg.classList.remove('focus');
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
  }
  function link(text, id, parent){ var b = make('button', 'rowlink', null, parent); make('span', 't', text, b); b.addEventListener('click', function(){ select(id, false); }); return b; }
  function openDrawer(n){
    var body = document.getElementById('drawer-body'); body.innerHTML = '';
    var k = make('div', 'dk', dead(n) ? 'тупик' : KIND[n.kind] || n.kind, body);
    k.style.color = dead(n) ? 'var(--dead)' : n.kind === 'decision' ? 'var(--ink)' : n.lane ? n.lane.color : 'var(--ink)';
    make('h3', '', n.title, body);
    if (n.st && n.st !== n.title) make('p', '', n.st, body);
    var sw = STATUS[n.status]; if (sw == null) sw = n.status;
    if (sw) make('p', 'muted', 'Статус: ' + sw, body);
    if (n.kind === 'criterion' && D.results[n.id]) make('p', '', D.results[n.id], body);
    if (n.kind === 'decision') {
      make('p', 'muted', n.by === 'user' ? 'Решил ты.' : 'Решил Claude сам: это можно отменить на приёмке.', body);
      [['Почему', n.ctx], ['Выбрали', n.chosen], ['Цена', n.accepting]].forEach(function(r){ if (r[1]) { var p = make('p', 'kv', null, body); make('b', '', r[0] + ': ', p); p.appendChild(document.createTextNode(r[1])); } });
      if (n.rejected && n.rejected.length) { make('h4', '', 'Отвергли', body); var ul = make('ul', 'plain', null, body); n.rejected.forEach(function(r){ make('li', '', r, ul); }); }
    }
    if (n.ev && n.ev.length) {
      make('h4', '', 'Доказательства', body);
      n.ev.forEach(function(r){
        if (/^https?:\/\//.test(r)) { var a = make('a', 'ev', r.replace(/^https?:\/\//, ''), body); a.href = r; a.target = '_blank'; a.rel = 'noreferrer'; }
        else make('div', 'ev', r, body);
      });
    }
    var chain = []; var p = par(n); while (p) { chain.unshift(p); p = par(p); }
    if (chain.length) { make('h4', '', 'Откуда', body); chain.forEach(function(c){ link(c.title, c.id, body); }); }
    var inside = kids(n.id).filter(function(x){ return x.kind !== 'action'; });
    if (inside.length) { make('h4', '', 'Внутри', body); inside.forEach(function(c){ link((dead(c) ? 'тупик: ' : '') + c.title, c.id, body); }); }
    var tr = turnByN[n.turn];
    if (tr) {
      make('h4', '', 'Ход ' + n.turn, body);
      var b = make('button', 'rowlink', null, body); make('span', 't', tr.ask || 'Без текста', b);
      b.addEventListener('click', function(){ stopPlay(); goTurn(n.turn); });
    }
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
  }
  document.getElementById('drawer-close').addEventListener('click', clearSel);
  document.addEventListener('keydown', function(ev){
    if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName)) return;
    if (ev.key === 'Escape') clearSel();
    var i = tIdx(curTurn);
    if (ev.key === 'ArrowRight' && i < turnNs.length - 1) { stopPlay(); goTurn(turnNs[i + 1]); }
    if (ev.key === 'ArrowLeft' && i > 0) { stopPlay(); goTurn(turnNs[i - 1]); }
  });
  svg.addEventListener('click', function(){ if (selected) clearSel(); });
  document.querySelectorAll('[data-node]').forEach(function(b){ b.addEventListener('click', function(){ select(b.getAttribute('data-node'), true); }); });

  // ---- drag to pan ----
  var map = document.getElementById('map'), drag = null;
  map.addEventListener('pointerdown', function(ev){ if (ev.pointerType !== 'mouse' || ev.button !== 0) return; drag = { x: ev.clientX, s: map.scrollLeft, moved: false }; });
  window.addEventListener('pointermove', function(ev){ if (!drag) return; var dx = ev.clientX - drag.x; if (Math.abs(dx) > 4) { drag.moved = true; map.classList.add('drag'); } map.scrollLeft = drag.s - dx; });
  window.addEventListener('pointerup', function(){ if (drag && drag.moved) { var stop = function(e){ e.stopPropagation(); map.removeEventListener('click', stop, true); }; map.addEventListener('click', stop, true); } drag = null; map.classList.remove('drag'); });

  // ---- copy buttons ----
  document.querySelectorAll('.copy').forEach(function(b){ b.addEventListener('click', function(){
    var t = document.getElementById(b.getAttribute('data-for')).textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function(){ b.textContent = 'Скопировано'; setTimeout(function(){ b.textContent = 'Копировать'; }, 1500); });
  }); });

  // ---- the one orchestrated moment: the session draws itself ----
  if (reduce || !D.turns.length) { setPlay(W); stopPlay(); }
  else { setPlay(0); setTimeout(function(){ play(true); }, 450); }
})();
`
