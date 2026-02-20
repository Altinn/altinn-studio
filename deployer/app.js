'use strict';

const RUNTIME_ENVS = ['at_ring1', 'at_ring2', 'tt_ring1', 'tt_ring2', 'prod_ring1', 'prod_ring2'];
const STUDIO_ENVS = ['dev', 'staging', 'prod'];
const REFRESH_INTERVAL_MS = 10_000;

// Environments without approval gates — no split cell needed
const UNGATED = new Set(['at_ring1', 'dev', 'staging']);

// key (`${runId}:${env}`) → {runId, env, service, sha}
const selected = new Map();
let hoveredWaitingCell = null; // {key, checkbox, runId, env, service, sha}
let lastStatus = null;

function selectionKey(runId, env) {
  return `${runId}:${env}`;
}

function effectiveStatus(data) {
  if (data.status === 'completed') return data.conclusion || 'success';
  return data.status;
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

function updateApproveBar() {
  const bar = document.getElementById('approve-bar');
  const count = selected.size;
  if (count === 0) {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  document.getElementById('approve-count').textContent = `${count} pending selected`;
}

function renderDeployment(data, statusClass) {
  const container = el('div', `cell-half ${statusClass}`);
  if (!data) {
    container.appendChild(el('span', 'empty-dash', '\u2014'));
    return container;
  }

  const isActive = statusClass === 'half-in_progress' || statusClass === 'half-queued';

  const link = el('a');
  link.href = data.runUrl;
  link.target = '_blank';
  link.rel = 'noopener';
  link.title = data.title;

  if (isActive) link.appendChild(el('span', 'spinner'));
  link.appendChild(el('span', 'sha', data.sha));
  link.appendChild(el('span', 'title', data.title));
  link.appendChild(el('span', 'time', relativeTime(data.updatedAt)));

  container.appendChild(link);
  return container;
}

function renderWaitingHalf(data, env, service) {
  const key = selectionKey(data.runId, env);
  const container = el('div', 'cell-half half-waiting waiting-half');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'approve-check';
  checkbox.checked = selected.has(key);
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      selected.set(key, { runId: data.runId, env, service, sha: data.sha });
    } else {
      selected.delete(key);
    }
    updateApproveBar();
  });

  const body = el('div', 'waiting-body');
  body.appendChild(el('span', 'sha', data.sha));
  body.appendChild(el('span', 'title', data.title));
  body.appendChild(el('span', 'time', relativeTime(data.updatedAt)));

  const ghLink = el('a', 'gh-ext-link', '\u2197');
  ghLink.href = data.runUrl;
  ghLink.target = '_blank';
  ghLink.rel = 'noopener';
  ghLink.title = 'Open in GitHub';

  container.appendChild(checkbox);
  container.appendChild(body);
  container.appendChild(ghLink);

  const cellInfo = { key, checkbox, runId: data.runId, env, service, sha: data.sha };
  container.addEventListener('mouseenter', () => { hoveredWaitingCell = cellInfo; });
  container.addEventListener('mouseleave', () => {
    if (hoveredWaitingCell?.key === key) hoveredWaitingCell = null;
  });

  return container;
}

function renderGrid(containerId, services, envs) {
  const grid = document.getElementById(containerId);
  grid.style.gridTemplateColumns = `140px repeat(${envs.length}, 1fr)`;
  grid.innerHTML = '';

  // Header row
  grid.appendChild(el('div', 'cell cell-header', 'Service'));
  for (const env of envs) {
    grid.appendChild(el('div', 'cell cell-header', env));
  }

  // Service rows
  for (const [svcName, envData] of Object.entries(services)) {
    grid.appendChild(el('div', 'cell cell-service', svcName));

    for (const env of envs) {
      const cell = el('div', 'cell cell-env');
      const slot = envData[env];
      const current = slot?.current || null;
      const next = slot?.next || null;

      if (UNGATED.has(env)) {
        // Single cell — show current only (or next if deploying)
        const data = current || next;
        const status = data ? `half-${effectiveStatus(data)}` : 'half-none';
        cell.classList.add('cell-single');
        cell.appendChild(renderDeployment(data, status));
      } else {
        // Split cell — left: current deployed, right: next candidate
        const currentStatus = current ? `half-${effectiveStatus(current)}` : 'half-none';
        cell.appendChild(renderDeployment(current, currentStatus));

        if (next && effectiveStatus(next) === 'waiting' && next.canApprove === true) {
          cell.appendChild(renderWaitingHalf(next, env, svcName));
        } else {
          const nextStatus = next ? `half-${effectiveStatus(next)}` : 'half-none';
          cell.appendChild(renderDeployment(next, nextStatus));
        }
      }

      grid.appendChild(cell);
    }
  }
}

