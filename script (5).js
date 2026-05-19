/* =========================================================
   PassForge — Password generation, strength, history, UI
   ========================================================= */

/* ---------- Character sets ---------- */
const charSets = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers:   '0123456789',
  symbols:   '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

/* ---------- DOM ---------- */
const $ = (sel) => document.querySelector(sel);

const passwordText   = $('#passwordText');
const copyBtn        = $('#copyBtn');
const regenBtn       = $('#regenBtn');
const strengthBar    = $('#strengthBar');
const strengthLabel  = $('#strengthLabel');
const lengthSlider   = $('#lengthSlider');
const lengthValue    = $('#lengthValue');
const generateBtn    = $('#generateBtn');
const optionInputs   = document.querySelectorAll('.option-toggle input[type="checkbox"]');
const historyList    = $('#historyList');
const historyEmpty   = $('#historyEmpty');
const clearHistoryBtn= $('#clearHistoryBtn');
const toastEl        = $('#toast');

/* ---------- State ---------- */
let history = []; // { value, time }  newest first, max 5
const MAX_HISTORY = 5;

/* ---------- Secure Random Helpers ---------- */
function secureRandomInt(maxExclusive) {
  // Rejection-sampled crypto random int in [0, maxExclusive)
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xFFFFFFFF / maxExclusive) * maxExclusive;
  let x;
  do {
    window.crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % maxExclusive;
}

function pickRandom(str) {
  return str[secureRandomInt(str.length)];
}

function shuffle(arr) {
  // Fisher–Yates with crypto randomness
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------- Password Generation ---------- */
function getActiveSets() {
  const active = [];
  optionInputs.forEach((input) => {
    if (input.checked) active.push(input.dataset.opt);
  });
  return active;
}

function generatePassword() {
  const length = Number(lengthSlider.value);
  const active = getActiveSets();
  if (active.length === 0) return ''; // guarded elsewhere

  // Guarantee one char from each active set
  const required = active.map((k) => pickRandom(charSets[k]));

  // Fill remaining from combined pool
  const pool = active.map((k) => charSets[k]).join('');
  const remaining = Math.max(0, length - required.length);
  const fill = Array.from({ length: remaining }, () => pickRandom(pool));

  // Shuffle and join
  return shuffle([...required, ...fill]).join('').slice(0, length);
}

/* ---------- Strength ---------- */
function calculateStrength(pw) {
  if (!pw) return { level: 0, label: '—' };

  const len = pw.length;
  const hasUpper  = /[A-Z]/.test(pw);
  const hasLower  = /[a-z]/.test(pw);
  const hasNum    = /[0-9]/.test(pw);
  const hasSym    = /[^A-Za-z0-9]/.test(pw);
  const typesCount = [hasUpper, hasLower, hasNum, hasSym].filter(Boolean).length;

  if (len < 8) return { level: 1, label: 'Weak' };
  if (len <= 11 && typesCount >= 2) return { level: 2, label: 'Fair' };
  if (len <= 15 && hasUpper && hasNum) return { level: 3, label: 'Good' };
  if (len >= 16 && typesCount === 4) return { level: 4, label: 'Strong' };

  // Fallbacks
  if (len >= 12) return { level: 3, label: 'Good' };
  return { level: 2, label: 'Fair' };
}

function updateStrengthUI(pw) {
  const { level, label } = calculateStrength(pw);
  strengthBar.setAttribute('data-level', String(level));
  strengthLabel.setAttribute('data-level', String(level));
  strengthLabel.textContent = label;
}

/* ---------- UI Updates ---------- */
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
let scrambleTimer = null;

function scrambleReveal(finalPw, duration = 400) {
  if (scrambleTimer) {
    clearInterval(scrambleTimer);
    scrambleTimer = null;
  }
  const len = finalPw.length;
  const start = performance.now();
  const tickMs = 35;
  scrambleTimer = setInterval(() => {
    const elapsed = performance.now() - start;
    const progress = Math.min(1, elapsed / duration);
    // characters lock from left to right
    const lockedCount = Math.floor(progress * len);
    let out = '';
    for (let i = 0; i < len; i++) {
      out += i < lockedCount
        ? finalPw[i]
        : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }
    passwordText.textContent = out;
    if (progress >= 1) {
      clearInterval(scrambleTimer);
      scrambleTimer = null;
      passwordText.textContent = finalPw;
      passwordText.setAttribute('title', finalPw);
    }
  }, tickMs);
}

function setPassword(pw, { animate = true } = {}) {
  if (animate) {
    scrambleReveal(pw, 400);
  } else {
    if (scrambleTimer) { clearInterval(scrambleTimer); scrambleTimer = null; }
    passwordText.textContent = pw;
    passwordText.setAttribute('title', pw);
  }
  updateStrengthUI(pw);
}

function updateSliderFill() {
  const min = Number(lengthSlider.min);
  const max = Number(lengthSlider.max);
  const val = Number(lengthSlider.value);
  const pct = ((val - min) / (max - min)) * 100;
  lengthSlider.style.backgroundSize = `${pct}% 100%`;
  lengthValue.textContent = String(val);
}

/* ---------- Clipboard + Toast ---------- */
let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

async function copyToClipboard(text, btn) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
  }
  showToast('Password copied!');
  if (btn) flashCopySuccess(btn);
}

