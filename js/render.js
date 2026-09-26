/* Shared HTML rendering for items (test runner, review, print). Classic script → window.SATRender. */
(function (root) {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Escape, then apply the tiny markup used in item text: {u}..{/u}, ______, *italic*. */
  function inline(s) {
    return esc(s)
      .replace(/\{u\}/g, '<u>')
      .replace(/\{\/u\}/g, '</u>')
      .replace(/_{6,}/g, '<span class="blank" role="img" aria-label="blank">______</span>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  }

  function paragraphs(s) {
    return String(s ?? '')
      .split(/\n{2,}/)
      .map(p => `<p>${inline(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function poem(s) {
    return '<div class="poem">' + String(s ?? '').split('\n').map(l => `<span class="poem-line">${inline(l) || '&nbsp;'}</span>`).join('') + '</div>';
  }

  function table(t) {
    const head = t.columns.map(c => `<th scope="col">${inline(c)}</th>`).join('');
    const body = t.rows.map(r => '<tr>' + r.map((c, i) => (i === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('') + '</tr>').join('');
    return `<figure class="data-figure"><table class="data-table"><caption>${inline(t.caption)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></figure>`;
  }

  function niceStep(max) {
    const raw = max / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const n = raw / mag;
    const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return f * mag;
  }

  let chartSeq = 0;
  function chart(c) {
    const id = 'chart-' + ++chartSeq;
    const W = 560, H = 300, m = { t: 16, r: 16, b: 58, l: 58 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const all = c.series.flatMap(s => s.values);
    const step = niceStep(Math.max(...all, 0));
    const top = Math.ceil(Math.max(...all, 0) / step) * step || step;
    const y = v => m.t + ph - (v / top) * ph;
    const groupW = pw / c.categories.length;
    const barW = Math.min(44, (groupW * 0.7) / c.series.length);
    let g = '';
    for (let v = 0; v <= top + 1e-9; v += step) {
      const yy = y(v).toFixed(1);
      g += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${yy}" y2="${yy}"/><text class="tick" x="${m.l - 8}" y="${yy}" text-anchor="end" dominant-baseline="middle">${+v.toFixed(2)}</text>`;
    }
    c.categories.forEach((cat, ci) => {
      const gx = m.l + ci * groupW + (groupW - barW * c.series.length) / 2;
      c.series.forEach((s, si) => {
        const v = s.values[ci];
        const x = gx + si * barW;
        g += `<rect class="bar s${si % 3}" x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${(barW - 3).toFixed(1)}" height="${(m.t + ph - y(v)).toFixed(1)}"><title>${esc(s.label)}, ${esc(cat)}: ${v}</title></rect>`;
      });
      g += `<text class="tick" x="${(m.l + ci * groupW + groupW / 2).toFixed(1)}" y="${m.t + ph + 18}" text-anchor="middle">${esc(cat)}</text>`;
    });
    g += `<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ph}" y2="${m.t + ph}"/>`;
    g += `<text class="axis-label" x="${m.l + pw / 2}" y="${H - 10}" text-anchor="middle">${esc(c.xLabel)}</text>`;
    g += `<text class="axis-label" transform="translate(16 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle">${esc(c.yLabel)}</text>`;
    const legend = c.series.length > 1
      ? `<div class="legend">${c.series.map((s, i) => `<span><i class="swatch s${i % 3}"></i>${esc(s.label)}</span>`).join('')}</div>`
      : '';
    const srTable = `<table class="sr-only"><caption>${esc(c.caption)}</caption><thead><tr><th>${esc(c.xLabel)}</th>${c.series.map(s => `<th>${esc(s.label)}</th>`).join('')}</tr></thead><tbody>${c.categories.map((cat, ci) => `<tr><th>${esc(cat)}</th>${c.series.map(s => `<td>${s.values[ci]}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    return `<figure class="data-figure chart"><figcaption id="${id}">${inline(c.caption)}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}">${g}</svg>${legend}${srTable}</figure>`;
  }

  function stimulus(st) {
    if (!st) return '';
    let h = '';
    if (st.title && st.type !== 'poem') h += `<h3 class="stim-title">${inline(st.title)}</h3>`;
    switch (st.type) {
      case 'poem':
        if (st.title) h += `<h3 class="stim-title">${inline(st.title)}</h3>`;
        h += poem(st.text);
        break;
      case 'paired':
        h += `<section class="paired"><h3 class="text-label">Text 1</h3>${paragraphs(st.text1)}</section>`;
        h += `<section class="paired"><h3 class="text-label">Text 2</h3>${paragraphs(st.text2)}</section>`;
        break;
      case 'notes':
        h += `<p>${inline(st.intro || 'While researching a topic, a student has taken the following notes:')}</p>`;
        h += '<ul class="notes">' + (st.notes || []).map(n => `<li>${inline(n)}</li>`).join('') + '</ul>';
        break;
      case 'table':
        if (st.text) h += paragraphs(st.text);
        h = table(st.table) + h;
        break;
      case 'chart':
        if (st.text) h += paragraphs(st.text);
        h = chart(st.chart) + h;
        break;
      default:
        h += paragraphs(st.text);
    }
    if (st.attribution) h = `<p class="attribution">${inline(st.attribution)}</p>` + h;
    return h;
  }

  function trapName(taxonomy, id) {
    const t = taxonomy.trapClasses.find(x => x.id === id);
    return t ? t.name : id;
  }

  root.SATRender = { esc, inline, paragraphs, stimulus, chart, table, trapName };
})(typeof self !== 'undefined' ? self : this);