async function fetchAndRender() {
  const loading = document.getElementById('loading');
  loading.classList.remove('hidden');

  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    lastStatus = data;

    renderGrid('runtime-grid', data.runtime, RUNTIME_ENVS);
    renderGrid('studio-grid', data.studio, STUDIO_ENVS);

    const ts = data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString() : new Date().toLocaleTimeString();
    document.getElementById('last-updated').textContent = `Data from ${ts}`;
  } catch (err) {
    console.error('Fetch failed:', err);
    document.getElementById('last-updated').textContent = `Error: ${err.message}`;
  } finally {
    loading.classList.add('hidden');
  }
}

// --- Approve flow ---

function showConfirmModal() {
  const list = document.getElementById('confirm-list');
  list.innerHTML = '';
  for (const { service, env, sha } of selected.values()) {
    const li = el('li', 'confirm-item');
    li.appendChild(el('span', 'confirm-service', service));
    li.appendChild(el('span', 'confirm-env', env));
    li.appendChild(el('span', 'confirm-sha sha', sha));
    list.appendChild(li);
  }
  document.getElementById('confirm-modal').classList.remove('hidden');
}

function hideConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
}

async function doApprove() {
  const items = [...selected.values()].map(({ runId, env }) => ({ runId, env }));
  const confirmOk = document.getElementById('confirm-ok');
  confirmOk.disabled = true;
  confirmOk.textContent = 'Approving...';

  try {
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    hideConfirmModal();
    selected.clear();
    updateApproveBar();
    // Follow-up fetch timed to land after the server's +5s re-refresh, catching any
    // jobs that were still 'waiting' on GitHub when the immediate response was built.
    setTimeout(fetchAndRender, 6_000);

    const errors = data.results?.filter((r) => !r.ok) ?? [];
    if (errors.length > 0) console.error('[approve] errors:', errors);

    if (data.status) {
      lastStatus = data.status;
      renderGrid('runtime-grid', data.status.runtime, RUNTIME_ENVS);
      renderGrid('studio-grid', data.status.studio, STUDIO_ENVS);
      const ts = data.status.fetchedAt
        ? new Date(data.status.fetchedAt).toLocaleTimeString()
        : new Date().toLocaleTimeString();
      document.getElementById('last-updated').textContent = `Data from ${ts}`;
    } else {
      await fetchAndRender();
    }
  } catch (err) {
    console.error('Approve failed:', err);
  } finally {
    confirmOk.disabled = false;
    confirmOk.textContent = 'Approve';
  }
}

document.getElementById('approve-bar-btn').addEventListener('click', showConfirmModal);

document.getElementById('approve-clear').addEventListener('click', () => {
  selected.clear();
  updateApproveBar();
  // Re-render with cached data to uncheck all boxes without a round-trip
  if (lastStatus) {
    renderGrid('runtime-grid', lastStatus.runtime, RUNTIME_ENVS);
    renderGrid('studio-grid', lastStatus.studio, STUDIO_ENVS);
  }
});

document.getElementById('confirm-ok').addEventListener('click', doApprove);
document.getElementById('confirm-cancel').addEventListener('click', hideConfirmModal);

// Close modal on backdrop click
document.getElementById('confirm-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) hideConfirmModal();
});

// Space key to toggle the hovered waiting cell's checkbox
document.addEventListener('keydown', (e) => {
  if (e.key !== ' ' || !hoveredWaitingCell) return;
  const tag = document.activeElement?.tagName ?? '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
  e.preventDefault();
  const { key, checkbox, runId, env, service, sha } = hoveredWaitingCell;
  checkbox.checked = !checkbox.checked;
  if (checkbox.checked) {
    selected.set(key, { runId, env, service, sha });
  } else {
    selected.delete(key);
  }
  updateApproveBar();
});

// --- Refresh ---

document.getElementById('refresh-btn').addEventListener('click', async () => {
  const loading = document.getElementById('loading');
  loading.classList.remove('hidden');
  try {
    await fetch('/api/refresh', { method: 'POST' });
  } catch {
    // Refresh failed, fetchAndRender will show the error
  }
  await fetchAndRender();
});

fetchAndRender();
setInterval(fetchAndRender, REFRESH_INTERVAL_MS);
