(function () {
  'use strict';

  const SEV_ORDER = ['critical', 'high', 'medium', 'low', 'info'];
  const SEV_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' };

  // ---------- Theme ----------
  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  function applyTheme(t) { root.setAttribute('data-theme', t); try { localStorage.setItem('gmc-scanner-theme', t); } catch {} }
  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('gmc-scanner-theme'); } catch {}
    applyTheme(saved || 'dark');
  })();
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  // ---------- Rendering ----------
  let lastResult = null;
  let activeFilter = 'all';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function severityCounts(findings) {
    const counts = Object.fromEntries(SEV_ORDER.map((s) => [s, 0]));
    for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;
    return counts;
  }

  function createFindingEl(f) {
    const el = document.createElement('div');
    el.className = 'finding';
    el.dataset.sev = f.severity;
    const refs = (f.references || []).length
      ? `<div class="finding-refs">Reference: ${f.references.map(escapeHtml).join(', ')}</div>` : '';
    el.innerHTML = `
      <div class="finding-head">
        <span class="sev-badge" data-sev="${f.severity}">${SEV_LABEL[f.severity]}</span>
        <span class="finding-title">${escapeHtml(f.title)}</span>
        <span class="finding-category">${escapeHtml(f.category)}</span>
        <span class="chevron">▸</span>
      </div>
      <div class="finding-body">
        <p>${escapeHtml(f.description)}</p>
        ${f.evidence ? `<h4>Evidence</h4><div class="finding-evidence">${escapeHtml(f.evidence)}</div>` : ''}
        <h4>How an attacker could use this</h4>
        <p>${escapeHtml(f.attack)}</p>
        <h4>How to fix it</h4>
        <p>${escapeHtml(f.fix)}</p>
        ${refs}
      </div>
    `;
    el.querySelector('.finding-head').addEventListener('click', () => el.classList.toggle('open'));
    return el;
  }

  function renderFilters(counts, total) {
    const row = document.getElementById('filter-row');
    if (!row) return;
    row.innerHTML = '';
    const makeBtn = (key, label) => {
      const b = document.createElement('button');
      b.className = 'filter-btn' + (activeFilter === key ? ' active' : '');
      b.textContent = label;
      b.addEventListener('click', () => { activeFilter = key; applyFilter(); renderFilters(counts, total); });
      return b;
    };
    row.appendChild(makeBtn('all', `All (${total})`));
    for (const sev of SEV_ORDER) {
      if (counts[sev] > 0) row.appendChild(makeBtn(sev, `${SEV_LABEL[sev]} (${counts[sev]})`));
    }
  }

  function applyFilter() {
    document.querySelectorAll('#findings-list .finding').forEach((el) => {
      el.style.display = (activeFilter === 'all' || el.dataset.sev === activeFilter) ? '' : 'none';
    });
  }

  function renderResults(data) {
    lastResult = data;
    activeFilter = 'all';

    document.getElementById('grade-badge').textContent = data.grade;
    document.getElementById('grade-badge').dataset.grade = data.grade;
    document.getElementById('summary-target').textContent = data.finalUrl || data.requestedUrl;
    const scannedAt = data.scannedAt ? new Date(data.scannedAt).toLocaleString() : '';
    document.getElementById('summary-meta').textContent =
      `Score ${data.score}/100 · HTTP ${data.httpStatus ?? '—'} · scanned ${scannedAt}`;

    const counts = severityCounts(data.findings);
    const chipsEl = document.getElementById('severity-chips');
    chipsEl.innerHTML = SEV_ORDER
      .filter((s) => counts[s] > 0)
      .map((s) => `<span class="chip" data-sev="${s}">${counts[s]} ${SEV_LABEL[s]}</span>`)
      .join('') || '<span class="chip" data-sev="info">No findings</span>';

    const list = document.getElementById('findings-list');
    list.innerHTML = '';
    for (const f of data.findings) list.appendChild(createFindingEl(f));
    document.getElementById('no-findings').classList.toggle('hidden', data.findings.length > 0);
    renderFilters(counts, data.findings.length);

    const notesPanel = document.getElementById('notes-panel');
    if (data.notes && data.notes.length) {
      document.getElementById('notes-list').innerHTML = data.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('');
      notesPanel.classList.remove('hidden');
    } else {
      notesPanel.classList.add('hidden');
    }

    document.getElementById('results').classList.remove('hidden');
  }

  // ---------- Static report mode (used by cli.js-generated reports) ----------
  if (window.__SCAN_DATA__) {
    document.querySelector('.scan-panel')?.classList.add('hidden');
    document.getElementById('progress-panel')?.classList.add('hidden');
    renderResults(window.__SCAN_DATA__);
    document.getElementById('new-scan')?.remove();
    window.addEventListener('DOMContentLoaded', () => {}); // no-op, static mode
    wireResultButtons();
    return;
  }

  // ---------- Interactive mode ----------
  const form = document.getElementById('scan-form');
  const scanBtn = document.getElementById('scan-btn');
  const progressPanel = document.getElementById('progress-panel');
  const progressLabel = document.getElementById('progress-label');
  const progressLog = document.getElementById('progress-log');
  const errorPanel = document.getElementById('error-panel');
  const errorMessage = document.getElementById('error-message');
  const resultsPanel = document.getElementById('results');

  function resetPanels() {
    progressPanel.classList.add('hidden');
    errorPanel.classList.add('hidden');
    resultsPanel.classList.add('hidden');
    progressLog.innerHTML = '';
  }

  let currentSource = null;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let url = document.getElementById('url-input').value.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (!document.getElementById('consent-check').checked) return;

    resetPanels();
    progressPanel.classList.remove('hidden');
    progressLabel.textContent = 'Starting scan…';
    scanBtn.disabled = true;

    if (currentSource) currentSource.close();
    const qs = new URLSearchParams({ url, consent: '1' });
    const source = new EventSource('/api/scan?' + qs.toString());
    currentSource = source;

    source.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === 'progress') {
        progressLabel.textContent = msg.label;
        const li = document.createElement('li');
        li.textContent = msg.label;
        progressLog.appendChild(li);
      } else if (msg.type === 'error') {
        source.close();
        scanBtn.disabled = false;
        progressPanel.classList.add('hidden');
        errorPanel.classList.remove('hidden');
        errorMessage.textContent = msg.message;
      } else if (msg.type === 'done') {
        source.close();
        scanBtn.disabled = false;
        progressPanel.classList.add('hidden');
        renderResults(msg.result);
      }
      // 'finding' events are informational during the live log; full list
      // is rendered from the final 'done' payload to keep ordering by
      // severity consistent.
    };

    source.onerror = () => {
      source.close();
      scanBtn.disabled = false;
      progressPanel.classList.add('hidden');
      errorPanel.classList.remove('hidden');
      errorMessage.textContent = 'Lost connection to the scanner. Please try again.';
    };
  });

  document.getElementById('new-scan').addEventListener('click', () => {
    resetPanels();
    document.getElementById('url-input').value = '';
    document.getElementById('consent-check').checked = false;
  });

  wireResultButtons();

  function wireResultButtons() {
    const dl = document.getElementById('download-json');
    if (dl) dl.addEventListener('click', () => {
      if (!lastResult) return;
      const blob = new Blob([JSON.stringify(lastResult, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const host = (lastResult.finalUrl || lastResult.requestedUrl || 'scan').replace(/^https?:\/\//, '').replace(/[^\w.-]/g, '_');
      a.download = `scan-${host}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    });
    const pr = document.getElementById('print-report');
    if (pr) pr.addEventListener('click', () => {
      document.querySelectorAll('.finding').forEach((el) => el.classList.add('open'));
      window.print();
    });
  }
})();
