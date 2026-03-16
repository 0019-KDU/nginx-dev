const BACKENDS = {
  1: 'http://localhost:3001',
  2: 'http://localhost:3002',
};

const hits = { 1: 0, 2: 0 };
let logCount = 0;
let rrTurn   = 1;

// ── Response display ──────────────────────────────
function showResponse(label, text, statusClass, statusText) {
  document.getElementById('resp-label').textContent   = label;
  const body = document.getElementById('response-body');
  body.textContent = text;
  body.classList.remove('flash');
  void body.offsetWidth; // reflow to restart animation
  body.classList.add('flash');

  const s = document.getElementById('resp-status');
  s.textContent = statusText;
  s.className   = `resp-status ${statusClass}`;
}

// ── Highlight active server card ──────────────────
function highlightCard(server) {
  document.getElementById('sc1').classList.remove('active-b1', 'active-b2');
  document.getElementById('sc2').classList.remove('active-b1', 'active-b2');
  document.getElementById(`sc${server}`).classList.add(`active-b${server}`);
  setTimeout(() => {
    document.getElementById(`sc${server}`).classList.remove(`active-b${server}`);
  }, 1200);
}

// ── Update round-robin indicator ──────────────────
function updateRRIndicator() {
  const next = rrTurn === 1 ? 2 : 1;
  document.getElementById('rr-indicator').innerHTML =
    `Next → <strong>B${next}</strong>`;
}

// ── Log ───────────────────────────────────────────
function addLog(server, message) {
  const body  = document.getElementById('log-body');
  const empty = body.querySelector('.log-empty');
  if (empty) empty.remove();

  logCount++;
  const row = document.createElement('div');
  row.className = 'log-row';
  row.innerHTML = `
    <span class="log-n">#${logCount}</span>
    <span class="log-srv b${server}">Backend ${server}</span>
    <span class="log-msg">${message}</span>
    <span class="log-time">${new Date().toLocaleTimeString()}</span>
  `;
  body.insertBefore(row, body.firstChild);
  while (body.children.length > 50) body.removeChild(body.lastChild);
}

function clearLog() {
  document.getElementById('log-body').innerHTML =
    '<div class="log-empty">No requests yet.</div>';
  logCount = 0;
}

// ── Update server stat cards ──────────────────────
function updateStats(server, data) {
  document.getElementById(`s${server}-status`).textContent =
    data ? '🟢 Online' : '🔴 Offline';
  document.getElementById(`s${server}-uptime`).textContent =
    data?.uptime ?? '—';
}

function incHits(server) {
  hits[server]++;
  document.getElementById(`s${server}-hits`).textContent = hits[server];
}

// ── Ping individual backend ───────────────────────
async function callDirect(server) {
  const base = BACKENDS[server];
  try {
    const res  = await fetch(`${base}/api/info`);
    const data = await res.json();
    updateStats(server, data);
    showResponse(
      `GET /api/info → Backend ${server}`,
      JSON.stringify(data, null, 2),
      `b${server}`, `Backend ${server}`
    );
    addLog(server, `Ping OK — uptime: ${data.uptime}`);
    incHits(server);
    highlightCard(server);
  } catch {
    updateStats(server, null);
    showResponse(
      `GET /api/info → Backend ${server}`,
      `Error: Backend ${server} is not reachable.`,
      'error', 'Error'
    );
    addLog(server, 'Ping FAILED');
  }
}

// ── Round-robin balanced call ─────────────────────
async function callBalanced() {
  const server  = rrTurn;
  const base    = BACKENDS[server];
  const btnEl   = document.querySelector('.btn-primary');

  btnEl.classList.add('loading');
  btnEl.querySelector('#btn-icon').textContent = '⏳';

  try {
    const start = Date.now();
    const res   = await fetch(`${base}/api/`);
    const ms    = Date.now() - start;
    const text  = await res.text();

    showResponse(
      `GET /api/  →  Backend ${server}  (${ms}ms)`,
      text,
      `b${server}`, `Backend ${server}`
    );
    addLog(server, `${text}  [${ms}ms]`);
    incHits(server);
    highlightCard(server);
  } catch {
    showResponse(
      `GET /api/  →  Backend ${server}`,
      `Error: Backend ${server} is not reachable.`,
      'error', 'Error'
    );
    addLog(server, 'Request FAILED');
  } finally {
    btnEl.classList.remove('loading');
    btnEl.querySelector('#btn-icon').textContent = '⚡';
    rrTurn = rrTurn === 1 ? 2 : 1;
    updateRRIndicator();
  }
}

// ── Update header pills ───────────────────────────
async function checkPills() {
  for (const s of [1, 2]) {
    const pill = document.getElementById(`b${s}-pill`);
    try {
      await fetch(`${BACKENDS[s]}/api/info`);
      pill.className = 'pill online';
      pill.innerHTML = `<span class="dot"></span> Backend ${s}`;
    } catch {
      pill.className = 'pill offline';
      pill.innerHTML = `<span class="dot"></span> Backend ${s}`;
    }
  }
}

// ── Init ──────────────────────────────────────────
checkPills();
updateRRIndicator();
