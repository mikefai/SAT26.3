/* Printable editions: clean student booklet (default) or annotated key (?key=1). */
(function () {
  'use strict';
  const D = window.SAT_DATA, E = window.SATEngine, R = window.SATRender;
  const app = document.getElementById('app');
  if (!D || !D.modules) {
    app.innerHTML = '<h1>Form data not found</h1><p>Run <code>npm run build</code> to generate <code>js/data.js</code>.</p>';
    return;
  }

  const params = new URLSearchParams(location.search);
  const ids = ['m1', 'm2-higher', 'm2-lower'];
  const labels = { m1: 'Module 1', 'm2-higher': 'Module 2 — Higher route', 'm2-lower': 'Module 2 — Lower route' };
  // Whitelist the query value: it is reused in href attributes below.
  const rawModule = params.get('module') || 'm1';
  const which = rawModule === 'all' || ids.includes(rawModule) ? rawModule : 'm1';
  const annotated = params.get('key') === '1';
  const selected = which === 'all' ? ids : ids.includes(which) ? [which] : ['m1'];

  const DIRECTIONS = `<div class="directions"><strong>Directions.</strong> Each question has its own short passage, which may be a single text, a pair of texts, a poem, research notes, a table, or a graph. Read the passage and the question, then choose the one best answer from the four choices. Base every answer only on the information given. Time allowed: ${Math.round(D.form.timing.moduleSeconds / 60)} minutes for ${D.form.timing.questionsPerModule} questions.</div>`;

  function itemHtml(it, n) {
    const options = E.LETTERS.map(L => `<li><strong>${L})</strong> ${R.inline(it.options[L])}</li>`).join('');
    let annot = '';
    if (annotated) {
      const tear = E.LETTERS.filter(L => L !== it.key).map(L => {
        const d = it.distractors[L];
        return `<li><strong>${L} — ${R.esc(R.trapName(D.taxonomy, d.trap))}:</strong> ${R.inline(d.explanation)}</li>`;
      }).join('');
      annot = `<div class="p-annot">
        <div class="chips" style="margin-bottom:6px"><span class="chip">Key: ${it.key}</span><span class="chip">${R.esc(it.skillCode)} · ${R.esc(it.skill)}</span><span class="chip ${it.band.toLowerCase()}">${R.esc(it.band)} · rating ${it.rating}/5</span><span class="chip">Target ${it.targetSeconds}s</span></div>
        <p style="margin:4px 0"><strong>Why ${it.key} is right:</strong> ${R.inline(it.rationale)}</p>
        <ul style="margin:4px 0;padding-left:1.2em">${tear}</ul>
      </div>`;
    }
    return `<section class="p-item" aria-label="Question ${n}">
      <div class="reading">${R.stimulus(it.stimulus)}</div>
      <div><div class="p-num">Question ${n}</div><p class="stem" style="margin:0">${R.inline(it.stem)}</p><ul class="p-options">${options}</ul></div>
      ${annot}
    </section>`;
  }

  function keyTable(mod) {
    return `<h3>Answer key — ${labels[mod.moduleId]}</h3><div class="table-scroll"><table class="simple answer-key-table">
      <thead><tr><th>Q</th><th>Key</th><th>Domain</th><th>Skill</th><th>Band</th><th>Rating</th><th>Target</th></tr></thead>
      <tbody>${mod.items.map((it, i) => `<tr><td>${i + 1}</td><td><strong>${it.key}</strong></td><td>${R.esc(it.domain)}</td><td>${R.esc(it.skillCode)}</td><td>${R.esc(it.band)}</td><td>${it.rating}</td><td>${it.targetSeconds}s</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  const body = selected.map((id, idx) => {
    const mod = D.modules[id];
    if (!mod) return `<p>Module ${R.esc(id)} is missing.</p>`;
    return `<div class="${idx ? 'module-break' : ''}">
      <h2>Reading and Writing — ${labels[id]}</h2>
      ${id !== 'm1' && !annotated ? '<p class="muted small">Students take only one Module 2. The route is chosen by their Module 1 score (see the routing rule on the start page).</p>' : ''}
      ${DIRECTIONS}
      ${mod.items.map((it, i) => itemHtml(it, i + 1)).join('')}
      ${annotated ? keyTable(mod) : ''}
    </div>`;
  }).join('');

  const link = (m, k) => `print.html?module=${m}${k ? '&key=1' : ''}`;
  document.title = `${annotated ? 'Answer key' : 'Student edition'} — ${selected.map(s => labels[s]).join(', ')}`;
  app.innerHTML = `
    <nav class="print-toolbar no-print" aria-label="Edition">
      <a class="btn ghost" href="index.html">← Home</a>
      ${ids.map(m => `<a class="btn" href="${link(m, annotated)}" ${selected.length === 1 && selected[0] === m ? 'aria-current="page"' : ''}>${labels[m]}</a>`).join('')}
      <a class="btn" href="${link('all', annotated)}" ${which === 'all' ? 'aria-current="page"' : ''}>All modules</a>
      <a class="btn" href="${link(which, !annotated)}">${annotated ? 'Show clean student edition' : 'Show answer key and teardowns'}</a>
      <button type="button" class="btn primary" onclick="window.print()">Print</button>
    </nav>
    <article class="edition">
      <h1>${R.esc(D.form.title)}</h1>
      <p class="muted">${annotated ? 'Teacher edition: answer key, skill tags, difficulty ratings, target times, and distractor teardowns' : 'Student edition'}</p>
      ${body}
      <p class="disclaimer">${R.esc(D.form.disclaimer)}</p>
    </article>`;
})();
