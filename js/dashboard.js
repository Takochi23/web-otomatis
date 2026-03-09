// ─── State ────────────────────────────────────────────────────────────────────
let allTransactions = [];
let editingId = null;

const CATEGORIES = [
  'Makanan & Minuman',
  'Transportasi',
  'Belanja',
  'Hiburan',
  'Kesehatan',
  'Tagihan & Utilitas',
  'Pendapatan',
  'Investasi',
  'Lainnya',
];

const CAT_ICONS = {
  'Makanan & Minuman': 'fa-utensils',
  Transportasi: 'fa-car',
  Belanja: 'fa-shopping-bag',
  Hiburan: 'fa-gamepad',
  Kesehatan: 'fa-heart-pulse',
  'Tagihan & Utilitas': 'fa-bolt',
  Pendapatan: 'fa-money-bill-wave',
  Investasi: 'fa-chart-line',
  Lainnya: 'fa-circle-dot',
};

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── API calls ────────────────────────────────────────────────────────────────
async function fetchTransactions() {
  const user = getUser();
  const res = await fetch(`${MOCKAPI_BASE_URL}/transactions`);
  if (!res.ok) throw new Error('Gagal mengambil data transaksi');
  let data = await res.json();
  const filterId = String(user.id).trim();
  
  const filtered = data.filter(t => {
    // Check if the authentic userId is piggybacked on the title string
    if (t.title && t.title.includes('|||')) {
      const parts = t.title.split('|||');
      if (parts[0] === filterId) return true;
      return false;
    }

    // Fallback for legacy data 
    let dbId = String(t.userId || t.userid).trim();
    dbId = dbId.replace(/^(userid|user id|userId|user)\s+/i, '');
    return dbId === filterId;
  });

  // Clean the title for UI presentation
  filtered.forEach(t => {
    if (t.title && t.title.includes('|||')) {
      t.title = t.title.split('|||')[1];
    }
  });
  
  allTransactions = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  return allTransactions;
}

async function addTransaction(tx) {
  const user = getUser();
  // MockAPI drops custom fields and overrides userId. We piggyback the user ID onto the title string.
  const encodedTitle = `${user.id}|||${tx.title}`;
  const res = await fetch(`${MOCKAPI_BASE_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...tx, title: encodedTitle }),
  });
  if (!res.ok) throw new Error('Gagal menambah transaksi');
  return res.json();
}

async function updateTransaction(id, tx) {
  const user = getUser();
  const encodedTitle = `${user.id}|||${tx.title}`;
  const res = await fetch(`${MOCKAPI_BASE_URL}/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...tx, title: encodedTitle }),
  });
  if (!res.ok) throw new Error('Gagal mengupdate transaksi');
  return res.json();
}

