/* Score report + annotated review of a finished attempt. */
(function () {
  'use strict';
  const D = window.SAT_DATA, E = window.SATEngine, R = window.SATRender;
  const app = document.getElementById('app');
  const RESULT_KEY = 'rwpf.result.v1';

  if (!D || !D.modules || !D.modules.m1) {
    app.innerHTML = '<h1>Form data not found</h1><p>Run <code>npm run build</code> to generate <code>js/data.js</code>.</p>';
    return;
  }

  function loadResult() {
    const m = /[#&]r=([^&]+)/.exec(location.hash);
    if (m) {
      const decoded = E.decodeResult(D.modules, decodeURIComponent(m[1]));
      if (decoded) return decoded;
    }
    try {
      const v = localStorage.getItem(RESULT_KEY);
      const r = v ? JSON.parse(v) : null;
      if (r && r.m1Answers && r.route && D.modules[r.route]) return r;
    } catch (e) { /* storage unavailable */ }
    return null;
  }

  const result = loadResult();
  if (!result) {
    app.innerHTML = `<h1>No finished attempt found</h1>
      <p>Complete both modules of the practice form to see your score report here.</p>
      <div class="actions"><a class="btn primary" href="test.html?new=1">Start the practice form</a><a class="btn" href="index.html">Home</a></div>
      <p class="muted small">Answer keys with full explanations are available without taking the test: <a href="print.html?module=m1&amp;key=1">Module 1 key</a> · <a href="print.html?module=m2-higher&amp;key=1">Module 2 higher key</a> · <a href="print.html?module=m2-lower&amp;key=1">Module 2 lower key</a>.</p>`;
    return;
  }

  const report = E.scoreForm(D.modules, result, D.form.routing);
  const routing = D.form.routing;
  const m1 = report.modules[0], m2 = report.modules[1];
  const routeName = report.route === routing.higher ? 'Higher' : 'Lower';
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const bar = (a, b) => `<div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${pct(a, b)}%"></div></div>`;

  function breakdown(title, map, order) {
    const keys = order.filter(k => map[k]);
    return `<div class="card"><h2 style="margin-top:0">${title}</h2><div class="table-scroll"><table class="simple">
      <thead><tr><th scope="col">${title.replace('By ', '')}</th><th scope="col">Correct</th><th scope="col" style="width:40%">&nbsp;</th></tr></thead>
      <tbody>${keys.map(k => `<tr><th scope="row" style="text-transform:none;letter-spacing:0;font-size:.9375rem;color:var(--text)">${R.esc(k)}</th><td>${map[k].raw} / ${map[k].total}</td><td>${bar(map[k].raw, map[k].total)}</td></tr>`).join('')}</tbody>
    </table></div></div>`;
  }

  const skillOrder = D.taxonomy.skills.map(s => s.name);
  const domainOrder = D.taxonomy.domainOrder;
  const timeLine = result.secondsUsed
    ? `<p class="muted small">Time used: Module 1 ${E.formatTime(result.secondsUsed.m1)} · Module 2 ${E.formatTime(result.secondsUsed.m2)}</p>` : '';

  function itemCard(it, n) {
    const status = it.chosen == null ? ['Omitted', 'bad'] : it.correct ? ['Correct', 'ok'] : ['Incorrect', 'bad'];
    const opts = E.LETTERS.map(L => {
      const isKey = L === it.key;
      const cls = isKey ? 'correct' : L === it.chosen ? 'chosen-wrong' : '';
      const tags = [isKey ? 'Correct answer' : '', L === it.chosen ? 'Your answer' : ''].filter(Boolean).map(t => `<span class="tag">${t}</span>`).join(' ');
      const d = it.distractors[L];
      const note = isKey
        ? `<div class="teardown"><strong>Why it's right:</strong> ${R.inline(it.rationale)}</div>`
        : `<div class="teardown"><strong>Trap — ${R.esc(R.trapName(D.taxonomy, d.trap))}:</strong> ${R.inline(d.explanation)}</div>`;
      return `<li class="${cls}"><strong>${L}.</strong> ${R.inline(it.options[L])} ${tags}${note}</li>`;
    }).join('');
    const modLabel = it.moduleId === 'm1' ? 'Module 1' : 'Module 2';
    return `<article class="card item-card" data-domain="${R.esc(it.domain)}" data-status="${status[0].toLowerCase()}">
      <header>
        <h3 style="margin:0">${modLabel} · Question ${n}</h3>
        <span class="status ${status[1]}">${status[0]}</span>
      </header>
      <div class="chips">
        <span class="chip">${R.esc(it.skillCode)} · ${R.esc(it.skill)}</span>
        <span class="chip ${it.band.toLowerCase()}">${R.esc(it.band)} · rating ${it.rating}/5</span>
        <span class="chip">Target ${it.targetSeconds}s</span>
      </div>
      <details class="passage" ${it.correct ? '' : 'open'}><summary>Passage</summary><div class="reading">${R.stimulus(it.stimulus)}</div></details>
      <p class="stem" style="margin-bottom:0">${R.inline(it.stem)}</p>
      <ul class="key-list">${opts}</ul>
    </article>`;
  }

  let counter = { m1: 0, m2: 0 };
  const cards = report.items.map(it => {
    const k = it.moduleId === 'm1' ? 'm1' : 'm2';
    counter[k] += 1;
    return itemCard(it, counter[k]);
  }).join('');

  app.innerHTML = `
    <nav class="site no-print small"><a href="index.html">← Home</a></nav>
    <h1>Score report</h1>
    <div class="card">
      <div class="score-hero">
        <div><div class="score-big">${report.raw}<span class="muted" style="font-size:1.5rem"> / ${report.total}</span></div><div class="muted">questions correct (raw score)</div></div>
        <div>
          <div><strong>Module 1:</strong> ${m1.raw} / ${m1.total}</div>
          <div><strong>Module 2 (${routeName} route):</strong> ${m2.raw} / ${m2.total}</div>
        </div>
      </div>
      <p class="small" style="margin-bottom:0">Routing: ${m1.raw} correct in Module 1 is ${m1.raw >= routing.threshold ? 'at or above' : 'below'} the threshold of ${routing.threshold} / ${routing.total}, so Module 2 used the <strong>${routeName.toLowerCase()} route</strong>. ${R.esc(routing.note)}</p>
      ${report.routeConsistent ? '' : '<p class="small" style="color:var(--bad)">Note: the recorded route does not match the Module 1 score.</p>'}
      ${timeLine}
      <p class="muted small" style="margin-bottom:0">This form reports raw scores only. It does not estimate a scaled score.</p>
    </div>
    <div class="grid-2" style="margin-top:16px">
      ${breakdown('By domain', report.byDomain, domainOrder)}
      ${breakdown('By difficulty', report.byBand, ['Easy', 'Medium', 'Hard'])}
    </div>
    <div style="margin-top:16px">${breakdown('By skill', report.bySkill, skillOrder)}</div>
    <h2 style="margin-top:32px">Question review</h2>
    <div class="filters no-print" role="group" aria-label="Filter questions">
      <button type="button" class="btn" data-filter="all" aria-pressed="true">All</button>
      <button type="button" class="btn" data-filter="missed" aria-pressed="false">Incorrect or omitted</button>
      ${domainOrder.map(d => `<button type="button" class="btn" data-filter="${R.esc(d)}" aria-pressed="false">${R.esc(d)}</button>`).join('')}
      <button type="button" class="btn ghost" id="print-btn">Print report</button>
    </div>
    <div id="items">${cards}</div>
    <div class="actions no-print"><a class="btn primary" href="test.html?new=1">Take the form again</a><a class="btn" href="index.html">Home</a></div>
    <p class="disclaimer">${R.esc(D.form.disclaimer)}</p>`;

  app.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'print-btn') { app.querySelectorAll('details.passage').forEach(d => { d.open = true; }); window.print(); return; }
    const f = b.dataset.filter;
    if (!f) return;
    app.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    app.querySelectorAll('.item-card').forEach(card => {
      const show = f === 'all' || (f === 'missed' ? card.dataset.status !== 'correct' : card.dataset.domain === f);
      card.hidden = !show;
    });
  });
})();
