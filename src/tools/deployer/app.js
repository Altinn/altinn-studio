'use strict';

const REFRESH_INTERVAL_MS = 10_000;

const selected = new Map(); // key => { key, runId, workflow, env, service, envDisplay, sha }
let hoveredWaitingCell = null; // { selection, checkbox }
let lastStatus = null;

function selectionKey(runId, workflow, env) {
  return `${runId}:${workflow}:${env}`;
}

function setSelection(selection, checked) {
  if (checked) selected.set(selection.key, selection);
  else selected.delete(selection.key);
  updateApproveBar();
}

function reconcileSelections(status) {
  const valid = new Set();
  for (const service of status.services) {
    for (const plane of service.planes) {
      for (const slot of Object.values(plane.envs)) {
        const next = slot.next;
        if (!next || next.status !== 'waiting' || next.canApprove !== true || !Number.isInteger(next.runId)) continue;
        valid.add(selectionKey(next.runId, service.workflow, slot.name));
      }
    }
  }

  let changed = false;
  for (const key of selected.keys()) {
    if (valid.has(key)) continue;
    selected.delete(key);
    changed = true;
  }
  if (hoveredWaitingCell && !valid.has(hoveredWaitingCell.selection.key)) hoveredWaitingCell = null;
  if (changed) updateApproveBar();
}

function effectiveStatus(data) {
  return data.status === 'completed' ? (data.conclusion ?? data.status) : data.status;
}

function deploymentStatusClass(data) {
  return data ? `half-${effectiveStatus(data)}` : 'half-none';
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
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function setLastUpdatedFromStatus(status) {
  const ts = status.fetchedAt ? new Date(status.fetchedAt).toLocaleTimeString() : new Date().toLocaleTimeString();
  document.getElementById('last-updated').textContent = `Data from ${ts}`;
}

function updateApproveBar() {
  const bar = document.getElementById('approve-bar');
  if (selected.size === 0) {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  document.getElementById('approve-count').textContent = `${selected.size} pending selected`;
}

function renderDeployment(data, statusClass) {
  const container = el('div', `cell-half ${statusClass}`);
  if (!data) {
    container.appendChild(el('span', 'empty-dash', '\u2014'));
    return container;
  }

  const link = el('a');
  link.href = data.runUrl;
  link.target = '_blank';
  link.rel = 'noopener';
  link.title = data.title;
  if (statusClass === 'half-in_progress' || statusClass === 'half-queued') link.appendChild(el('span', 'spinner'));
  link.appendChild(el('span', 'sha', data.sha));
  link.appendChild(el('span', 'title', data.title));
  link.appendChild(el('span', 'time', relativeTime(data.updatedAt)));
  container.appendChild(link);
  return container;
}

function renderWaitingHalf(next, service, slot) {
  const container = el('div', 'cell-half half-waiting waiting-half');
  const selection = {
    key: selectionKey(next.runId, service.workflow, slot.name),
    runId: next.runId,
    workflow: service.workflow,
    env: slot.name,
    service: service.displayName,
    envDisplay: slot.displayName,
    sha: next.sha,
  };

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'approve-check';
  checkbox.checked = selected.has(selection.key);
  checkbox.addEventListener('change', () => setSelection(selection, checkbox.checked));

  const body = el('div', 'waiting-body');
  body.appendChild(el('span', 'sha', next.sha));
  body.appendChild(el('span', 'title', next.title));
  body.appendChild(el('span', 'time', relativeTime(next.updatedAt)));

  const ghLink = el('a', 'gh-ext-link', '\u2197');
  ghLink.href = next.runUrl;
  ghLink.target = '_blank';
  ghLink.rel = 'noopener';
  ghLink.title = 'Open in GitHub';

  container.append(checkbox, body, ghLink);

  const hovered = { selection, checkbox };
  container.addEventListener('mouseenter', () => { hoveredWaitingCell = hovered; });
  container.addEventListener('mouseleave', () => {
    if (hoveredWaitingCell?.selection.key === selection.key) hoveredWaitingCell = null;
  });
  return container;
}

function getPlaneServices(status, planeName) {
  const services = [];
  for (const service of status.services) {
    const plane = service.planes.find((p) => p.name === planeName);
    if (!plane) continue;
    services.push({
      workflow: service.workflow,
      displayName: service.displayName,
      envs: plane.envs,
    });
  }
  return services;
}

function renderGrid(containerId, services, envs) {
  const grid = document.getElementById(containerId);
  grid.style.gridTemplateColumns = `140px repeat(${envs.length}, 1fr)`;
  grid.innerHTML = '';

  grid.appendChild(el('div', 'cell cell-header', 'Service'));
  for (const env of envs) grid.appendChild(el('div', 'cell cell-header', env.displayName));

  for (const service of services) {
    grid.appendChild(el('div', 'cell cell-service', service.displayName));
    for (const env of envs) {
      const slot = service.envs[env.name] ?? { name: env.name, displayName: env.displayName, current: null, next: null };
      const current = slot.current;
      const next = slot.next;
      const cell = el('div', 'cell cell-env');

      if (env.ungated) {
        const nextIsActiveOrFailed = next && effectiveStatus(next) !== 'success';
        const data = nextIsActiveOrFailed ? next : (current || next);
        cell.classList.add('cell-single');
        cell.appendChild(renderDeployment(data, deploymentStatusClass(data)));
      } else {
        cell.appendChild(renderDeployment(current, deploymentStatusClass(current)));
        if (next && effectiveStatus(next) === 'waiting' && next.canApprove === true) {
          cell.appendChild(renderWaitingHalf(next, service, slot));
        } else {
          cell.appendChild(renderDeployment(next, deploymentStatusClass(next)));
        }
      }
      grid.appendChild(cell);
    }
  }
}

function applyStatus(status) {
  lastStatus = status;
  reconcileSelections(status);
  for (const plane of status.planes) {
    const containerId = `${plane.name}-grid`;
    if (!document.getElementById(containerId)) continue;
    renderGrid(containerId, getPlaneServices(status, plane.name), plane.envs);
  }
  setLastUpdatedFromStatus(status);
}

async function fetchAndRender() {
  const loading = document.getElementById('loading');
  loading.classList.remove('hidden');
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    applyStatus(await res.json());
  } catch (err) {
    console.error('Fetch failed:', err);
    document.getElementById('last-updated').textContent = `Error: ${err.message}`;
  } finally {
    loading.classList.add('hidden');
  }
}

function showConfirmModal() {
  const list = document.getElementById('confirm-list');
  list.innerHTML = '';
  for (const { service, envDisplay, sha } of selected.values()) {
    const item = el('li', 'confirm-item');
    item.appendChild(el('span', 'confirm-service', service));
    item.appendChild(el('span', 'confirm-env', envDisplay));
    item.appendChild(el('span', 'confirm-sha sha', sha));
    list.appendChild(item);
  }
  document.getElementById('confirm-modal').classList.remove('hidden');
}

function hideConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
}