async function deleteTransaction(id) {
  const res = await fetch(`${MOCKAPI_BASE_URL}/transactions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Gagal menghapus transaksi');
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const msg = document.getElementById('toast-msg');
  toast.className = `fixed bottom-6 right-6 z-[999] px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2.5 transition-all duration-500 ${
    type === 'success'
      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
      : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
  }`;
  msg.textContent = message;
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
  }, 3000);
}

function populateCategories() {
  ['tx-category', 'edit-category'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = CATEGORIES.map(
      c => `<option value="${c}">${c}</option>`
    ).join('');
  });
}

function updateSummaryCards(transactions) {
  const income = transactions
    .filter(t => t.type === 'in')
    .reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions
    .filter(t => t.type === 'out')
    .reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  document.getElementById('total-balance').textContent = formatRupiah(balance);
  document.getElementById('total-income').textContent = formatRupiah(income);
  document.getElementById('total-expense').textContent = formatRupiah(expense);
  document.getElementById('tx-count').textContent = `${transactions.length} Transaksi`;

  // Color balance
  const balEl = document.getElementById('total-balance');
  balEl.className = `text-3xl font-black mt-1 ${balance < 0 ? 'text-red-200' : 'text-white'}`;
}

function renderHistory(transactions) {
  const tbody = document.getElementById('history-tbody');
  const empty = document.getElementById('history-empty');
  const loading = document.getElementById('history-loading');

  loading.classList.add('hidden');

  if (transactions.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = transactions
    .map(
      tx => `
    <tr class="border-b border-gray-50 hover:bg-purple-50/30 transition-colors group" id="row-${tx.id}">
      <td class="py-4 px-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            tx.type === 'in'
              ? 'bg-green-50 text-green-500'
              : 'bg-red-50 text-red-500'
          }">
            <i class="fas ${CAT_ICONS[tx.category] || 'fa-circle-dot'} text-sm"></i>
          </div>
          <div>
            <p class="font-semibold text-gray-800 text-sm">${tx.title}</p>
            <p class="text-xs text-gray-400 mt-0.5">${tx.category || 'Lainnya'} · ${formatDate(tx.date)}</p>
          </div>
        </div>
      </td>
      <td class="py-4 px-5">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
          tx.type === 'in'
            ? 'bg-green-50 text-green-600'
            : 'bg-red-50 text-red-600'
        }">
          <i class="fas ${tx.type === 'in' ? 'fa-arrow-up' : 'fa-arrow-down'} text-[10px]"></i>
          ${tx.type === 'in' ? 'Pemasukan' : 'Pengeluaran'}
        </span>
      </td>
      <td class="py-4 px-5 font-bold ${tx.type === 'in' ? 'text-green-600' : 'text-red-500'} text-sm whitespace-nowrap">
        ${tx.type === 'in' ? '+' : '-'}${formatRupiah(tx.amount)}
      </td>
      <td class="py-4 px-5">
        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onclick="openEditModal('${tx.id}')" title="Edit"
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
            <i class="fas fa-pencil text-xs"></i>
          </button>
          <button onclick="confirmDelete('${tx.id}')" title="Hapus"
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
            <i class="fas fa-trash text-xs"></i>
          </button>
        </div>
      </td>
    </tr>`
    )
    .join('');
}

// ─── Refresh ──────────────────────────────────────────────────────────────────
async function refreshAll() {
  try {
    document.getElementById('history-loading').classList.remove('hidden');
    document.getElementById('history-empty').classList.add('hidden');
    document.getElementById('history-tbody').innerHTML = '';
    await fetchTransactions();
    updateSummaryCards(allTransactions);
    renderHistory(allTransactions);
    if (!document.getElementById('sec-analytics').classList.contains('hidden')) {
      renderCharts(allTransactions);
    }
  } catch (e) {
    showToast('Gagal memuat data: ' + e.message, 'error');
    document.getElementById('history-loading').classList.add('hidden');
  }
}

// ─── Add transaction ──────────────────────────────────────────────────────────
async function handleAddTransaction(e) {
  e.preventDefault();
  const title = document.getElementById('tx-title').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const type = document.getElementById('tx-type').value;
  const category = document.getElementById('tx-category').value;
  const date = document.getElementById('tx-date').value;

  if (!title || !amount || !date) {
    showToast('Lengkapi semua field!', 'error');
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.innerHTML =
    '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';

  try {
    await addTransaction({ title, amount, type, category, date });
    document.getElementById('tx-form').reset();
    document.getElementById('tx-date').value = new Date()
      .toISOString()
      .split('T')[0];
    await refreshAll();
    showToast('Transaksi berhasil ditambahkan! ✅', 'success');
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML =
      '<i class="fas fa-plus mr-2"></i>Simpan Transaksi';
  }
}

// ─── Edit modal ───────────────────────────────────────────────────────────────
function openEditModal(id) {
  const tx = allTransactions.find(t => t.id === id);
  if (!tx) return;
  editingId = id;
  document.getElementById('edit-title').value = tx.title;
  document.getElementById('edit-amount').value = tx.amount;
  document.getElementById('edit-type').value = tx.type;
  document.getElementById('edit-category').value = tx.category || 'Lainnya';
  document.getElementById('edit-date').value = tx.date;
  document.getElementById('modal-edit').classList.remove('hidden');
  document.getElementById('modal-edit').classList.add('flex');
}

function closeEditModal() {
  editingId = null;
  document.getElementById('modal-edit').classList.add('hidden');
  document.getElementById('modal-edit').classList.remove('flex');
}

async function handleEditTransaction(e) {
  e.preventDefault();
  if (!editingId) return;
  const title = document.getElementById('edit-title').value.trim();
  const amount = parseFloat(document.getElementById('edit-amount').value);
  const type = document.getElementById('edit-type').value;
  const category = document.getElementById('edit-category').value;
  const date = document.getElementById('edit-date').value;

  const btn = document.getElementById('edit-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';

  try {
    await updateTransaction(editingId, { title, amount, type, category, date });
    closeEditModal();
    await refreshAll();
    showToast('Transaksi berhasil diperbarui! ✅', 'success');
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Simpan Perubahan';
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function confirmDelete(id) {
  const tx = allTransactions.find(t => t.id === id);
  if (!tx) return;
  if (!confirm(`Hapus transaksi "${tx.title}"?`)) return;
  try {
    await deleteTransaction(id);
    await refreshAll();
    showToast('Transaksi dihapus! 🗑️', 'success');
  } catch (e) {
    showToast('Gagal menghapus: ' + e.message, 'error');
  }
}

// ─── Auto-fill from OCR ───────────────────────────────────────────────────────
function fillFormFromOCR(data) {
  if (data.title) document.getElementById('tx-title').value = data.title;
  if (data.amount) document.getElementById('tx-amount').value = data.amount;
  document.getElementById('tx-type').value = 'out';
  document.getElementById('tx-date').value = new Date()
    .toISOString()
    .split('T')[0];
  showSection('dashboard');
  setTimeout(() => {
    const form = document.getElementById('tx-form-card');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    form.classList.add('ring-2', 'ring-purple-400', 'ring-offset-2');
    setTimeout(
      () => form.classList.remove('ring-2', 'ring-purple-400', 'ring-offset-2'),
      2500
    );
  }, 400);
  showToast('Form berhasil diisi dari struk! 📝', 'success');
}

// ─── Section navigation ───────────────────────────────────────────────────────
function showSection(name) {
  const sections = ['dashboard', 'analytics', 'scanner'];
  sections.forEach(s => {
    const el = document.getElementById(`sec-${s}`);
    el.classList.toggle('hidden', s !== name);
  });

  // Update active nav
  document.querySelectorAll('[data-nav]').forEach(btn => {
    const active = btn.dataset.nav === name;
    btn.classList.toggle('bg-white/20', active);
    btn.classList.toggle('text-white', active);
    btn.classList.toggle('text-purple-200', !active);
  });

  if (name === 'analytics') {
    setTimeout(() => renderCharts(allTransactions), 100);
  }
}
