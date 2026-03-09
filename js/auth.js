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

// ─── Helper: normalise user object ────────────────────────────────────────────
// MockAPI names the Object-ID field "userid" (not "id") in the user resource.
// We always expose it as .id so the rest of the app works uniformly.
function normalizeUser(user) {
  return { ...user, id: user.id || user.userid || user.userId };
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
async function login(email, password) {
  let res;
  try {
    res = await fetch(
      `${MOCKAPI_BASE_URL}/user?email=${encodeURIComponent(email)}`
    );
  } catch (_) {
    throw new Error('Tidak dapat terhubung ke internet. Periksa koneksi Anda.');
  }

  if (!res.ok)
    throw new Error(`Gagal terhubung ke server (HTTP ${res.status})`);

  const users = await res.json();

  // Filter client-side (MockAPI filter is case-sensitive)
  const user = users.find(
    u =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password === password
  );

  if (!user) throw new Error('Email atau password salah');

  const normalized = normalizeUser(user);
  saveUser(normalized);
  return normalized;
}

async function register(name, email, password) {
  // 1. Check email uniqueness
  let checkRes;
  try {
    checkRes = await fetch(
      `${MOCKAPI_BASE_URL}/user?email=${encodeURIComponent(email)}`
    );
  } catch (_) {
    throw new Error('Tidak dapat terhubung ke internet. Periksa koneksi Anda.');
  }

  if (!checkRes.ok)
    throw new Error(`Gagal terhubung ke server (HTTP ${checkRes.status})`);

  const existing = await checkRes.json();
  if (existing.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email sudah terdaftar. Silakan login.');
  }

  // 2. Create user
  let res;
  try {
    res = await fetch(`${MOCKAPI_BASE_URL}/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
  } catch (_) {
    throw new Error('Tidak dapat terhubung ke internet. Periksa koneksi Anda.');
  }

  if (!res.ok) throw new Error(`Gagal membuat akun (HTTP ${res.status})`);

  const user = await res.json();
  const normalized = normalizeUser(user);
  saveUser(normalized);
  return normalized;
}