async function doApprove() {
  const confirmOk = document.getElementById('confirm-ok');
  confirmOk.disabled = true;
  confirmOk.textContent = 'Approving...';
  try {
    const items = [...selected.values()].map(({ runId, workflow, env }) => ({ runId, workflow, env }));
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
    setTimeout(fetchAndRender, 6_000); // follow-up after server-side delayed refresh
    const hasErrors = data.results?.some((result) => !result.ok) ?? false;
    if (hasErrors) console.error('[approve] errors:', data.results);
    if (data.status) applyStatus(data.status);
    else await fetchAndRender();
  } catch (err) {
    console.error('Approve failed:', err);
    document.getElementById('last-updated').textContent = `Approve error: ${err.message}`;
  } finally {
    confirmOk.disabled = false;
    confirmOk.textContent = 'Approve';
  }
}

document.getElementById('approve-bar-btn').addEventListener('click', showConfirmModal);
document.getElementById('approve-clear').addEventListener('click', () => {
  selected.clear();
  updateApproveBar();
  if (lastStatus) applyStatus(lastStatus);
});
document.getElementById('confirm-ok').addEventListener('click', doApprove);
document.getElementById('confirm-cancel').addEventListener('click', hideConfirmModal);
document.getElementById('confirm-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) hideConfirmModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key !== ' ' || !hoveredWaitingCell) return;
  const tag = document.activeElement?.tagName ?? '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
  e.preventDefault();
  hoveredWaitingCell.checkbox.checked = !hoveredWaitingCell.checkbox.checked;
  setSelection(hoveredWaitingCell.selection, hoveredWaitingCell.checkbox.checked);
});

document.getElementById('refresh-btn').addEventListener('click', async () => {
  const loading = document.getElementById('loading');
  loading.classList.remove('hidden');
  try {
    await fetch('/api/refresh', { method: 'POST' });
  } catch {
    // fetchAndRender below reports failure
  }
  await fetchAndRender();
});

fetchAndRender();
setInterval(fetchAndRender, REFRESH_INTERVAL_MS);
