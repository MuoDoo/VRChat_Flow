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
body{font-family:system-ui,sans-serif;background:#1a1a2e;color:#e0e0e0;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:#222244;border-radius:8px;padding:32px;width:420px;max-width:95vw}
h1{font-size:20px;margin-bottom:20px;text-align:center}
label{font-size:13px;color:#aaa;display:block;margin-bottom:4px}
input{width:100%;padding:8px 12px;border-radius:4px;border:1px solid #444;background:#1a1a2e;color:#e0e0e0;font-size:14px;margin-bottom:12px}
button{padding:8px 16px;border-radius:4px;border:none;cursor:pointer;font-size:13px;font-weight:600}
.btn-primary{background:#4a4a8a;color:#fff;width:100%}
.btn-sm{padding:5px 12px;border-radius:4px;font-size:12px}
.btn-green{background:#27ae60;color:#fff}
.btn-red{background:#c0392b;color:#fff}
.btn-blue{background:#2980b9;color:#fff}
.msg{text-align:center;margin:8px 0;font-size:13px}
.msg-err{color:#ff6b6b}
.msg-ok{color:#51cf66}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
th,td{padding:8px 6px;text-align:left;border-bottom:1px solid #333}
th{color:#888;font-weight:500}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px}
.badge-active{background:#27ae60;color:#fff}
.badge-inactive{background:#666;color:#ddd}
.badge-admin{background:#8e44ad;color:#fff}
#login-box,#admin-box{display:none}
</style>
</head>
<body>
<div class="card">
<h1>VRCFlow Admin</h1>

<div id="login-box">
  <label>Username</label>
  <input id="username" autocomplete="username">
  <label>Password</label>
  <input id="password" type="password" autocomplete="current-password">
  <div id="login-msg" class="msg"></div>
  <button class="btn-primary" onclick="doLogin()">Log in</button>
</div>

<div id="admin-box">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span id="welcome" style="font-size:13px;color:#888"></span>
    <button class="btn-sm btn-red" onclick="doLogout()">Logout</button>
  </div>
  <div id="admin-msg" class="msg"></div>
  <table>
    <thead><tr><th>ID</th><th>Username</th><th>Status</th><th>Role</th><th>Action</th></tr></thead>
    <tbody id="user-tbody"></tbody>
  </table>
</div>
</div>

<script>
let token = sessionStorage.getItem('admin_token');
const API = location.origin;

function show(id){ document.getElementById(id).style.display='block'; }
function hide(id){ document.getElementById(id).style.display='none'; }

async function api(method, path, body) {
  const h = {'Content-Type':'application/json'};
  if (token) h['Authorization'] = 'Bearer '+token;
  const r = await fetch(API+path, {method, headers:h, body:body?JSON.stringify(body):undefined});
  return r;
}

async function doLogin() {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const r = await api('POST','/auth/login',{username:u,password:p});
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
  await loadUsers();
}

async function loadUsers() {
  const r = await api('GET','/admin/users');
  if (r.status === 401 || r.status === 403) { doLogout(); return; }
  const users = await r.json();
  const tbody = document.getElementById('user-tbody');
  tbody.innerHTML = '';
  for (const u of users) {
    const tr = document.createElement('tr');
    const statusBadge = u.is_active
      ? '<span class="badge badge-active">Active</span>'
      : '<span class="badge badge-inactive">Inactive</span>';
    const roleBadge = u.is_admin ? ' <span class="badge badge-admin">Admin</span>' : '';
    const toggleBtn = u.username === 'admin' ? '' :
      u.is_active
        ? `<button class="btn-sm btn-red" onclick="toggleActive(${u.id},false)">Deactivate</button>`
        : `<button class="btn-sm btn-green" onclick="toggleActive(${u.id},true)">Activate</button>`;
    tr.innerHTML = `<td>${u.id}</td><td>${esc(u.username)}</td><td>${statusBadge}</td><td>${roleBadge||'-'}</td><td>${toggleBtn}</td>`;
    tbody.appendChild(tr);
  }
}

async function toggleActive(id, active) {
  const r = await api('PATCH','/admin/users/'+id, {is_active:active});
  if (r.ok) {
    await loadUsers();
    document.getElementById('admin-msg').className='msg msg-ok';
    document.getElementById('admin-msg').textContent = active ? 'User activated' : 'User deactivated';
    setTimeout(()=>{ document.getElementById('admin-msg').textContent=''; }, 2000);
  }
}

function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

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
