/* Scoring and routing engine. Loaded as a classic script in the browser
   (window.SATEngine) and via require() in Node tests. No DOM access here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SATEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LETTERS = ['A', 'B', 'C', 'D'];
  const ANNOTATION_FIELDS = ['key', 'rationale', 'distractors', 'band', 'rating', 'targetSeconds', 'topic'];

  /** Copy of a module with every answer-revealing field removed. */
  function studentView(mod) {
    return {
      moduleId: mod.moduleId,
      title: mod.title,
      timeLimitSeconds: mod.timeLimitSeconds,
      items: mod.items.map(it => {
        const copy = {};
        for (const [k, v] of Object.entries(it)) if (!ANNOTATION_FIELDS.includes(k)) copy[k] = v;
        return copy;
      }),
    };
  }

  /** answers: { itemId: 'A'|'B'|'C'|'D' } */
  function scoreModule(mod, answers) {
    const a = answers || {};
    const results = mod.items.map(it => {
      const chosen = LETTERS.includes(a[it.id]) ? a[it.id] : null;
      return { id: it.id, chosen, key: it.key, correct: chosen === it.key };
    });
    return { id: mod.moduleId, raw: results.filter(r => r.correct).length, total: mod.items.length, results };
  }

  /** Applies the form's stated threshold to Module 1 answers. */
  function routeFor(m1, answers, routing) {
    const { raw, total } = scoreModule(m1, answers);
    const route = raw >= routing.threshold ? routing.higher : routing.lower;
    return { raw, total, threshold: routing.threshold, route };
  }

  function tally(items, results, field) {
    const out = {};
    items.forEach((it, i) => {
      const k = it[field];
      out[k] = out[k] || { raw: 0, total: 0 };
      out[k].total += 1;
      if (results[i].correct) out[k].raw += 1;
    });
    return out;
  }

  /**
   * state: { m1Answers, route, m2Answers }
   * modules: { m1, 'm2-higher', 'm2-lower' } full (annotated) module objects
   */
  function scoreForm(modules, state, routing) {
    const m1 = modules.m1;
    const expectedRoute = routeFor(m1, state.m1Answers, routing).route;
    const route = state.route || expectedRoute;
    const m2 = modules[route];
    if (!m2) throw new Error('Unknown route: ' + route);
    const s1 = scoreModule(m1, state.m1Answers);
    const s2 = scoreModule(m2, state.m2Answers);
    const items = [...m1.items, ...m2.items];
    const results = [...s1.results, ...s2.results];
    return {
      route,
      routeConsistent: route === expectedRoute,
      modules: [
        { id: m1.moduleId, title: m1.title, raw: s1.raw, total: s1.total },
        { id: m2.moduleId, title: m2.title, raw: s2.raw, total: s2.total },
      ],
      raw: s1.raw + s2.raw,
      total: s1.total + s2.total,
      byDomain: tally(items, results, 'domain'),
      bySkill: tally(items, results, 'skill'),
      byBand: tally(items, results, 'band'),
      items: items.map((it, i) => ({ moduleId: i < m1.items.length ? m1.moduleId : m2.moduleId, ...it, chosen: results[i].chosen, correct: results[i].correct })),
    };
  }

  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  const ROUTE_CODES = { 'm2-higher': 'h', 'm2-lower': 'l' };
  const answerString = (mod, answers) => mod.items.map(it => (LETTERS.includes((answers || {})[it.id]) ? answers[it.id] : '-')).join('');
  const answerMap = (mod, str) => {
    const out = {};
    mod.items.forEach((it, i) => { const c = (str || '')[i]; if (LETTERS.includes(c)) out[it.id] = c; });
    return out;
  };

  /** Compact, URL-safe encoding of a finished attempt: "<m1 letters>.<h|l>.<m2 letters>". */
  function encodeResult(modules, result) {
    const code = ROUTE_CODES[result.route];
    if (!code) throw new Error('Unknown route: ' + result.route);
    return answerString(modules.m1, result.m1Answers) + '.' + code + '.' + answerString(modules[result.route], result.m2Answers);
  }

  function decodeResult(modules, str) {
    const m = /^([ABCD-]+)\.([hl])\.([ABCD-]+)$/.exec(String(str || '').trim());
    if (!m) return null;
    const route = m[2] === 'h' ? 'm2-higher' : 'm2-lower';
    if (!modules.m1 || !modules[route]) return null;
    if (m[1].length !== modules.m1.items.length || m[3].length !== modules[route].items.length) return null;
    return { m1Answers: answerMap(modules.m1, m[1]), route, m2Answers: answerMap(modules[route], m[3]) };
  }

  return { LETTERS, ANNOTATION_FIELDS, studentView, scoreModule, routeFor, scoreForm, formatTime, encodeResult, decodeResult };
});
