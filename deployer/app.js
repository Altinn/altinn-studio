'use strict';

const RUNTIME_ENVS = ['at_ring1', 'at_ring2', 'tt_ring1', 'tt_ring2', 'prod_ring1', 'prod_ring2'];
const STUDIO_ENVS = ['dev', 'staging', 'prod'];
const REFRESH_INTERVAL_MS = 30_000;

// Environments without approval gates — no split cell needed
const UNGATED = new Set(['at_ring1', 'dev', 'staging']);

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

  link.appendChild(el('span', 'sha', data.sha));
  link.appendChild(el('span', 'title', data.title));
  link.appendChild(el('span', 'time', relativeTime(data.updatedAt)));

  container.appendChild(link);
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
        const nextStatus = next ? `half-${effectiveStatus(next)}` : 'half-none';
        cell.appendChild(renderDeployment(current, currentStatus));
        cell.appendChild(renderDeployment(next, nextStatus));
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
