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

// ─── ARTWORKS PAGE ────────────────────────────────────
async function initArtworksPage() {
  await fetchData('artworks');
  await fetchData('artists');
  renderArtworksTable();
  setupArtworkFilters();
  setupArtworkModal();
  setupDeleteModal('artwork');

  // Check for ?action=add in URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'add') openAddArtworkModal();
}

function renderArtworksTable() {
  const tbody = document.getElementById('artworks-tbody');
  if (!tbody) return;

  const search = document.getElementById('artwork-search')
    ?.value?.toLowerCase() || '';
  const genre = document.getElementById('artwork-genre-filter')
    ?.value || '';
  const status = document.getElementById('artwork-status-filter')
    ?.value || '';

  let artworks = [...(store.artworks || [])];

  if (search) {
    artworks = artworks.filter(a =>
      a.title.toLowerCase().includes(search) ||
      a.artist.toLowerCase().includes(search)
    );
  }
  if (genre) {
    artworks = artworks.filter(a => a.genre === genre);
  }
  if (status !== '') {
    artworks = artworks.filter(
      a => String(a.available) === status
    );
  }

  if (artworks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;
          padding:40px;color:#718096">
          No artworks found
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = artworks.map(a => `
    <tr>
      <td>
        <img src="${a.imageUrl}" alt="${a.title}"
          onerror="this.src='https://picsum.photos/40/52'">
      </td>
      <td><strong>${a.title}</strong></td>
      <td>${a.artist}</td>
      <td>${a.genre}</td>
      <td>${formatPrice(a.price)}</td>
      <td>
        <span class="status-badge
          ${a.available ? 'available' : 'sold'}">
          ${a.available ? 'Available' : 'Sold'}
        </span>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-edit"
            onclick="openEditArtworkModal('${a.id}')">
            Edit
          </button>
          ${!a.available ? `
            <button class="btn-restore"
              onclick="markArtworkAvailable('${a.id}')">
              Restore
            </button>` : ''}
          <button class="btn-delete"
            onclick="openDeleteModal('${a.id}', 'artwork')">
            Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupArtworkFilters() {
  ['artwork-search', 'artwork-genre-filter',
   'artwork-status-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderArtworksTable);
  });
}

function openAddArtworkModal() {
  document.getElementById('artwork-modal-title')
    .textContent = 'Add New Artwork';
  document.getElementById('artwork-id').value = '';
  ['aw-title','aw-medium','aw-dimensions','aw-edition',
   'aw-price','aw-image','aw-description'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('aw-available').checked = true;
  document.getElementById('aw-image-preview')
    .classList.add('hidden');

  // Populate artist dropdown
  const select = document.getElementById('aw-artist');
  select.innerHTML = (store.artists || []).map(a =>
    `<option value="${a.name}">${a.name}</option>`
  ).join('');

  setupImagePreview('aw-image', 'aw-image-preview');
  showModal('artwork-modal');
}

function openEditArtworkModal(id) {
  const artwork = store.artworks.find(a => a.id === id);
  if (!artwork) return;

  document.getElementById('artwork-modal-title')
    .textContent = 'Edit Artwork';
  document.getElementById('artwork-id').value = artwork.id;
  document.getElementById('aw-title').value = artwork.title;
  document.getElementById('aw-medium').value =
    artwork.medium || '';
  document.getElementById('aw-dimensions').value =
    artwork.dimensions || '';
  document.getElementById('aw-edition').value =
    artwork.edition || '';
  document.getElementById('aw-price').value = artwork.price;
  document.getElementById('aw-image').value = artwork.imageUrl;
  document.getElementById('aw-description').value =
    artwork.description || '';
  document.getElementById('aw-available').checked =
    artwork.available;
  document.getElementById('aw-genre').value = artwork.genre;

  const preview = document.getElementById('aw-image-preview');
  preview.src = artwork.imageUrl;
  preview.classList.remove('hidden');

  const select = document.getElementById('aw-artist');
  select.innerHTML = (store.artists || []).map(a =>
    `<option value="${a.name}"
      ${a.name === artwork.artist ? 'selected' : ''}>
      ${a.name}
    </option>`
  ).join('');

  setupImagePreview('aw-image', 'aw-image-preview');
  showModal('artwork-modal');
}

async function saveArtwork() {
  const id = document.getElementById('artwork-id').value;
  const title = document.getElementById('aw-title').value.trim();
  const price = document.getElementById('aw-price').value;
  const image = document.getElementById('aw-image').value.trim();

  if (!title || !price || !image) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  const artworkData = {
    id: id || generateId(),
    title,
    artist: document.getElementById('aw-artist').value,
    genre: document.getElementById('aw-genre').value,
    medium: document.getElementById('aw-medium').value.trim(),
    dimensions: document.getElementById('aw-dimensions')
      .value.trim(),
    edition: document.getElementById('aw-edition').value.trim(),
    price: parseFloat(price),
    imageUrl: image,
    description: document.getElementById('aw-description')
      .value.trim(),
    available: document.getElementById('aw-available').checked,
    dateAdded: id ?
      store.artworks.find(a => a.id === id)?.dateAdded :
      new Date().toISOString()
  };

  let artworks = [...(store.artworks || [])];
  if (id) {
    const idx = artworks.findIndex(a => a.id === id);
    if (idx > -1) artworks[idx] = artworkData;
  } else {
    artworks.push(artworkData);
  }

  await saveData('artworks', artworks);
  hideModal('artwork-modal');
  renderArtworksTable();
}

async function markArtworkAvailable(id) {
  const artworks = [...(store.artworks || [])];
  const idx = artworks.findIndex(a => a.id === id);
  if (idx > -1) artworks[idx].available = true;
  await saveData('artworks', artworks);
  renderArtworksTable();
}

function setupArtworkModal() {
  const saveBtn = document.getElementById('save-artwork-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveArtwork);
  const addBtn = document.getElementById('add-artwork-btn');
  if (addBtn) addBtn.addEventListener('click', openAddArtworkModal);
}

function openDeleteModal(id, type) {
  document.getElementById('delete-target-id').value = id;
  document.getElementById('delete-confirm-input').value = '';
  document.getElementById('confirm-delete-btn').disabled = true;
  showModal('delete-modal');
}

function setupDeleteModal(type) {
  const input = document.getElementById('delete-confirm-input');
  const btn = document.getElementById('confirm-delete-btn');
  if (!input || !btn) return;

  input.addEventListener('input', () => {
    btn.disabled = input.value !== 'DELETE';
  });

  btn.addEventListener('click', async () => {
    const id = document.getElementById('delete-target-id').value;
    if (type === 'artwork') {
      let artworks = store.artworks.filter(a => a.id !== id);
      await saveData('artworks', artworks);
      hideModal('delete-modal');
      renderArtworksTable();
    } else if (type === 'artist') {
      let artists = store.artists.filter(a => a.id !== id);
      await saveData('artists', artists);
      hideModal('delete-modal');
      renderArtistsGrid();
    }
  });
}

// ─── ARTISTS PAGE ─────────────────────────────────────
async function initArtistsPage() {
  await fetchData('artists');
  renderArtistsGrid();
  setupArtistModal();
  setupDeleteModal('artist');

  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'add') openAddArtistModal();
}

function renderArtistsGrid() {
  const grid = document.getElementById('artists-grid');
  if (!grid) return;

  const artists = store.artists || [];
  if (artists.length === 0) {
    grid.innerHTML = `
      <div style="text-align:center;padding:60px;
        color:#718096;grid-column:1/-1">
        No artists yet. Add your first artist!
      </div>`;
    return;
  }

  grid.innerHTML = artists.map(a => `
    <div class="admin-artist-card">
      <img src="${a.profileImageUrl}" alt="${a.name}"
        onerror="this.src='https://picsum.photos/300/300'">
      <div class="admin-artist-info">
        <div class="admin-artist-name">${a.name}</div>
        <div class="admin-artist-speciality">
          ${a.speciality || ''}
        </div>
        <div class="admin-artist-actions">
          <button class="btn-edit"
            onclick="openEditArtistModal('${a.id}')">
            Edit
          </button>
          <button class="btn-delete"
            onclick="openDeleteModal('${a.id}', 'artist')">
            Delete
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function openAddArtistModal() {
  document.getElementById('artist-modal-title')
    .textContent = 'Add New Artist';
  document.getElementById('artist-id').value = '';
  ['ar-name','ar-nationality','ar-speciality',
   'ar-short-bio','ar-bio','ar-image'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('ar-image-preview')
    .classList.add('hidden');
  setupImagePreview('ar-image', 'ar-image-preview');
  showModal('artist-modal');
}

function openEditArtistModal(id) {
  const artist = store.artists.find(a => a.id === id);
  if (!artist) return;

  document.getElementById('artist-modal-title')
    .textContent = 'Edit Artist';
  document.getElementById('artist-id').value = artist.id;
  document.getElementById('ar-name').value = artist.name;
  document.getElementById('ar-nationality').value =
    artist.nationality || '';
  document.getElementById('ar-speciality').value =
    artist.speciality || '';
  document.getElementById('ar-short-bio').value =
    artist.shortBio || '';
  document.getElementById('ar-bio').value = artist.bio || '';
  document.getElementById('ar-image').value =
    artist.profileImageUrl || '';

  const preview = document.getElementById('ar-image-preview');
  preview.src = artist.profileImageUrl;
  preview.classList.remove('hidden');

  setupImagePreview('ar-image', 'ar-image-preview');
  showModal('artist-modal');
}

async function saveArtist() {
  const id = document.getElementById('artist-id').value;
  const name = document.getElementById('ar-name').value.trim();
  const image = document.getElementById('ar-image').value.trim();

  if (!name || !image) {
    showToast('Name and image URL are required', 'error');
    return;
  }

  const artistData = {
    id: id || generateArtistId(),
    name,
    nationality: document.getElementById('ar-nationality')
      .value.trim(),
    speciality: document.getElementById('ar-speciality')
      .value.trim(),
    shortBio: document.getElementById('ar-short-bio')
      .value.trim(),
    bio: document.getElementById('ar-bio').value.trim(),
    profileImageUrl: image,
    featured: true
  };

  let artists = [...(store.artists || [])];
  if (id) {
    const idx = artists.findIndex(a => a.id === id);
    if (idx > -1) artists[idx] = artistData;
  } else {
    artists.push(artistData);
  }

  await saveData('artists', artists);
  hideModal('artist-modal');
  renderArtistsGrid();
}

function setupArtistModal() {
  const saveBtn = document.getElementById('save-artist-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveArtist);
  const addBtn = document.getElementById('add-artist-btn');
  if (addBtn) addBtn.addEventListener('click', openAddArtistModal);
}

// ─── HOMEPAGE PAGE ────────────────────────────────────
async function initHomepagePage() {
  await fetchData('homepage');
  await fetchData('artworks');
  await fetchData('artists');

  populateHomepageForm();
  renderSlidesList();
  renderFeaturedCheckboxes();
  setupHomepageEvents();
  setupSlideModal();
  setupImagePreview('about-image', 'about-image-preview');
}

function populateHomepageForm() {
  const hp = store.homepage;
  if (!hp) return;
  document.getElementById('about-headline').value =
    hp.aboutHeadline || '';
  document.getElementById('about-text').value =
    hp.aboutText || '';
  document.getElementById('about-image').value =
    hp.aboutImage || '';
  document.getElementById('press-quote').value =
    hp.pressQuote || '';
  document.getElementById('press-source').value =
    hp.pressSource || '';

  const preview = document.getElementById('about-image-preview');
  if (hp.aboutImage && preview) {
    preview.src = hp.aboutImage;
    preview.classList.remove('hidden');
  }
}

function renderSlidesList() {
  const list = document.getElementById('slides-list');
  if (!list) return;
  const slides = store.homepage?.heroSlides || [];

  if (slides.length === 0) {
    list.innerHTML = `
      <p style="color:#718096;font-size:0.85rem;padding:16px 0">
        No slides yet. Add your first slide.
      </p>`;
    return;
  }

  list.innerHTML = slides.map((slide, i) => `
    <div class="slide-item" draggable="true"
      data-index="${i}">
      <span class="slide-drag-handle">⠿</span>
      <div class="slide-item-info">
        <div class="slide-item-headline">
          ${slide.headline || 'Untitled slide'}
        </div>
        <div class="slide-item-sub">
          ${slide.subheading || ''}
        </div>
      </div>
      <div class="table-actions">
        <button class="btn-edit"
          onclick="openEditSlide(${i})">Edit</button>
        <button class="btn-delete"
          onclick="deleteSlide(${i})">Delete</button>
      </div>
    </div>
  `).join('');

  initDragSort();
}

function initDragSort() {
  const items = document.querySelectorAll('.slide-item');
  let dragSrc = null;

  items.forEach(item => {
    item.addEventListener('dragstart', function() {
      dragSrc = this;
      this.classList.add('dragging');
    });
    item.addEventListener('dragend', function() {
      this.classList.remove('dragging');
    });
    item.addEventListener('dragover', e => e.preventDefault());
    item.addEventListener('drop', function() {
      if (dragSrc === this) return;
      const srcIndex = parseInt(dragSrc.dataset.index);
      const destIndex = parseInt(this.dataset.index);
      const slides = [...store.homepage.heroSlides];
      const [removed] = slides.splice(srcIndex, 1);
      slides.splice(destIndex, 0, removed);
      store.homepage.heroSlides = slides;
      renderSlidesList();
    });
  });
}

function renderFeaturedCheckboxes() {
  renderArtworkCheckboxes();
  renderArtistCheckboxes();
}

function renderArtworkCheckboxes() {
  const container = document.getElementById(
    'featured-artworks-list'
  );
  if (!container) return;
  const featured = store.homepage?.featuredArtworkIds || [];

  container.innerHTML = (store.artworks || []).map(a => `
    <div class="checkbox-item">
      <input type="checkbox" id="fa-${a.id}"
        value="${a.id}"
        ${featured.includes(a.id) ? 'checked' : ''}
        onchange="updateArtworkSelectionCount()">
      <label for="fa-${a.id}">${a.title} — ${a.artist}</label>
    </div>
  `).join('');

  updateArtworkSelectionCount();
}

function updateArtworkSelectionCount() {
  const checked = document.querySelectorAll(
    '#featured-artworks-list input:checked'
  ).length;
  const counter = document.getElementById(
    'artwork-selection-count'
  );
  if (counter) counter.textContent = `${checked}/6`;

  // Disable unchecked if at max
  document.querySelectorAll(
    '#featured-artworks-list input[type="checkbox"]'
  ).forEach(cb => {
    if (!cb.checked) cb.disabled = checked >= 6;
  });
}

function renderArtistCheckboxes() {
  const container = document.getElementById(
    'featured-artists-list'
  );
  if (!container) return;
  const featured = store.homepage?.featuredArtistIds || [];

  container.innerHTML = (store.artists || []).map(a => `
    <div class="checkbox-item">
      <input type="checkbox" id="fart-${a.id}"
        value="${a.id}"
        ${featured.includes(a.id) ? 'checked' : ''}
        onchange="updateArtistSelectionCount()">
      <label for="fart-${a.id}">${a.name}</label>
    </div>
  `).join('');

  updateArtistSelectionCount();
}

function updateArtistSelectionCount() {
  const checked = document.querySelectorAll(
    '#featured-artists-list input:checked'
  ).length;
  const counter = document.getElementById(
    'artist-selection-count'
  );
  if (counter) counter.textContent = `${checked}/6`;
  document.querySelectorAll(
    '#featured-artists-list input[type="checkbox"]'
  ).forEach(cb => {
    if (!cb.checked) cb.disabled = checked >= 6;
  });
}

function setupHomepageEvents() {
  const saveBtn = document.getElementById('save-homepage-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveHomepage);
}

async function saveHomepage() {
  const featuredArtworkIds = Array.from(
    document.querySelectorAll(
      '#featured-artworks-list input:checked'
    )
  ).map(cb => cb.value);

  const featuredArtistIds = Array.from(
    document.querySelectorAll(
      '#featured-artists-list input:checked'
    )
  ).map(cb => cb.value);

  const updated = {
    ...store.homepage,
    aboutHeadline: document.getElementById(
      'about-headline').value.trim(),
    aboutText: document.getElementById('about-text')
      .value.trim(),
    aboutImage: document.getElementById('about-image')
      .value.trim(),
    pressQuote: document.getElementById('press-quote')
      .value.trim(),
    pressSource: document.getElementById('press-source')
      .value.trim(),
    featuredArtworkIds,
    featuredArtistIds
  };

  await saveData('homepage', updated);
}

function openAddSlide() {
  document.getElementById('slide-modal-title')
    .textContent = 'Add Hero Slide';
  document.getElementById('slide-index').value = -1;
  ['sl-label','sl-headline','sl-subheading','sl-image',
   'sl-cta1-text','sl-cta1-link',
   'sl-cta2-text','sl-cta2-link'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('sl-image-preview')
    .classList.add('hidden');
  setupImagePreview('sl-image', 'sl-image-preview');
  showModal('slide-modal');
}

function openEditSlide(index) {
  const slide = store.homepage.heroSlides[index];
  if (!slide) return;
  document.getElementById('slide-modal-title')
    .textContent = 'Edit Slide';
  document.getElementById('slide-index').value = index;
  document.getElementById('sl-label').value =
    slide.label || '';
  document.getElementById('sl-headline').value =
    slide.headline || '';
  document.getElementById('sl-subheading').value =
    slide.subheading || '';
  document.getElementById('sl-image').value =
    slide.image || '';
  document.getElementById('sl-cta1-text').value =
    slide.cta1Text || '';
  document.getElementById('sl-cta1-link').value =
    slide.cta1Link || '';
  document.getElementById('sl-cta2-text').value =
    slide.cta2Text || '';
  document.getElementById('sl-cta2-link').value =
    slide.cta2Link || '';

  const preview = document.getElementById('sl-image-preview');
  if (slide.image) {
    preview.src = slide.image;
    preview.classList.remove('hidden');
  }
  setupImagePreview('sl-image', 'sl-image-preview');
  showModal('slide-modal');
}

function saveSlide() {
  const index = parseInt(
    document.getElementById('slide-index').value
  );
  const slideData = {
    label: document.getElementById('sl-label').value.trim(),
    headline: document.getElementById('sl-headline')
      .value.trim(),
    subheading: document.getElementById('sl-subheading')
      .value.trim(),
    image: document.getElementById('sl-image').value.trim(),
    cta1Text: document.getElementById('sl-cta1-text')
      .value.trim(),
    cta1Link: document.getElementById('sl-cta1-link')
      .value.trim(),
    cta2Text: document.getElementById('sl-cta2-text')
      .value.trim(),
    cta2Link: document.getElementById('sl-cta2-link')
      .value.trim()
  };

  if (!slideData.headline) {
    showToast('Headline is required', 'error');
    return;
  }

  if (!store.homepage.heroSlides)
    store.homepage.heroSlides = [];

  if (index === -1) {
    store.homepage.heroSlides.push(slideData);
  } else {
    store.homepage.heroSlides[index] = slideData;
  }

  hideModal('slide-modal');
  renderSlidesList();
}

function deleteSlide(index) {
  if (!confirm('Delete this slide?')) return;
  store.homepage.heroSlides.splice(index, 1);
  renderSlidesList();
}

function setupSlideModal() {
  const addBtn = document.getElementById('add-slide-btn');
  if (addBtn) addBtn.addEventListener('click', openAddSlide);
  const saveBtn = document.getElementById('save-slide-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveSlide);
}

// ─── SETTINGS PAGE ────────────────────────────────────
async function initSettingsPage() {
  await fetchData('settings');
  populateSettingsForm();
  setupSettingsEvents();
}

function populateSettingsForm() {
  const s = store.settings;
  if (!s) return;
  const fields = {
    'st-name': s.siteName,
    'st-tagline': s.tagline,
    'st-accent': s.accentColour || '#C9A84C',
    'st-primary': s.textColour || '#1a1a1a',
    'st-email': s.contactEmail,
    'st-phone': s.phone,
    'st-address': s.address,
    'st-instagram': s.instagramUrl,
    'st-facebook': s.facebookUrl
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  });
  updateColourPreviews();
}

function updateColourPreviews() {
  const accent = document.getElementById('st-accent');
  const primary = document.getElementById('st-primary');
  if (accent) {
    document.getElementById('st-accent-hex').textContent =
      accent.value;
    document.getElementById('st-accent-preview')
      .style.background = accent.value;
  }
  if (primary) {
    document.getElementById('st-primary-hex').textContent =
      primary.value;
    document.getElementById('st-primary-preview')
      .style.background = primary.value;
  }
}

async function saveSettings() {
  const updated = {
    ...store.settings,
    siteName: document.getElementById('st-name').value.trim(),
    tagline: document.getElementById('st-tagline').value.trim(),
    accentColour: document.getElementById('st-accent').value,
    textColour: document.getElementById('st-primary').value,
    contactEmail: document.getElementById('st-email').value.trim(),
    phone: document.getElementById('st-phone').value.trim(),
    address: document.getElementById('st-address').value.trim(),
    instagramUrl: document.getElementById('st-instagram')
      .value.trim(),
    facebookUrl: document.getElementById('st-facebook')
      .value.trim()
  };
  await saveData('settings', updated);
}

async function changePassword() {
  const current = document.getElementById('st-current-pw').value;
  const newPw = document.getElementById('st-new-pw').value;
  const confirm = document.getElementById('st-confirm-pw').value;

  if (!current || !newPw || !confirm) {
    showToast('Please fill in all password fields', 'error');
    return;
  }
  if (newPw !== confirm) {
    showToast('New passwords do not match', 'error');
    return;
  }
  if (newPw.length < 8) {
    showToast('Password must be at least 8 characters', 'error');
    return;
  }

  // Verify current password via auth function
  const verifyRes = await fetch(
    `${ADMIN_CONFIG.functionsBase}/auth`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: store.settings.adminEmail,
        password: current
      })
    }
  );
  if (!verifyRes.ok) {
    showToast('Current password is incorrect', 'error');
    return;
  }

  // Hash new password using SubtleCrypto
  const encoder = new TextEncoder();
  const data = encoder.encode(newPw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b =>
    b.toString(16).padStart(2, '0')
  ).join('');

  const updated = {
    ...store.settings,
    adminPasswordHash: hashHex
  };
  await saveData('settings', updated);
  ['st-current-pw','st-new-pw','st-confirm-pw'].forEach(id => {
    document.getElementById(id).value = '';
  });
  showToast('Password updated successfully', 'success');
}

function setupSettingsEvents() {
  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveSettings);
  const pwBtn = document.getElementById('change-password-btn');
  if (pwBtn) pwBtn.addEventListener('click', changePassword);

  ['st-accent','st-primary'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateColourPreviews);
  });
}

// ─── DASHBOARD PAGE ───────────────────────────────────
async function initDashboardPage() {
  await fetchData('artworks');
  await fetchData('artists');

  const artworks = store.artworks || [];
  const artists = store.artists || [];

  document.getElementById('stat-total').textContent =
    artworks.length;
  document.getElementById('stat-artists').textContent =
    artists.length;
  document.getElementById('stat-available').textContent =
    artworks.filter(a => a.available).length;
  document.getElementById('stat-sold').textContent =
    artworks.filter(a => !a.available).length;

  loadRecentCommits();
}

async function loadRecentCommits() {
  const list = document.getElementById('commits-list');
  if (!list) return;
  try {
    const res = await fetch(
      `https://api.github.com/repos/` +
      `${ADMIN_CONFIG.githubOwner}/` +
      `${ADMIN_CONFIG.githubRepo}/commits?per_page=5`
    );
    const commits = await res.json();
    if (!Array.isArray(commits)) throw new Error();
    list.innerHTML = commits.map(c => `
      <div class="commit-item">
        <span class="commit-message">
          ${c.commit.message}
        </span>
        <span class="commit-time">
          ${timeAgo(c.commit.author.date)}
        </span>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = `
      <p style="color:#718096;font-size:0.82rem;padding:12px 0">
        Unable to load recent activity.
        Configure GitHub env vars to enable this.
      </p>`;
  }
}

// ─── PAGE ROUTER ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  // Login page — no auth check needed
  if (path.includes('admin/index') ||
      path.endsWith('/admin/')) {
    // Login page JS is inline in admin/index.html
    return;
  }

  // All other admin pages need auth
  if (!checkAuth()) return;

  setupModalClose();
  setupLogout();

  if (path.includes('dashboard')) initDashboardPage();
  else if (path.includes('artworks')) initArtworksPage();
  else if (path.includes('artists') &&
           path.includes('admin')) initArtistsPage();
  else if (path.includes('homepage')) initHomepagePage();
  else if (path.includes('settings')) initSettingsPage();
});
