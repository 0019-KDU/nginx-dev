// Direct backend URLs for dev (without Nginx)
// With Nginx, both would go through :80 and be load-balanced automatically
const BACKENDS = {
  1: 'http://localhost:3001',
  2: 'http://localhost:3002',
};

const hits = { 1: 0, 2: 0 };
let logCount = 0;

// ── Utility ───────────────────────────────────────
function setResp(route, text, ok) {
  document.getElementById('resp-route').textContent = route;
  document.getElementById('resp-body').textContent  = text;
  const badge = document.getElementById('resp-badge');
  badge.textContent = ok ? '200 OK' : 'Error';
  badge.className   = ok ? 'resp-badge ok' : 'resp-badge error';
}

function addLog(server, message) {
  const list = document.getElementById('log-list');
  const empty = list.querySelector('.log-empty');
  if (empty) empty.remove();

  logCount++;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-num">#${logCount}</span>
    <span class="log-srv b${server}">Backend ${server}</span>
    <span class="log-msg">${message}</span>
    <span class="log-time">${new Date().toLocaleTimeString()}</span>
  `;
  list.insertBefore(entry, list.firstChild);

  // Keep log to last 50 entries
  while (list.children.length > 50) list.removeChild(list.lastChild);
}

function clearLog() {
  document.getElementById('log-list').innerHTML = '<div class="log-empty">No requests yet — hit a button above.</div>';
  logCount = 0;
}

function updateHits(server) {
  hits[server]++;
  document.getElementById(`s${server}-hits`).textContent = hits[server];
}

// ── Ping a server for status ──────────────────────
async function pingServer(server) {
  const base = BACKENDS[server];
  try {
    const res  = await fetch(`${base}/api/info`);
    const data = await res.json();

    document.getElementById(`s${server}-status`).textContent = '🟢 Online';
    document.getElementById(`s${server}-uptime`).textContent = data.uptime ?? '—';
    document.getElementById(`s${server}-mem`).textContent    = data.memory ?? '—';

    setResp(`GET ${base}/api/info`, JSON.stringify(data, null, 2), true);
    addLog(server, `Ping OK — uptime: ${data.uptime}`);
    updateHits(server);
  } catch {
    document.getElementById(`s${server}-status`).textContent = '🔴 Offline';
    setResp(`GET ${base}/api/info`, `Error: Backend ${server} is not reachable.`, false);
    addLog(server, 'Ping FAILED — server unreachable');
  }
}

// ── Call /api/ on a specific backend ─────────────
async function callApi(server) {
  const base = BACKENDS[server];
  try {
    const start = Date.now();
    const res   = await fetch(`${base}/api/`);
    const ms    = Date.now() - start;
    const text  = await res.text();

    setResp(`GET ${base}/api/  (${ms}ms)`, text, true);
    addLog(server, `${text}  [${ms}ms]`);
    updateHits(server);
  } catch {
    setResp(`GET ${base}/api/`, `Error: Backend ${server} is not reachable.`, false);
    addLog(server, 'Request FAILED — server unreachable');
  }
}

// ── Simulate round-robin: alternate calls ─────────
let rrTurn = 1;
async function callBoth() {
  await callApi(rrTurn);
  rrTurn = rrTurn === 1 ? 2 : 1;
}

// ── Auto-ping both servers on load ────────────────
(async () => {
  await Promise.allSettled([pingServer(1), pingServer(2)]);
})();
