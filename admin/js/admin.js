/* KOH HOUSE Admin — Admin JavaScript (to be built) */

'use strict';

// ─── CONFIG ───────────────────────────────────────────
const ADMIN_CONFIG = {
  githubOwner: 'GITHUB_OWNER',
  githubRepo: 'GITHUB_REPO',
  functionsBase: '/.netlify/functions',
  tokenKey: 'koh_token'
};

// ─── AUTH ─────────────────────────────────────────────
function getToken() {
  return sessionStorage.getItem(ADMIN_CONFIG.tokenKey);
}

function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/admin/index.html';
    return false;
  }
  try {
    const parts = token.split('.');
    if (parts.length < 2) throw new Error('Invalid token');
    const payload = JSON.parse(atob(parts[0]));
    if (payload.exp < Date.now()) {
      sessionStorage.removeItem(ADMIN_CONFIG.tokenKey);
      window.location.href = '/admin/index.html';
      return false;
    }
    return true;
  } catch (e) {
    sessionStorage.removeItem(ADMIN_CONFIG.tokenKey);
    window.location.href = '/admin/index.html';
    return false;
  }
}

function logout() {
  sessionStorage.removeItem(ADMIN_CONFIG.tokenKey);
  window.location.href = '/admin/index.html';
}

// ─── DATA ─────────────────────────────────────────────
// In-memory store for loaded data and SHAs
const store = {
  artworks: null, artworksSha: null,
  artists: null, artistsSha: null,
  homepage: null, homepageSha: null,
  settings: null, settingsSha: null
};

async function fetchData(file) {
  const res = await fetch(
    `${ADMIN_CONFIG.functionsBase}/get-data?file=${file}`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    }
  );
  if (!res.ok) throw new Error(`Failed to fetch ${file}`);
  const result = await res.json();
  store[file] = result.data;
  store[`${file}Sha`] = result.sha;
  return result.data;
}

async function saveData(file, data) {
  showSavingIndicator();
  const res = await fetch(
    `${ADMIN_CONFIG.functionsBase}/save-data`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        file,
        data,
        sha: store[`${file}Sha`]
      })
    }
  );
  const result = await res.json();
  if (!res.ok) {
    hideSavingIndicator();
    if (res.status === 409) {
      showToast(
        'Conflict: please refresh and try again',
        'error'
      );
    } else {
      showToast(result.message || 'Save failed', 'error');
    }
    throw new Error(result.message || 'Save failed');
  }
  store[`${file}Sha`] = result.newSha;
  store[file] = data;
  hideSavingIndicator();
  showToast('Saved! Changes live in ~30 seconds', 'success');
  return result;
}

// ─── UI HELPERS ───────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function hideModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

let savingIndicator = null;
function showSavingIndicator() {
  const liveStatus = document.querySelector('.live-status');
  if (liveStatus) {
    liveStatus.innerHTML =
      '<span class="spinner"></span> Saving to GitHub...';
  }
}
function hideSavingIndicator() {
  const liveStatus = document.querySelector('.live-status');
  if (liveStatus) {
    liveStatus.innerHTML =
      '<span class="status-dot"></span> ' +
      'Changes go live within ~30 seconds';
  }
}

function timeAgo(dateString) {
  const seconds = Math.floor(
    (new Date() - new Date(dateString)) / 1000
  );
  if (seconds < 60) return 'just now';
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function formatPrice(n) {
  return '£' + Number(n).toLocaleString('en-GB');
}

function generateId() {
  return 'aw_' + Date.now() + '_' +
    Math.random().toString(36).substr(2, 5);
}

function generateArtistId() {
  return 'ar_' + Date.now() + '_' +
    Math.random().toString(36).substr(2, 5);
}

// Image preview helper
function setupImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const url = input.value.trim();
      if (url) {
        preview.src = url;
        preview.classList.remove('hidden');
        preview.onerror = () => preview.classList.add('hidden');
      } else {
        preview.classList.add('hidden');
      }
    }, 600);
  });
}

// Setup modal close buttons
function setupModalClose() {
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      hideModal(btn.dataset.modal);
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
      }
    });
  });
}

// Setup logout
function setupLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) btn.addEventListener('click', logout);
}