function flashCopySuccess(btn) {
  const icon = btn.querySelector('i');
  if (!icon) return;
  const prev = icon.getAttribute('data-lucide');
  btn.classList.add('success');
  icon.setAttribute('data-lucide', 'check');
  window.lucide && window.lucide.createIcons();
  setTimeout(() => {
    btn.classList.remove('success');
    icon.setAttribute('data-lucide', prev || 'copy');
    window.lucide && window.lucide.createIcons();
  }, 2000);
}

/* ---------- History ---------- */
function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '';
    historyList.appendChild(historyEmpty);
    return;
  }
  historyList.innerHTML = '';
  history.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <span class="hist-pw" title="${escapeHtml(item.value)}">${escapeHtml(item.value)}</span>
      <span class="hist-time">${timeAgo(item.time)}</span>
      <button class="icon-btn hist-copy" aria-label="Copy this password" title="Copy">
        <i data-lucide="copy"></i>
      </button>
    `;
    li.querySelector('.hist-copy').addEventListener('click', (e) => {
      copyToClipboard(item.value, e.currentTarget);
    });
    historyList.appendChild(li);
  });
  window.lucide && window.lucide.createIcons();
}

function pushHistory(pw) {
  history.unshift({ value: pw, time: Date.now() });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  renderHistory();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ---------- Validation: at least one option ON ---------- */
function enforceAtLeastOne(targetInput) {
  const active = getActiveSets();
  if (active.length === 0) {
    // revert the toggle
    targetInput.checked = true;
    const label = targetInput.closest('.option-toggle');
    label.classList.remove('shake');
    void label.offsetWidth; // restart animation
    label.classList.add('shake');
    label.setAttribute('title', 'At least one type required');
    showToast('At least one type required');
    return false;
  }
  return true;
}

/* ---------- Event Wiring ---------- */
function regenerate({ pushHist = true, animate = true } = {}) {
  const pw = generatePassword();
  if (!pw) return;
  setPassword(pw, { animate });
  if (pushHist) pushHistory(pw);
}

generateBtn.addEventListener('click', () => regenerate());

copyBtn.addEventListener('click', () => {
  copyToClipboard(passwordText.textContent, copyBtn);
});

regenBtn.addEventListener('click', () => {
  regenBtn.classList.remove('spin');
  void regenBtn.offsetWidth;
  regenBtn.classList.add('spin');
  regenerate();
});

lengthSlider.addEventListener('input', () => {
  updateSliderFill();
  // Live re-evaluate strength of an updated password (also regenerate live)
  regenerate({ pushHist: false, animate: false });
});

optionInputs.forEach((input) => {
  input.addEventListener('change', () => {
    if (!enforceAtLeastOne(input)) return;
    regenerate({ pushHist: false, animate: true });
  });
});

clearHistoryBtn.addEventListener('click', () => {
  history = [];
  renderHistory();
});

/* Refresh timestamps periodically */
setInterval(() => {
  if (history.length > 0) renderHistory();
}, 30000);

/* ---------- Init ---------- */
function init() {
  updateSliderFill();
  regenerate({ pushHist: false, animate: false });
  renderHistory();
  // Initialize icons after first render
  window.addEventListener('load', () => {
    window.lucide && window.lucide.createIcons();
  });
}
init();
