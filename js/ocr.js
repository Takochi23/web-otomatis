// ─── OCR scanning with Tesseract.js ──────────────────────────────────────────
async function scanReceipt(file) {
  const statusEl = document.getElementById('ocr-status');
  const progressWrap = document.getElementById('ocr-progress-wrap');
  const progressBar = document.getElementById('ocr-progress-bar');
  const resultEl = document.getElementById('ocr-result');
  const rawEl = document.getElementById('ocr-raw-text');

  statusEl.textContent = 'Memulai proses OCR...';
  statusEl.className = 'text-sm text-purple-600 font-medium mt-3';
  progressWrap.classList.remove('hidden');
  progressBar.style.width = '0%';
  resultEl.classList.add('hidden');

  try {
    const { data: { text } } = await Tesseract.recognize(file, 'eng+ind', {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(m.progress * 100);
          progressBar.style.width = `${pct}%`;
          statusEl.textContent = `Membaca teks: ${pct}%`;
        } else if (m.status === 'loading language traineddata') {
          statusEl.textContent = 'Memuat model bahasa...';
        }
      },
    });

    const parsed = parseReceiptText(text);

    // Show result panel
    rawEl.textContent = text || '(tidak ada teks terdeteksi)';
    document.getElementById('ocr-detected-title').textContent =
      parsed.title || '(tidak terdeteksi)';
    document.getElementById('ocr-detected-amount').textContent = parsed.amount
      ? formatRupiah(parsed.amount)
      : '(tidak terdeteksi)';

    resultEl.classList.remove('hidden');
    statusEl.textContent = '✅ Selesai! Periksa hasil di bawah.';

    return parsed;
  } catch (err) {
    statusEl.textContent = '❌ Gagal memproses: ' + err.message;
    statusEl.className = 'text-sm text-red-500 font-medium mt-3';
    throw err;
  } finally {
    progressWrap.classList.add('hidden');
  }
}

// ─── Receipt text parser ──────────────────────────────────────────────────────
function parseReceiptText(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1);

  let amount = null;
  let title = null;

  // Try to extract the highest "total" amount
  const amountPatterns = [
    /(?:total|jumlah|grand\s*total|tagihan|bayar|tunai|cash)[^\d]*([\d.,]+)/i,
    /rp\.?\s*([\d.,]+)/i,
    /idr\s*([\d.,]+)/i,
  ];

  let candidates = [];
  for (const line of lines) {
    for (const pattern of amountPatterns) {
      const match = line.match(pattern);
      if (match) {
        const raw = match[1].replace(/\./g, '').replace(',', '.');
        const num = parseFloat(raw);
        if (!isNaN(num) && num >= 100) candidates.push(num);
      }
    }
  }

  // Prefer the largest amount that contains "total" keyword
  if (candidates.length > 0) {
    amount = Math.max(...candidates);
  } else {
    // Fallback: look for standalone large numbers
    const numPattern = /\b([\d]{4,})\b/g;
    let m;
    while ((m = numPattern.exec(text)) !== null) {
      const n = parseInt(m[1]);
      if (n >= 1000) candidates.push(n);
    }
    if (candidates.length > 0) amount = Math.max(...candidates);
  }

  // Extract title: first meaningful multi-letter line
  for (const line of lines) {
    if (
      line.length >= 3 &&
      /[a-zA-Z]/.test(line) &&
      !/^\d+$/.test(line)
    ) {
      title = line.length > 50 ? line.substring(0, 50) : line;
      break;
    }
  }

  return { title: title || '', amount: amount || null };
}

// ─── Drag & drop setup ────────────────────────────────────────────────────────
function setupDropZone() {
  const zone = document.getElementById('drop-zone');
  const input = document.getElementById('receipt-input');
  const preview = document.getElementById('receipt-preview');
  const scanBtn = document.getElementById('scan-btn');
  let currentFile = null;

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('border-purple-500', 'bg-purple-50');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('border-purple-500', 'bg-purple-50');
  });

  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('border-purple-500', 'bg-purple-50');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadPreview(file);
    } else {
      showToast('Upload file gambar (jpg/png)', 'error');
    }
  });

  input.addEventListener('change', () => {
    if (input.files[0]) loadPreview(input.files[0]);
  });

  function loadPreview(file) {
    currentFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
      document.getElementById('preview-wrap').classList.remove('hidden');
      scanBtn.classList.remove('hidden');
      document.getElementById('ocr-result').classList.add('hidden');
      document.getElementById('ocr-status').textContent = '';
    };
    reader.readAsDataURL(file);
  }

  scanBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    scanBtn.disabled = true;
    scanBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>Memproses...';

    try {
      const parsed = await scanReceipt(currentFile);
      if (parsed.amount || parsed.title) {
        // Show use button
        document.getElementById('use-result-btn').classList.remove('hidden');
        document.getElementById('use-result-btn').onclick = () => {
          fillFormFromOCR(parsed);
        };
      }
    } catch (_) {
      /* already handled */
    } finally {
      scanBtn.disabled = false;
      scanBtn.innerHTML =
        '<i class="fas fa-magic mr-2"></i>Scan Struk';
    }
  });
}
