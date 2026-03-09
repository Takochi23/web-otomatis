// ─── Session helpers ───────────────────────────────────────────────────────────
function getUser() {
  const raw = localStorage.getItem('ft_user');
  return raw ? JSON.parse(raw) : null;
}

function saveUser(user) {
  localStorage.setItem('ft_user', JSON.stringify(user));
}

function requireAuth() {
  if (!getUser()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem('ft_user');
  window.location.href = 'index.html';
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
async function login(email, password) {
  const res = await fetch(
    `${MOCKAPI_BASE_URL}/users?email=${encodeURIComponent(email)}`
  );
  if (!res.ok) throw new Error('Gagal terhubung ke server');

  const users = await res.json();
  const user = users.find(
    u =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password === password
  );

  if (!user) throw new Error('Email atau password salah');
  saveUser(user);
  return user;
}

async function register(name, email, password) {
  // Check email uniqueness
  const checkRes = await fetch(
    `${MOCKAPI_BASE_URL}/users?email=${encodeURIComponent(email)}`
  );
  if (!checkRes.ok) throw new Error('Gagal terhubung ke server');

  const existing = await checkRes.json();
  if (existing.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email sudah terdaftar. Silakan login.');
  }

  const res = await fetch(`${MOCKAPI_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) throw new Error('Gagal membuat akun');
  const user = await res.json();
  saveUser(user);
  return user;
}
