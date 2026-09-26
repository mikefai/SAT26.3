/* Adaptive test runner: Module 1 → routing → Module 2 → review.html. */
(function () {
  'use strict';
  const D = window.SAT_DATA, E = window.SATEngine, R = window.SATRender;
  const app = document.getElementById('app');
  const STATE_KEY = 'rwpf.state.v1';
  const RESULT_KEY = 'rwpf.result.v1';

  const store = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable: state lives in memory */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  if (!D || !D.modules || !D.modules.m1 || !D.modules['m2-higher'] || !D.modules['m2-lower']) {
    app.innerHTML = '<main class="interstitial"><h1>Form data not found</h1><p>Run <code>npm run build</code> to generate <code>js/data.js</code>.</p><p><a href="index.html">Back to start</a></p></main>';
    return;
  }

  const MODULE_SECONDS = D.form.timing.moduleSeconds;
  const students = {
    m1: E.studentView(D.modules.m1),
    'm2-higher': E.studentView(D.modules['m2-higher']),
    'm2-lower': E.studentView(D.modules['m2-lower']),
  };

  const fresh = () => ({
    v: 1, phase: 'm1', route: null, view: 'intro', index: 0,
    answers: { m1: {}, m2: {} }, marked: { m1: {}, m2: {} }, struck: { m1: {}, m2: {} },
    remaining: { m1: MODULE_SECONDS, m2: MODULE_SECONDS }, timerHidden: false, strikeMode: false, autoSubmitted: false,
  });

  const params = new URLSearchParams(location.search);
  let S = params.has('new') ? null : store.get(STATE_KEY);
  if (!S || S.v !== 1) S = fresh();
  if (params.has('new')) history.replaceState(null, '', location.pathname);

  const slot = () => S.phase;
  const mod = () => (S.phase === 'm1' ? students.m1 : students[S.route]);
  const moduleLabel = () => (S.phase === 'm1' ? 'Module 1' : 'Module 2');
  const save = () => store.set(STATE_KEY, S);

  const FLAG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 1h1.5v14H3zM5 2h8l-2 3 2 3H5z"/></svg>';

  const DIRECTIONS = `
    <p>Each question in this module has its own short passage. A passage may be a single text, a pair of texts, a poem, a set of research notes, a table, or a graph.</p>
    <p>Read the passage and the question, then choose the one best answer from the four choices. Base every answer only on the information given. Questions are grouped by skill, and each group starts with its easiest question.</p>
    <p><strong>Tools.</strong> Use <em>Mark for Review</em> to flag a question, <em>Cross out</em> to eliminate choices, and the question button at the bottom to jump to any question. Keyboard: A–D or 1–4 choose an answer, ← and → move between questions, M marks for review.</p>
    <p>You have ${Math.round(MODULE_SECONDS / 60)} minutes for the ${students.m1.items.length} questions in each module. When time runs out, the module is submitted automatically.</p>`;

  /* ---------- rendering ---------- */
  function topbar(showTools) {
    return `<header class="topbar">
      <div class="title">Reading and Writing<small>${moduleLabel()}</small></div>
      <div class="timer-wrap">
        <div id="timer" class="timer" role="timer" aria-label="Time remaining" ${S.timerHidden ? 'hidden' : ''}></div>
        <button class="linkish" id="toggle-timer" type="button">${S.timerHidden ? 'Show' : 'Hide'} timer</button>
      </div>
      <div class="tools">
        <button class="btn ghost" id="directions-btn" type="button">Directions</button>
        ${showTools ? `<button class="btn" id="strike-mode" type="button" aria-pressed="${S.strikeMode}">Cross out</button>` : ''}
        <button class="btn ghost" id="shortcuts-btn" type="button" aria-pressed="${S.shortcuts !== false}" title="Keyboard shortcuts: A–D, 1–4, ←/→, M">Shortcuts</button>
      </div>
    </header>`;
  }

  function qnavHtml() {
    const m = mod();
    const cells = m.items.map((it, i) => {
      const cls = ['qcell'];
      if (S.answers[slot()][it.id]) cls.push('answered');
      if (S.marked[slot()][it.id]) cls.push('marked');
      if (S.view === 'question' && i === S.index) cls.push('current');
      const state = [S.answers[slot()][it.id] ? 'answered' : 'unanswered', S.marked[slot()][it.id] ? 'marked for review' : ''].filter(Boolean).join(', ');
      return `<button type="button" class="${cls.join(' ')}" data-goto="${i}" aria-label="Question ${i + 1}, ${state}">${i + 1}</button>`;
    }).join('');
    return `<div class="legend-row"><span>Solid: answered</span><span>Dashed: unanswered</span><span>Red dot: marked for review</span></div>
      <div class="qgrid">${cells}</div>`;
  }

  function renderIntro() {
    const first = S.phase === 'm1';
    app.innerHTML = `<main class="interstitial">
      <p class="hero"><span class="eyebrow">Reading and Writing</span></p>
      <h1>${first ? 'Module 1' : 'Module 1 complete'}</h1>
      ${first ? '' : `<p>${S.autoSubmitted ? 'Time ran out, so Module 1 was submitted automatically. ' : ''}Your answers have been saved. Module 2 is chosen based on your Module 1 performance.</p><h2>Module 2</h2>`}
      <p class="muted">${mod().items.length} questions · ${Math.round(MODULE_SECONDS / 60)} minutes</p>
      <div class="card" style="text-align:left">${DIRECTIONS}</div>
      <div class="actions" style="justify-content:center">
        <button class="btn primary" id="begin" type="button">Begin ${first ? 'Module 1' : 'Module 2'}</button>
        <a class="btn" href="index.html">Save and exit</a>
      </div>
      <p class="disclaimer">${R.esc(D.form.disclaimer)}</p>
    </main>`;
  }

  function renderQuestion() {
    const m = mod();
    const it = m.items[S.index];
    const n = m.items.length;
    const chosen = S.answers[slot()][it.id];
    const marked = !!S.marked[slot()][it.id];
    const struck = S.struck[slot()][it.id] || [];
    const opts = E.LETTERS.map(L => `
      <li class="opt${struck.includes(L) ? ' struck' : ''}">
        <button type="button" class="opt-btn" role="radio" aria-checked="${chosen === L}" data-letter="${L}">
          <span class="letter" aria-hidden="true">${L}</span><span class="opt-text"><span class="sr-only">Choice ${L}${struck.includes(L) ? ', crossed out' : ''}: </span>${R.inline(it.options[L])}</span>
        </button>
        <button type="button" class="strike-btn" data-strike="${L}" aria-pressed="${struck.includes(L)}" aria-label="Cross out choice ${L}">${L}</button>
      </li>`).join('');
    app.innerHTML = `${topbar(true)}
      <main class="stage" id="main">
        <section class="pane left reading" aria-label="Passage">${R.stimulus(it.stimulus)}</section>
        <section class="pane right" aria-label="Question ${S.index + 1}">
          <div class="q-head">
            <span class="q-num">${S.index + 1}</span>
            <button type="button" class="mark-btn" id="mark" aria-pressed="${marked}">${FLAG} Mark for Review</button>
          </div>
          <p class="stem" id="stem">${R.inline(it.stem)}</p>
          <ul class="options" role="radiogroup" aria-labelledby="stem">${opts}</ul>
        </section>
      </main>
      <footer class="bottombar">
        <div class="spacer small muted">Unofficial practice form</div>
        <button type="button" class="btn qnav-toggle" id="qnav-toggle" aria-expanded="false" aria-controls="qnav">Question ${S.index + 1} of ${n} ▴</button>
        <div class="nav">
          <button type="button" class="btn" id="back" ${S.index === 0 ? 'disabled' : ''}>Back</button>
          <button type="button" class="btn primary" id="next">Next</button>
        </div>
      </footer>
      <div id="qnav" class="popover" role="dialog" aria-label="Question navigator" hidden>
        <h2 class="small" style="margin:0">${moduleLabel()} questions</h2>
        ${qnavHtml()}
        <button type="button" class="btn" id="to-check">Go to review page</button>
      </div>
      <div id="live" class="sr-only" aria-live="polite"></div>`;
    document.body.classList.toggle('strike-mode', !!S.strikeMode);
    updateTimer();
  }

  function renderCheck() {
    const m = mod();
    const answered = m.items.filter(it => S.answers[slot()][it.id]).length;
    const markedN = m.items.filter(it => S.marked[slot()][it.id]).length;
    app.innerHTML = `${topbar(false)}
      <main class="checkpage" id="main">
        <h1>Check your work — ${moduleLabel()}</h1>
        <p>You can go back to any question until you submit this module. Select a number to return to that question.</p>
        <div class="card">${qnavHtml()}</div>
        <p><strong>${answered}</strong> of ${m.items.length} answered · <strong>${markedN}</strong> marked for review${answered < m.items.length ? ' · Unanswered questions are scored as incorrect; there is no penalty for guessing.' : ''}</p>
        <div class="actions">
          <button type="button" class="btn" id="back-last">Back to questions</button>
          <button type="button" class="btn primary" id="submit-module">Submit ${moduleLabel()}</button>
        </div>
      </main>
      <div id="live" class="sr-only" aria-live="polite"></div>`;
    updateTimer();
  }

  function render(focusSelector) {
    closeDialog();
    if (S.view === 'intro') renderIntro();
    else if (S.view === 'check') renderCheck();
    else renderQuestion();
    const f = focusSelector && app.querySelector(focusSelector);
    if (f) f.focus();
    else {
      const h = app.querySelector('h1, .q-num');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
  }

  /* ---------- timer ---------- */
  let last = performance.now();
  let lastWhole = null;
  let warned = { 300: false, 60: false };
  function updateTimer() {
    const el = document.getElementById('timer');
    if (!el) return;
    const rem = Math.ceil(S.remaining[slot()]);
    el.textContent = E.formatTime(rem);
    el.classList.toggle('low', rem <= 300);
  }
  function announce(msg) {
    const live = document.getElementById('live');
    if (live) live.textContent = msg;
  }
  setInterval(() => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    if (S.view === 'intro') return;
    S.remaining[slot()] = Math.max(0, S.remaining[slot()] - dt);
    const whole = Math.ceil(S.remaining[slot()]);
    if (whole !== lastWhole) {
      lastWhole = whole;
      updateTimer();
      save();
      for (const t of [300, 60]) if (whole <= t && !warned[t]) { warned[t] = true; announce(`${t / 60} minute${t > 60 ? 's' : ''} remaining.`); }
    }
    if (S.remaining[slot()] <= 0) submitModule(true);
  }, 250);

  /* ---------- actions ---------- */
  function choose(L) {
    const it = mod().items[S.index];
    S.answers[slot()][it.id] = L;
    const st = S.struck[slot()][it.id];
    if (st && st.includes(L)) S.struck[slot()][it.id] = st.filter(x => x !== L);
    save();
    render(`.opt-btn[data-letter="${L}"]`);
  }
  function toggleStrike(L) {
    const it = mod().items[S.index];
    const st = new Set(S.struck[slot()][it.id] || []);
    if (st.has(L)) st.delete(L);
    else {
      st.add(L);
      if (S.answers[slot()][it.id] === L) delete S.answers[slot()][it.id];
    }
    S.struck[slot()][it.id] = [...st];
    save();
    render(`.strike-btn[data-strike="${L}"]`);
  }
  function go(i) {
    S.view = 'question';
    S.index = Math.max(0, Math.min(mod().items.length - 1, i));
    save();
    render();
    window.scrollTo(0, 0);
    app.querySelectorAll('.pane').forEach(p => { p.scrollTop = 0; });
  }
  function next() {
    if (S.index < mod().items.length - 1) go(S.index + 1);
    else { S.view = 'check'; save(); render(); }
  }
  function back() { if (S.index > 0) go(S.index - 1); }

  function submitModule(auto) {
    if (S.phase === 'm1') {
      const r = E.routeFor(D.modules.m1, S.answers.m1, D.form.routing);
      S.route = r.route;
      S.phase = 'm2';
      S.view = 'intro';
      S.index = 0;
      S.autoSubmitted = !!auto;
      warned = { 300: false, 60: false };
      save();
      render();
      return;
    }
    const result = {
      v: 1,
      m1Answers: S.answers.m1,
      route: S.route,
      m2Answers: S.answers.m2,
      finishedAt: new Date().toISOString(),
      secondsUsed: { m1: Math.round(MODULE_SECONDS - S.remaining.m1), m2: Math.round(MODULE_SECONDS - S.remaining.m2) },
    };
    store.set(RESULT_KEY, result);
    store.del(STATE_KEY);
    S.view = 'intro'; // stop the timer while navigating away
    location.href = 'review.html#r=' + E.encodeResult(D.modules, result);
  }

  /* ---------- dialogs ---------- */
  let returnFocus = null;
  function openDialog(title, bodyHtml, buttons) {
    closeDialog();
    returnFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'dialog-backdrop';
    wrap.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
      <h2 id="dlg-title" style="margin-top:0">${title}</h2>${bodyHtml}
      <div class="actions">${buttons}</div></div>`;
    document.body.appendChild(wrap);
    app.inert = true; // keep Tab and clicks inside the modal
    const b = wrap.querySelector('button');
    if (b) b.focus();
  }
  function closeDialog() {
    const d = document.querySelector('.dialog-backdrop');
    if (d) {
      d.remove();
      app.inert = false;
      if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    }
  }
  function toggleQnav(force) {
    const pop = document.getElementById('qnav');
    const btn = document.getElementById('qnav-toggle');
    if (!pop || !btn) return;
    const open = force !== undefined ? force : pop.hidden;
    const hadFocus = pop.contains(document.activeElement);
    pop.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (!open && hadFocus) btn.focus();
    if (open) { const c = pop.querySelector('.qcell.current') || pop.querySelector('.qcell'); if (c) c.focus(); }
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('button, a');
    if (!t) {
      if (!e.target.closest('#qnav')) toggleQnav(false);
      return;
    }
    if (t.matches('.opt-btn')) return choose(t.dataset.letter);
    if (t.matches('.strike-btn')) return toggleStrike(t.dataset.strike);
    if (t.matches('[data-goto]')) return go(Number(t.dataset.goto));
    if (t.matches('[data-close]')) return closeDialog();
    switch (t.id) {
      case 'begin': S.view = 'question'; S.index = 0; last = performance.now(); save(); return render();
      case 'next': return next();
      case 'back': return back();
      case 'mark': {
        const id = mod().items[S.index].id;
        if (S.marked[slot()][id]) delete S.marked[slot()][id]; else S.marked[slot()][id] = true;
        save();
        return render('#mark');
      }
      case 'qnav-toggle': return toggleQnav();
      case 'to-check': S.view = 'check'; save(); return render();
      case 'back-last': return go(mod().items.length - 1);
      case 'toggle-timer': S.timerHidden = !S.timerHidden; save(); return render('#toggle-timer');
      case 'strike-mode': S.strikeMode = !S.strikeMode; save(); return render('#strike-mode');
      case 'shortcuts-btn': S.shortcuts = S.shortcuts === false; save(); return render('#shortcuts-btn');
      case 'directions-btn': return openDialog('Directions', DIRECTIONS, '<button type="button" class="btn primary" data-close>Close</button>');
      case 'submit-module': {
        const m = mod();
        const blank = m.items.filter(it => !S.answers[slot()][it.id]).length;
        return openDialog(`Submit ${moduleLabel()}?`,
          `<p>${blank ? `You have <strong>${blank}</strong> unanswered question${blank > 1 ? 's' : ''}. ` : ''}After you submit, you can't return to this module.</p>`,
          '<button type="button" class="btn" data-close>Keep working</button><button type="button" class="btn primary" id="confirm-submit">Submit</button>');
      }
      case 'confirm-submit': closeDialog(); return submitModule(false);
      default:
    }
    if (!t.closest('#qnav') && t.id !== 'qnav-toggle') toggleQnav(false);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDialog(); toggleQnav(false); return; }
    const dlg = document.querySelector('.dialog-backdrop .dialog');
    if (dlg && e.key === 'Tab') {
      // Trap focus within the open dialog.
      const f = dlg.querySelectorAll('button');
      const first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (S.shortcuts === false) return; // WCAG 2.1.4: single-key shortcuts can be turned off
    if (S.view !== 'question' || dlg) return;
    if (e.target.closest && e.target.closest('#qnav')) return;
    // Let arrow keys scroll the passage pane normally.
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.closest && e.target.closest('.pane.left')) return;
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const L = E.LETTERS.includes(k) ? k : { 1: 'A', 2: 'B', 3: 'C', 4: 'D' }[k];
    if (L) { e.preventDefault(); return choose(L); }
    if (k === 'ArrowRight') { e.preventDefault(); return next(); }
    if (k === 'ArrowLeft') { e.preventDefault(); return back(); }
    if (k === 'M') { e.preventDefault(); document.getElementById('mark').click(); }
  });

  render();
})();
