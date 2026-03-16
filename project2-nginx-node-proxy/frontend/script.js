// Base URL — when served via Nginx proxy, /api/* is forwarded to Node.
// For direct testing without Nginx, swap to: http://localhost:3000
const API_BASE = '';

// ── Health check on load ──────────────────────────
async function checkStatus() {
  const pill = document.getElementById('status-pill');
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    if (res.ok) {
      pill.textContent = '';
      const dot = document.createElement('span');
      dot.className = 'dot';
      pill.appendChild(dot);
      pill.appendChild(document.createTextNode(' Online'));
      pill.className = 'status-pill online';
      return await res.json();
    }
  } catch {
    pill.textContent = '● Offline';
    pill.className = 'status-pill offline';
  }
  return null;
}

// ── Call any API endpoint ─────────────────────────
async function callApi(route) {
  const routeEl  = document.getElementById('response-route');
  const bodyEl   = document.getElementById('response-body');
  const badgeEl  = document.getElementById('response-badge');

  routeEl.textContent  = `GET ${route}`;
  bodyEl.textContent   = 'Loading…';
  badgeEl.className    = 'response-badge';

  try {
    const start = Date.now();
    const res   = await fetch(`${API_BASE}${route}`);
    const ms    = Date.now() - start;
    const data  = await res.json();

    bodyEl.textContent  = JSON.stringify(data, null, 2);
    badgeEl.textContent = `${res.status} · ${ms}ms`;
    badgeEl.className   = res.ok ? 'response-badge ok' : 'response-badge error';
  } catch (err) {
    bodyEl.textContent  = `Error: ${err.message}`;
    badgeEl.textContent = 'failed';
    badgeEl.className   = 'response-badge error';
  }
}

// ── Fetch and populate status cards ──────────────
async function fetchStatus() {
  const data = await checkStatus();
  if (!data) return;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set('sk-server', data.server  ?? '—');
  set('sk-uptime', data.uptime  ?? '—');
  set('sk-memory', data.memory  ?? '—');
  set('sk-ts',     data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '—');
}

// ── Init ──────────────────────────────────────────
fetchStatus();
