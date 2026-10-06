let accessToken = null; // kept in memory only (never localStorage)
const $ = (id) => document.getElementById(id);

function show(title, status, data) {
  $('out').textContent = `${title}\nHTTP ${status}\n\n${JSON.stringify(data, null, 2)}`;
}

async function call(method, url, body, useAuth) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(url, {
    method,
    headers,
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined
  });
  let data = {};
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}

function setSession(data) {
  accessToken = data.accessToken || null;
  $('status').textContent = accessToken ? `Logged in as ${data.name || ''} (${data.role})` : 'Not logged in';
}

$('btn-login').onclick = async () => {
  const r = await call('POST', '/api/v1/auth/login', { email: $('email').value, password: $('password').value });
  if (r.status === 200) setSession(r.data);
  show('POST /auth/login', r.status, r.data);
};
$('btn-register').onclick = async () => {
  const r = await call('POST', '/api/v1/auth/register', { name: 'New User', email: $('email').value, password: $('password').value });
  show('POST /auth/register', r.status, r.data);
};
$('btn-refresh').onclick = async () => {
  const r = await call('POST', '/api/v1/auth/refresh');
  if (r.status === 200) setSession(r.data);
  show('POST /auth/refresh', r.status, r.data);
};
$('btn-profile').onclick = async () => {
  const r = await call('GET', '/api/v1/employee/profile', null, true);
  show('GET /employee/profile', r.status, r.data);
};
$('btn-payroll').onclick = async () => {
  const r = await call('POST', '/api/v1/payroll/approve', { month: 'October' }, true);
  show('POST /payroll/approve', r.status, r.data);
};
$('btn-users').onclick = async () => {
  const r = await call('GET', '/api/v1/users', null, true);
  show('GET /users', r.status, r.data);
};
$('btn-logout').onclick = async () => {
  const r = await call('POST', '/api/v1/auth/logout');
  setSession({});
  show('POST /auth/logout', r.status, r.data);
};

// After OAuth redirect: exchange the httpOnly cookie for an access token
const params = new URLSearchParams(location.search);
if (params.get('oauth') === 'success') {
  call('POST', '/api/v1/auth/refresh').then((r) => {
    if (r.status === 200) setSession(r.data);
    show('OAuth login -> /auth/refresh', r.status, r.data);
    history.replaceState({}, '', '/');
  });
} else if (params.get('error')) {
  show('OAuth error', 400, { error: params.get('error') });
}
