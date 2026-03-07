import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from config import settings
from database import init_db, close_db
from routers.auth_router import router as auth_router
from routers.admin_router import router as admin_router
from routers.transcribe_router import router as transcribe_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    await init_db()
    yield
    await close_db()


app = FastAPI(title="VRCFlow", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])
app.include_router(transcribe_router, tags=["transcribe"])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/admin", response_class=HTMLResponse)
async def admin_page() -> str:
    return ADMIN_HTML


ADMIN_HTML = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VRCFlow Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f0f1a;color:#e0e0e0;min-height:100vh}
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh}
.login-card{background:#1a1a2e;border-radius:8px;padding:32px;width:380px;max-width:95vw}
h1{font-size:20px;margin-bottom:20px;text-align:center}
label{font-size:13px;color:#aaa;display:block;margin-bottom:4px}
input,select{width:100%;padding:8px 12px;border-radius:4px;border:1px solid #333;background:#0f0f1a;color:#e0e0e0;font-size:14px;margin-bottom:12px}
button{padding:8px 16px;border-radius:4px;border:none;cursor:pointer;font-size:13px;font-weight:600;transition:opacity .15s}
button:hover{opacity:.85}
.btn-primary{background:#4a4a8a;color:#fff;width:100%}
.btn-sm{padding:5px 12px;border-radius:4px;font-size:12px}
.btn-green{background:#27ae60;color:#fff}
.btn-red{background:#c0392b;color:#fff}
.btn-blue{background:#2980b9;color:#fff}
.msg{text-align:center;margin:8px 0;font-size:13px}
.msg-err{color:#ff6b6b}
.msg-ok{color:#51cf66}

/* Dashboard layout */
.dashboard{max-width:1100px;margin:0 auto;padding:20px}
.dash-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.dash-header h1{margin:0;text-align:left}
.dash-header-right{display:flex;align-items:center;gap:12px}
.dash-header-right span{font-size:13px;color:#888}

/* Summary cards */
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px}
.stat-card{background:#1a1a2e;border-radius:8px;padding:16px}
.stat-card .label{font-size:12px;color:#888;margin-bottom:4px}
.stat-card .value{font-size:24px;font-weight:700}
.stat-card .sub{font-size:11px;color:#666;margin-top:2px}
.stat-card .bar-bg{height:6px;background:#333;border-radius:3px;margin-top:8px;overflow:hidden}
.stat-card .bar-fill{height:100%;border-radius:3px;transition:width .3s}

/* Tabs */
.tabs{display:flex;gap:0;margin-bottom:16px;border-bottom:1px solid #333}
.tab{padding:8px 20px;font-size:13px;font-weight:500;color:#888;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s}
.tab.active{color:#e0e0e0;border-bottom-color:#4a4a8a}

/* Panels */
.panel{display:none}
.panel.active{display:block}

/* Section */
.section{background:#1a1a2e;border-radius:8px;padding:16px;margin-bottom:16px}
.section h2{font-size:15px;margin-bottom:12px;color:#ccc}

/* Table */
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:8px 6px;text-align:left;border-bottom:1px solid #222}
th{color:#888;font-weight:500}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px}
.badge-active{background:#27ae60;color:#fff}
.badge-inactive{background:#666;color:#ddd}
.badge-admin{background:#8e44ad;color:#fff}

/* Usage bars */
.usage-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:13px}
.usage-name{width:100px;text-align:right;color:#aaa;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.usage-bar-bg{flex:1;height:18px;background:#222;border-radius:3px;overflow:hidden;position:relative}
.usage-bar-fill{height:100%;border-radius:3px;transition:width .3s}
.usage-val{width:70px;font-size:12px;color:#888;flex-shrink:0}

/* Chart */
.chart-container{position:relative;width:100%;overflow-x:auto}
.chart{display:flex;align-items:flex-end;gap:3px;height:160px;padding-top:20px}
.chart-col{display:flex;flex-direction:column;align-items:center;flex:1;min-width:20px}
.chart-bar{width:100%;min-width:14px;max-width:40px;border-radius:3px 3px 0 0;transition:height .3s;cursor:default;position:relative}
.chart-bar:hover::after{content:attr(data-tip);position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;white-space:nowrap;z-index:10}
.chart-label{font-size:10px;color:#666;margin-top:4px;white-space:nowrap}

/* Settings form */
.setting-row{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.setting-row label{flex:1;margin:0;font-size:13px;color:#aaa}
.setting-row input{width:140px;margin:0}
.setting-row button{flex-shrink:0}

#login-box,#admin-box{display:none}
</style>
</head>
<body>

<div id="login-box" class="login-wrap">
  <div class="login-card">
    <h1>VRCFlow Admin</h1>
    <label>Username</label>
    <input id="username" autocomplete="username">
    <label>Password</label>
    <input id="password" type="password" autocomplete="current-password">
    <div id="login-msg" class="msg"></div>
    <button class="btn-primary" onclick="doLogin()">Log in</button>
  </div>
</div>

<div id="admin-box" class="dashboard">
  <div class="dash-header">
    <h1>VRCFlow Admin</h1>
    <div class="dash-header-right">
      <span id="welcome"></span>
      <button class="btn-sm btn-red" onclick="doLogout()">Logout</button>
    </div>
  </div>
  <div id="admin-msg" class="msg"></div>

  <!-- Summary Cards -->
  <div class="cards">
    <div class="stat-card">
      <div class="label">Global Usage Today</div>
      <div class="value" id="card-global-used">-</div>
      <div class="sub" id="card-global-limit"></div>
      <div class="bar-bg"><div class="bar-fill" id="card-global-bar" style="width:0;background:#3498db"></div></div>
    </div>
    <div class="stat-card">
      <div class="label">Per-User Daily Limit</div>
      <div class="value" id="card-user-limit">-</div>
      <div class="sub">seconds per user per day</div>
    </div>
    <div class="stat-card">
      <div class="label">Max Audio Duration</div>
      <div class="value" id="card-max-audio">-</div>
      <div class="sub">seconds per upload</div>
    </div>
    <div class="stat-card">
      <div class="label">Active Users</div>
      <div class="value" id="card-active-users">-</div>
      <div class="sub" id="card-total-users"></div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <div class="tab active" onclick="switchTab('usage')">Usage</div>
    <div class="tab" onclick="switchTab('history')">History</div>
    <div class="tab" onclick="switchTab('users')">Users</div>
    <div class="tab" onclick="switchTab('settings')">Settings</div>
  </div>

  <!-- Usage Panel -->
  <div id="panel-usage" class="panel active">
    <div class="section">
      <h2>Per-User Usage Today</h2>
      <div id="usage-bars"></div>
      <div id="usage-empty" style="color:#666;font-size:13px;display:none">No usage today.</div>
    </div>
  </div>

  <!-- History Panel -->
  <div id="panel-history" class="panel">
    <div class="section">
      <h2>Daily Total Usage (Last 30 Days)</h2>
      <div class="chart-container"><div class="chart" id="history-chart"></div></div>
    </div>
    <div class="section">
      <h2>Per-User History</h2>
      <table>
        <thead><tr><th>Date</th><th>User</th><th>Seconds</th></tr></thead>
        <tbody id="history-tbody"></tbody>
      </table>
    </div>
  </div>

  <!-- Users Panel -->
  <div id="panel-users" class="panel">
    <div class="section">
      <table>
        <thead><tr><th>ID</th><th>Username</th><th>Status</th><th>Role</th><th>Today</th><th>Action</th></tr></thead>
        <tbody id="user-tbody"></tbody>
      </table>
    </div>
  </div>

  <!-- Settings Panel -->
  <div id="panel-settings" class="panel">
    <div class="section">
      <h2>Server Settings</h2>
      <div id="settings-form"></div>
      <div id="settings-msg" class="msg"></div>
    </div>
  </div>
</div>

<script>
let token = sessionStorage.getItem('admin_token');
const API = location.origin;
let statsCache = null;
let usersCache = null;

function show(id){ document.getElementById(id).style.display = id==='login-box'?'flex':'block'; }
function hide(id){ document.getElementById(id).style.display='none'; }

async function api(method, path, body) {
  const h = {'Content-Type':'application/json'};
  if (token) h['Authorization'] = 'Bearer '+token;
  const r = await fetch(API+path, {method, headers:h, body:body?JSON.stringify(body):undefined});
  if ((r.status===401||r.status===403) && path!=='/auth/login') { doLogout(); return null; }
  return r;
}

async function doLogin() {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const r = await api('POST','/auth/login',{username:u,password:p});
  if(!r) return;
  const d = await r.json();
  if (!r.ok) {
    document.getElementById('login-msg').className='msg msg-err';
    document.getElementById('login-msg').textContent = d?.detail?.code || 'Login failed';
    return;
  }
  token = d.access_token;
  sessionStorage.setItem('admin_token', token);
  showAdmin(u);
}

function doLogout() {
  token = null;
  sessionStorage.removeItem('admin_token');
  hide('admin-box');
  show('login-box');
  document.getElementById('login-msg').textContent='';
}

async function showAdmin(username) {
  hide('login-box');
  show('admin-box');
  document.getElementById('welcome').textContent = 'Logged in as ' + (username||'admin');
  await Promise.all([loadStats(), loadUsers(), loadHistory()]);
}

function fmtSec(s) {
  if (s >= 3600) return (s/3600).toFixed(1)+'h';
  if (s >= 60) return (s/60).toFixed(1)+'m';
  return s.toFixed(1)+'s';
}

// --- Stats & Usage ---
async function loadStats() {
  const r = await api('GET','/admin/stats');
  if(!r) return;
  statsCache = await r.json();
  const s = statsCache;

  document.getElementById('card-global-used').textContent = fmtSec(s.global_used);
  document.getElementById('card-global-limit').textContent = 'of '+fmtSec(s.max_global_daily_seconds)+' global limit';
  const pct = s.max_global_daily_seconds > 0 ? Math.min(100, s.global_used/s.max_global_daily_seconds*100) : 0;
  const bar = document.getElementById('card-global-bar');
  bar.style.width = pct+'%';
  bar.style.background = pct > 90 ? '#c0392b' : pct > 70 ? '#f39c12' : '#3498db';

  document.getElementById('card-user-limit').textContent = fmtSec(s.max_user_daily_seconds);
  document.getElementById('card-max-audio').textContent = s.max_audio_duration+'s';

  renderUsageBars(s);
}

function renderUsageBars(s) {
  const container = document.getElementById('usage-bars');
  const empty = document.getElementById('usage-empty');
  const active = s.users.filter(u => u.daily_seconds > 0);
  if (!active.length) { container.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';
  const max = s.max_user_daily_seconds;
  container.innerHTML = active.map(u => {
    const pct = max > 0 ? Math.min(100, u.daily_seconds/max*100) : 0;
    const color = pct > 90 ? '#c0392b' : pct > 70 ? '#f39c12' : '#27ae60';
    return `<div class="usage-row">
      <div class="usage-name">${esc(u.username)}</div>
      <div class="usage-bar-bg"><div class="usage-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="usage-val">${fmtSec(u.daily_seconds)}</div>
    </div>`;
  }).join('');
}

// --- Users ---
async function loadUsers() {
  const r = await api('GET','/admin/users');
  if(!r) return;
  usersCache = await r.json();
  const tbody = document.getElementById('user-tbody');
  tbody.innerHTML = '';
  let activeCount = 0;
  for (const u of usersCache) {
    if(u.is_active) activeCount++;
    const tr = document.createElement('tr');
    const statusBadge = u.is_active
      ? '<span class="badge badge-active">Active</span>'
      : '<span class="badge badge-inactive">Inactive</span>';
    const roleBadge = u.is_admin ? ' <span class="badge badge-admin">Admin</span>' : '';
    const toggleBtn = u.username === 'admin' ? '' :
      u.is_active
        ? `<button class="btn-sm btn-red" onclick="toggleActive(${u.id},false)">Deactivate</button>`
        : `<button class="btn-sm btn-green" onclick="toggleActive(${u.id},true)">Activate</button>`;
    const todayUsed = (u.last_reset_date === new Date().toISOString().slice(0,10)) ? fmtSec(u.daily_seconds) : '-';
    tr.innerHTML = `<td>${u.id}</td><td>${esc(u.username)}</td><td>${statusBadge}</td><td>${roleBadge||'-'}</td><td>${todayUsed}</td><td>${toggleBtn}</td>`;
    tbody.appendChild(tr);
  }
  document.getElementById('card-active-users').textContent = activeCount;
  document.getElementById('card-total-users').textContent = usersCache.length + ' total';
}

async function toggleActive(id, active) {
  const r = await api('PATCH','/admin/users/'+id, {is_active:active});
  if (r && r.ok) {
    await loadUsers();
    showMsg('admin-msg', active ? 'User activated' : 'User deactivated', true);
  }
}

// --- History ---
async function loadHistory() {
  const r = await api('GET','/admin/usage-history?days=30');
  if(!r) return;
  const data = await r.json();
  renderChart(data.daily_totals);
  renderHistoryTable(data.per_user);
}

function renderChart(totals) {
  const chart = document.getElementById('history-chart');
  if (!totals.length) { chart.innerHTML='<span style="color:#666;font-size:13px">No history data yet.</span>'; return; }
  const maxVal = Math.max(...totals.map(t=>t.total), 1);
  chart.innerHTML = totals.map(t => {
    const h = Math.max(2, t.total/maxVal*140);
    const pct = h/140*100;
    const color = pct > 90 ? '#c0392b' : pct > 70 ? '#f39c12' : '#3498db';
    const label = t.date.slice(5); // MM-DD
    return `<div class="chart-col">
      <div class="chart-bar" style="height:${h}px;background:${color}" data-tip="${t.date}: ${fmtSec(t.total)}"></div>
      <div class="chart-label">${label}</div>
    </div>`;
  }).join('');
}

function renderHistoryTable(perUser) {
  const tbody = document.getElementById('history-tbody');
  tbody.innerHTML = perUser.slice(0, 200).map(r =>
    `<tr><td>${r.date}</td><td>${esc(r.username)}</td><td>${fmtSec(r.seconds)}</td></tr>`
  ).join('');
}

// --- Settings ---
async function loadSettings() {
  const r = await api('GET','/admin/settings');
  if(!r) return;
  const settings = await r.json();
  const fields = [
    {key:'max_user_daily_seconds', label:'Per-User Daily Limit (seconds)', type:'number'},
    {key:'max_global_daily_seconds', label:'Global Daily Limit (seconds)', type:'number'},
    {key:'max_audio_duration', label:'Max Audio Duration (seconds)', type:'number'},
    {key:'auto_activate_users', label:'Auto-Activate New Users', type:'toggle'},
  ];
  const form = document.getElementById('settings-form');
  form.innerHTML = fields.map(f => {
    const val = settings[f.key] || '0';
    if (f.type === 'toggle') {
      const checked = val !== '0' ? 'checked' : '';
      return `<div class="setting-row">
        <label>${f.label}</label>
        <input type="hidden" id="set-${f.key}" value="${esc(val)}">
        <label style="flex:none;display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" ${checked} onchange="toggleSetting('${f.key}',this.checked)" style="width:auto;margin:0">
          <span style="font-size:12px;color:#888">${val !== '0' ? 'On' : 'Off'}</span>
        </label>
      </div>`;
    }
    return `<div class="setting-row">
      <label>${f.label}</label>
      <input id="set-${f.key}" value="${esc(val)}" type="number" step="1" min="0">
      <button class="btn-sm btn-blue" onclick="saveSetting('${f.key}')">Save</button>
    </div>`;
  }).join('');
}

async function toggleSetting(key, checked) {
  const val = checked ? '1' : '0';
  document.getElementById('set-'+key).value = val;
  await saveSetting(key);
}

async function saveSetting(key) {
  const val = document.getElementById('set-'+key).value;
  const r = await api('PUT','/admin/settings/'+key, {value: val});
  if(!r) return;
  if (r.ok) {
    showMsg('settings-msg', key + ' updated to ' + val, true);
    await loadStats();
  } else {
    const d = await r.json();
    showMsg('settings-msg', d?.detail?.code || 'Failed to save', false);
  }
}

// --- Tabs ---
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('panel-'+name).classList.add('active');
  if (name === 'settings') loadSettings();
  if (name === 'history') loadHistory();
  if (name === 'usage') loadStats();
  if (name === 'users') loadUsers();
}

function showMsg(id, text, ok) {
  const el = document.getElementById(id);
  el.className = 'msg ' + (ok ? 'msg-ok' : 'msg-err');
  el.textContent = text;
  setTimeout(()=>{ el.textContent=''; }, 3000);
}

function esc(s){ const d=document.createElement('div'); d.textContent=String(s); return d.innerHTML; }

// Auto-login if token exists
if (token) { showAdmin(); } else { show('login-box'); }
</script>
</body>
</html>
"""


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
    )
